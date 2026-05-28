import { Response, NextFunction } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import * as Y from 'yjs'
import { AuthRequest } from '../middleware/auth.middleware'
import { loadDocument, createSnapshot, listSnapshots, getSnapshot } from '../collab/persistence'

const prisma = new PrismaClient()

export async function listVersions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!

    const doc = await prisma.document.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          { publicRole: { in: ['VIEWER', 'EDITOR'] } }
        ]
      },
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 50
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : undefined

    const rows = await listSnapshots(id, { limit, cursor })
    // listSnapshots take = limit + 1 để biết còn trang sau.
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? items[items.length - 1].id : null

    res.json({ items, nextCursor })
  } catch (err) {
    next(err)
  }
}

export async function createVersion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const { label } = req.body

    const doc = await prisma.document.findFirst({
      where: { id, isDeleted: false, OR: [{ ownerId: userId }, { members: { some: { userId, role: Role.EDITOR } } }] },
    })
    if (!doc) return res.status(403).json({ message: 'Forbidden' })

    let state = await loadDocument(id)
    if (!state) {
      const emptyDoc = new Y.Doc()
      state = Buffer.from(Y.encodeStateAsUpdate(emptyDoc))
    }

    // Bản lưu thủ công: isAuto=false → không bị prune.
    const version = await createSnapshot(id, userId, state, label, false)
    res.status(201).json(version)
  } catch (err) {
    next(err)
  }
}

export async function getVersion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id, versionId } = req.params
    const userId = req.userId!

    const doc = await prisma.document.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          { publicRole: { in: ['VIEWER', 'EDITOR'] } }
        ]
      },
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const version = await getSnapshot(versionId)
    if (!version || version.documentId !== id) return res.status(404).json({ message: 'Version not found' })

    res.json({
      ...version,
      yjsSnapshot: version.yjsSnapshot ? Buffer.from(version.yjsSnapshot).toString('base64') : null,
    })
  } catch (err) {
    next(err)
  }
}
