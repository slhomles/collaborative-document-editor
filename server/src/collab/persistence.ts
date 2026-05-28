import { PrismaClient, Role } from '@prisma/client'
import Redis from 'ioredis'
import { createHash } from 'crypto'
import * as Y from 'yjs'

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
// dù gõ liên tục. flushSnapshotOnStore chỉ tạo bản cuối phiên nếu đã gõ đủ lâu (>= MIN_FLUSH_INTERVAL_MS).
const AUTO_IDLE_MS = 5 * 60 * 1000 // chốt sau 5 phút ngừng gõ
const AUTO_MAX_WAIT_MS = 30 * 60 * 1000 // vẫn chốt sau tối đa 30 phút dù đang gõ liên tục
const MIN_FLUSH_INTERVAL_MS = 5 * 60 * 1000 // bỏ qua flush cuối phiên nếu thay đổi < 5 phút, tránh spam version vặt

const snapshotTimers = new Map<string, ReturnType<typeof setTimeout>>()
const cacheTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingCacheState = new Map<string, Buffer>()
const contentPreviewTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingContentPreview = new Map<string, string>()

// Trạng thái auto-snapshot theo document.
const dirtySince = new Map<string, number>() // mốc thay đổi đầu tiên kể từ snapshot cuối
const lastSnapshotHash = new Map<string, string>() // hash nội dung đã snapshot — chống tạo bản trùng
const lastEditorByDoc = new Map<string, string>() // userId người sửa gần nhất → createdBy cho auto-snapshot
const pendingSnapshotState = new Map<string, Buffer>() // state mới nhất chờ snapshot
const pendingDocByDoc = new Map<string, Y.Doc>() // Y.Doc tham chiếu để hash nội dung semantic (ổn định qua clientID/clock)

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
  pendingDocByDoc.delete(documentId)

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
// Luôn dùng hashContent để khớp định dạng với auto-snapshot — chống auto sinh bản trùng
// ngay sau khi user lưu thủ công. Nếu không có doc tham chiếu (REST controller), tự
// reconstruct Y.Doc từ state để hash.
export async function createSnapshot(
  documentId: string,
  createdBy: string,
  state: Buffer,
  label?: string,
  isAuto = false,
  doc?: Y.Doc,
) {
  const version = await prisma.documentVersion.create({
    data: { documentId, createdBy, yjsSnapshot: state, label: label ?? null, isAuto },
    select: { id: true, documentId: true, createdBy: true, label: true, isAuto: true, versionNumber: true, createdAt: true },
  })

  let hash: string
  if (doc) {
    hash = hashContent(doc)
  } else {
    const tmp = new Y.Doc()
    Y.applyUpdate(tmp, state)
    hash = hashContent(tmp)
    tmp.destroy()
  }
  lastSnapshotHash.set(documentId, hash)
  dirtySince.delete(documentId)
  return version
}

export async function listSnapshots(
  documentId: string,
  opts: { limit?: number; cursor?: string } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: 'desc' },
    take: limit + 1, // +1 để biết còn trang sau hay không (controller xử lý)
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
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

// Hash nội dung semantic (XML fragment 'default' Tiptap Collaboration dùng).
// Ổn định qua clientID/clock/merge metadata — chống tạo version trùng khi
// multi-tab/reconnect/IndexedDB sync sinh binary update khác nhau cho cùng 1 nội dung.
function hashContent(doc: Y.Doc): string {
  const xml = doc.getXmlFragment('default').toString()
  return createHash('sha1').update(xml).digest('hex')
}

// Gọi mỗi lần có thay đổi (từ onChange). Đặt lịch chốt theo idle + maxWait.
// `doc` được giữ tham chiếu để hash nội dung semantic (chống version trùng).
export function scheduleAutoSnapshot(documentId: string, userId: string, state: Buffer, doc: Y.Doc) {
  lastEditorByDoc.set(documentId, userId)
  pendingSnapshotState.set(documentId, state)
  pendingDocByDoc.set(documentId, doc)
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

// Thực sự tạo auto-snapshot nếu nội dung đã đổi so với bản chốt gần nhất (chống trùng).
async function maybeAutoSnapshot(documentId: string) {
  const timer = snapshotTimers.get(documentId)
  if (timer) clearTimeout(timer)
  snapshotTimers.delete(documentId)

  const state = pendingSnapshotState.get(documentId)
  const userId = lastEditorByDoc.get(documentId)
  const doc = pendingDocByDoc.get(documentId)
  if (!state || !userId || !doc || !dirtySince.has(documentId)) return

  const hash = hashContent(doc)
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

// Chốt bản cuối khi người dùng cuối rời tài liệu (gọi từ onStoreDocument), nhưng có điều kiện:
// chỉ tạo version nếu đã thay đổi >= MIN_FLUSH_INTERVAL_MS — tránh sinh version vặt khi user
// reload tab nhanh hoặc edit ngắn rồi đóng. Nội dung doc vẫn được lưu qua storeDocument bình thường.
export async function flushSnapshotOnStore(documentId: string) {
  if (!dirtySince.has(documentId)) return
  const dirtyFor = Date.now() - dirtySince.get(documentId)!
  if (dirtyFor < MIN_FLUSH_INTERVAL_MS) {
    dirtySince.delete(documentId) // bỏ qua flush, nhưng coi như đã sạch để khỏi trigger ngay khi mở lại
    return
  }
  await maybeAutoSnapshot(documentId)
}

// Giữ thưa dần các auto-version để danh sách gọn (kiểu Google Docs).
// <10p: giữ tất cả; 10p–1h: 1 bản mỗi 10 phút; 1h–24h: 1 bản mỗi giờ; >24h: 1 bản mỗi ngày.
// Không bao giờ đụng tới bản thủ công (isAuto=false).
async function pruneAutoVersions(documentId: string) {
  const autoVersions = await prisma.documentVersion.findMany({
    where: { documentId, isAuto: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
  })

  const now = Date.now()
  const TEN_MINUTES = 10 * 60 * 1000
  const ONE_HOUR = 60 * 60 * 1000
  const ONE_DAY = 24 * ONE_HOUR
  const keptBuckets = new Set<string>() // bucket đã có 1 bản được giữ
  const toDelete: string[] = []

  for (const v of autoVersions) {
    const age = now - v.createdAt.getTime()
    if (age < TEN_MINUTES) continue // giữ tất cả bản rất gần đây

    let bucket: string
    if (age < ONE_HOUR) {
      bucket = `m10:${Math.floor(v.createdAt.getTime() / TEN_MINUTES)}`
    } else if (age < ONE_DAY) {
      bucket = `h:${Math.floor(v.createdAt.getTime() / ONE_HOUR)}`
    } else {
      bucket = `d:${Math.floor(v.createdAt.getTime() / ONE_DAY)}`
    }

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
