import { Response, NextFunction } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'
import { invalidateDocumentCache } from '../collab/persistence'
const prisma = new PrismaClient()

export async function listDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const docs = await prisma.document.findMany({
      where: {
        isDeleted: false,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true, title: true, createdAt: true, updatedAt: true, owner: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(docs)
  } catch (err) {
    next(err)
  }
}

export async function createDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { title } = req.body
    const doc = await prisma.document.create({
      data: { title: title || 'Untitled', ownerId: userId },
    })
    res.status(201).json(doc)
  } catch (err) {
    next(err)
  }
}

export async function getDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const doc = await prisma.document.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    res.json(doc)
  } catch (err) {
    next(err)
  }
}

export async function updateDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const doc = await prisma.document.findFirst({
      where: { id, OR: [{ ownerId: userId }, { members: { some: { userId, role: Role.EDITOR } } }] },
    })
    if (!doc) return res.status(403).json({ message: 'Forbidden' })

    const updated = await prisma.document.update({
      where: { id },
      data: { title: req.body.title },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const doc = await prisma.document.findFirst({ where: { id, ownerId: userId } })
    if (!doc) return res.status(403).json({ message: 'Only owner can delete' })

    await prisma.document.update({ where: { id }, data: { isDeleted: true } })
    await invalidateDocumentCache(id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function searchDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const q = String(req.query.q || '').trim()
    if (!q) return res.json([])

    const docs = await prisma.document.findMany({
      where: {
        isDeleted: false,
        contentPreview: { contains: q, mode: 'insensitive' },
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true, title: true, createdAt: true, updatedAt: true, owner: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(docs)
  } catch (err) {
    next(err)
  }
}
