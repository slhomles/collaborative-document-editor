import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

const prisma = new PrismaClient()

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  enableOfflineQueue: false,
})

redis.on('error', (err) => {
  console.warn('Redis connection error (non-fatal):', err.message)
})

const REDIS_TTL = 60 * 60 * 24 // 24 hours

function redisKey(documentId: string) {
  return `yjs:${documentId}`
}

export async function loadDocument(documentId: string): Promise<Buffer | null> {
  // 1. Try Redis cache first
  try {
    const cached = await redis.getBuffer(redisKey(documentId))
    if (cached) return cached
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
  options: { cacheOnly?: boolean } = {}
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

export async function createSnapshot(documentId: string, state: Buffer, label?: string) {
  await prisma.documentVersion.create({
    data: { documentId, yjsState: state, label: label ?? new Date().toISOString() },
  })
}

export async function listSnapshots(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, createdAt: true },
  })
}

export async function getSnapshot(snapshotId: string) {
  return prisma.documentVersion.findUnique({ where: { id: snapshotId } })
}
