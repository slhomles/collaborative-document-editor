import { Response, NextFunction } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'
import { loadDocument, createSnapshot, listSnapshots, getSnapshot } from '../collab/persistence'

const prisma = new PrismaClient()

export async function listVersions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!

    const doc = await prisma.document.findFirst({
      where: { id, isDeleted: false, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const versions = await listSnapshots(id)
    res.json(versions)
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

    const state = await loadDocument(id)
    if (!state) return res.status(400).json({ message: 'No document state to snapshot' })

    const version = await createSnapshot(id, userId, state, label)
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
      where: { id, isDeleted: false, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
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
