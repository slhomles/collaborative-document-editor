import { PrismaClient, Role } from '@prisma/client'
import Redis from 'ioredis'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

export type DocumentRole = Role | null

// Trả role của user trong document: OWNER nếu sở hữu, EDITOR/VIEWER nếu là member, null nếu không có quyền.
export async function getDocumentRole(userId: string, documentId: string): Promise<DocumentRole> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true, isDeleted: true },
  })
  if (!doc || doc.isDeleted) return null
  if (doc.ownerId === userId) return Role.OWNER

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true, //not connect immediately
  enableOfflineQueue: false,// turn off the queue if loss internet, if not it can lead stuck
})

redis.on('error', (err) => { //.on() catch error when some error throw
  console.warn('Redis connection error (non-fatal):', err.message)
})

const REDIS_TTL = 60 * 60 * 24 // 24 hours
const CACHE_THROTTLE_MS = 300 // gộp các keystroke trong 300ms thành 1 lệnh ghi Redis
const CONTENT_PREVIEW_DEBOUNCE_MS = 8 * 1000 // ghi text preview tối đa mỗi 8s để search được nội dung
const CONTENT_PREVIEW_MAX_LEN = 2000

// Auto-version kiểu Google Docs: chốt checkpoint khi ngừng gõ (idle) HOẶC tối đa mỗi maxWait
// dù gõ liên tục, cộng thêm 1 bản chốt khi đóng doc (flushSnapshotOnStore).
const AUTO_IDLE_MS = 2 * 60 * 1000 // chốt sau 2 phút ngừng gõ
const AUTO_MAX_WAIT_MS = 10 * 60 * 1000 // vẫn chốt sau tối đa 10 phút dù đang gõ liên tục

const snapshotTimers = new Map<string, ReturnType<typeof setTimeout>>()
const cacheTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingCacheState = new Map<string, Buffer>()
const contentPreviewTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingContentPreview = new Map<string, string>()

// Trạng thái auto-snapshot theo document.
const dirtySince = new Map<string, number>() // mốc thay đổi đầu tiên kể từ snapshot cuối
const lastSnapshotHash = new Map<string, string>() // hash state đã snapshot — chống tạo bản trùng
const lastEditorByDoc = new Map<string, string>() // userId người sửa gần nhất → createdBy cho auto-snapshot
const pendingSnapshotState = new Map<string, Buffer>() // state mới nhất chờ snapshot

function redisKey(documentId: string) {
  return `yjs:${documentId}`//redis save everything in one place, not have table,so yjs: like virtual folder/collection
}

export async function loadDocument(documentId: string): Promise<Buffer | null> {//buffer is a binary type, it related yjs and speed
  // 1. Try Redis cache first
  try {
    const cached = await redis.getBuffer(redisKey(documentId))
    if (cached) {
      // Refresh TTL: document đang được mở liên tục không bị evict sau 24h kể từ lần ghi đầu.
      redis.expire(redisKey(documentId), REDIS_TTL).catch(() => { /* non-fatal */ })
      return cached
    }
  } catch {
    // Redis unavailable, fall through to DB
  }

  // 2. Fall back to PostgreSQL
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { yjsState: true },
  })
  return doc?.yjsState ? Buffer.from(doc.yjsState) : null
}

export async function storeDocument(
  documentId: string,
  state: Buffer,
  options: { cacheOnly?: boolean } = {}//if don't pass any parameters, empty object will be passed
) {
  // Always update Redis
  try {
    await redis.setex(redisKey(documentId), REDIS_TTL, state)
  } catch {
    // Redis unavailable
  }

  if (options.cacheOnly) return

  // Persist to PostgreSQL
  await prisma.document.update({
    where: { id: documentId },
    data: { yjsState: state },
  })
}

// Gộp nhiều keystroke trong CACHE_THROTTLE_MS thành 1 lần ghi Redis.
// Lần gọi cuối trong cửa sổ thực sự được flush — đảm bảo Redis luôn giữ state mới nhất.
export function throttledCacheUpdate(documentId: string, state: Buffer) {
  pendingCacheState.set(documentId, state)
  if (cacheTimers.has(documentId)) return

  const timer = setTimeout(async () => {
    cacheTimers.delete(documentId)
    const latest = pendingCacheState.get(documentId)
    pendingCacheState.delete(documentId)
    if (!latest) return
    try {
      await redis.setex(redisKey(documentId), REDIS_TTL, latest)
    } catch {
      // Redis unavailable — onStoreDocument sẽ ghi đầy đủ khi disconnect, không mất state.
    }
  }, CACHE_THROTTLE_MS)

  cacheTimers.set(documentId, timer)
}

// Ghi text preview thuần (để search theo nội dung). Non-fatal.
export async function updateContentPreview(documentId: string, text: string) {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { contentPreview: text.slice(0, CONTENT_PREVIEW_MAX_LEN) },
    })
  } catch {
    // Document có thể đã bị xóa — bỏ qua.
  }
}

// Debounce ghi contentPreview ~8s để không hammer Postgres mỗi keystroke.
export function scheduleContentPreviewUpdate(documentId: string, text: string) {
  pendingContentPreview.set(documentId, text)
  if (contentPreviewTimers.has(documentId)) return

  const timer = setTimeout(() => {
    contentPreviewTimers.delete(documentId)
    const latest = pendingContentPreview.get(documentId)
    pendingContentPreview.delete(documentId)
    if (latest !== undefined) void updateContentPreview(documentId, latest)
  }, CONTENT_PREVIEW_DEBOUNCE_MS)

  contentPreviewTimers.set(documentId, timer)
}

// Xóa cache + dọn timer khi document bị xóa, tránh state cũ tồn tại 24h.
export async function invalidateDocumentCache(documentId: string) {
  const cacheTimer = cacheTimers.get(documentId)
  if (cacheTimer) {
    clearTimeout(cacheTimer)
    cacheTimers.delete(documentId)
  }
  pendingCacheState.delete(documentId)

  const snapshotTimer = snapshotTimers.get(documentId)
  if (snapshotTimer) {
    clearTimeout(snapshotTimer)
    snapshotTimers.delete(documentId)
  }
  dirtySince.delete(documentId)
  lastSnapshotHash.delete(documentId)
  lastEditorByDoc.delete(documentId)
  pendingSnapshotState.delete(documentId)

  const cpTimer = contentPreviewTimers.get(documentId)
  if (cpTimer) {
    clearTimeout(cpTimer)
    contentPreviewTimers.delete(documentId)
  }
  pendingContentPreview.delete(documentId)

  try {
    await redis.del(redisKey(documentId))
  } catch {
    // Redis unavailable — chấp nhận, key sẽ tự expire sau TTL.
  }
}

// Tạo version. isAuto=false dùng cho bản lưu thủ công (đặt tên), không bị prune.
export async function createSnapshot(
  documentId: string,
  createdBy: string,
  state: Buffer,
  label?: string,
  isAuto = false
) {
  const version = await prisma.documentVersion.create({
    data: { documentId, createdBy, yjsSnapshot: state, label: label ?? null, isAuto },
    select: { id: true, documentId: true, createdBy: true, label: true, isAuto: true, versionNumber: true, createdAt: true },
  })
  // Đồng bộ hash để auto-snapshot không tạo lại bản trùng ngay sau khi user lưu thủ công.
  lastSnapshotHash.set(documentId, hashState(state))
  dirtySince.delete(documentId)
  return version
}

export async function listSnapshots(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      label: true,
      isAuto: true,
      versionNumber: true,
      createdBy: true,
      createdAt: true,
      creator: { select: { id: true, name: true } },
    },
  })
}

export async function getSnapshot(snapshotId: string) {
  return prisma.documentVersion.findUnique({ where: { id: snapshotId } })
}

function hashState(state: Buffer): string {
  return createHash('sha1').update(state).digest('hex')
}

// Gọi mỗi lần có thay đổi (từ onChange). Đặt lịch chốt theo idle + maxWait.
export function scheduleAutoSnapshot(documentId: string, userId: string, state: Buffer) {
  lastEditorByDoc.set(documentId, userId)
  pendingSnapshotState.set(documentId, state)
  if (!dirtySince.has(documentId)) dirtySince.set(documentId, Date.now())

  // maxWait: gõ liên tục quá lâu vẫn phải có checkpoint trung gian.
  const since = dirtySince.get(documentId)!
  if (Date.now() - since >= AUTO_MAX_WAIT_MS) {
    void maybeAutoSnapshot(documentId)
    return
  }

  // idle: chốt sau khi ngừng gõ AUTO_IDLE_MS.
  const existing = snapshotTimers.get(documentId)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => void maybeAutoSnapshot(documentId), AUTO_IDLE_MS)
  snapshotTimers.set(documentId, timer)
}

// Thực sự tạo auto-snapshot nếu state đã đổi so với bản chốt gần nhất (chống trùng).
async function maybeAutoSnapshot(documentId: string) {
  const timer = snapshotTimers.get(documentId)
  if (timer) clearTimeout(timer)
  snapshotTimers.delete(documentId)

  const state = pendingSnapshotState.get(documentId)
  const userId = lastEditorByDoc.get(documentId)
  if (!state || !userId || !dirtySince.has(documentId)) return

  const hash = hashState(state)
  if (hash === lastSnapshotHash.get(documentId)) {
    dirtySince.delete(documentId) // không có gì mới → coi như đã sạch
    return
  }

  try {
    await prisma.documentVersion.create({
      data: { documentId, createdBy: userId, yjsSnapshot: state, label: null, isAuto: true },
    })
    lastSnapshotHash.set(documentId, hash)
    dirtySince.delete(documentId)
    await pruneAutoVersions(documentId)
  } catch (err) {
    console.warn('Auto-snapshot failed:', (err as Error).message)
  }
}

// Chốt 1 bản cuối khi người dùng cuối rời tài liệu (gọi từ onStoreDocument).
export async function flushSnapshotOnStore(documentId: string) {
  if (dirtySince.has(documentId)) await maybeAutoSnapshot(documentId)
}

// Giữ thưa dần các auto-version để danh sách gọn (kiểu Google Docs).
// <1h: giữ tất cả; 1h–24h: giữ bản mới nhất mỗi giờ; >24h: giữ bản mới nhất mỗi ngày.
// Không bao giờ đụng tới bản thủ công (isAuto=false).
async function pruneAutoVersions(documentId: string) {
  const autoVersions = await prisma.documentVersion.findMany({
    where: { documentId, isAuto: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
  })

  const now = Date.now()
  const ONE_HOUR = 60 * 60 * 1000
  const ONE_DAY = 24 * ONE_HOUR
  const keptBuckets = new Set<string>() // bucket đã có 1 bản được giữ
  const toDelete: string[] = []

  for (const v of autoVersions) {
    const age = now - v.createdAt.getTime()
    if (age < ONE_HOUR) continue // giữ tất cả bản gần đây

    // bucket theo giờ (1h–24h) hoặc theo ngày (>24h)
    const bucket =
      age < ONE_DAY
        ? `h:${Math.floor(v.createdAt.getTime() / ONE_HOUR)}`
        : `d:${Math.floor(v.createdAt.getTime() / ONE_DAY)}`

    if (keptBuckets.has(bucket)) {
      toDelete.push(v.id) // bucket đã có bản mới nhất → xóa bản cũ hơn
    } else {
      keptBuckets.add(bucket) // bản đầu tiên gặp (mới nhất) trong bucket → giữ
    }
  }

  if (toDelete.length > 0) {
    await prisma.documentVersion.deleteMany({ where: { id: { in: toDelete } } })
  }
}
