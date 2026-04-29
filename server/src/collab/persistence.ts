import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

const prisma = new PrismaClient()

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true, //not connect immediately
  enableOfflineQueue: false,// turn off the queue if loss internet, if not it can lead stuck
})

redis.on('error', (err) => { //.on() catch error when some error throw
  console.warn('Redis connection error (non-fatal):', err.message)
})

const REDIS_TTL = 60 * 60 * 24 // 24 hours
const AUTO_SNAPSHOT_DEBOUNCE_MS = 30 * 1000 // 30s
const CACHE_THROTTLE_MS = 300 // gộp các keystroke trong 300ms thành 1 lệnh ghi Redis
const snapshotTimers = new Map<string, ReturnType<typeof setTimeout>>()
const cacheTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingCacheState = new Map<string, Buffer>()

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

  try {
    await redis.del(redisKey(documentId))
  } catch {
    // Redis unavailable — chấp nhận, key sẽ tự expire sau TTL.
  }
}

export async function createSnapshot(
  documentId: string,
  createdBy: string,
  state: Buffer,
  label?: string
) {
  return prisma.documentVersion.create({
    data: { documentId, createdBy, yjsSnapshot: state, label: label ?? new Date().toISOString() },
    select: { id: true, documentId: true, createdBy: true, label: true, versionNumber: true, createdAt: true },
  })
}

export async function listSnapshots(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true, label: true, versionNumber: true, createdBy: true, createdAt: true },
  })
}

export async function getSnapshot(snapshotId: string) {
  return prisma.documentVersion.findUnique({ where: { id: snapshotId } })
}

export function scheduleAutoSnapshot(documentId: string, userId: string, state: Buffer) {
  const existing = snapshotTimers.get(documentId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(async () => {
    snapshotTimers.delete(documentId)
    try {
      await prisma.documentVersion.create({
        data: { documentId, createdBy: userId, yjsSnapshot: state, label: new Date().toISOString() },
      })
    } catch (err) {
      console.warn('Auto-snapshot failed:', (err as Error).message)
    }
  }, AUTO_SNAPSHOT_DEBOUNCE_MS)

  snapshotTimers.set(documentId, timer)
}
