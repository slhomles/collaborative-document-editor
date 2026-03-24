import { Response, NextFunction } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'

const prisma = new PrismaClient()

export async function listDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const docs = await prisma.document.findMany({
      where: {
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

    await prisma.document.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function addMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const { email, role } = req.body

    const doc = await prisma.document.findFirst({ where: { id, ownerId: userId } })
    if (!doc) return res.status(403).json({ message: 'Only owner can manage members' })

    const targetUser = await prisma.user.findUnique({ where: { email } })
    if (!targetUser) return res.status(404).json({ message: 'User not found' })

    const member = await prisma.documentMember.upsert({
      where: { documentId_userId: { documentId: id, userId: targetUser.id } },
      create: { documentId: id, userId: targetUser.id, role: role || Role.VIEWER },
      update: { role: role || Role.VIEWER },
    })
    res.json(member)
  } catch (err) {
    next(err)
  }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id, userId: targetUserId } = req.params
    const userId = req.userId!

    const doc = await prisma.document.findFirst({ where: { id, ownerId: userId } })
    if (!doc) return res.status(403).json({ message: 'Only owner can manage members' })

    await prisma.documentMember.deleteMany({
      where: { documentId: id, userId: targetUserId },
    })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
