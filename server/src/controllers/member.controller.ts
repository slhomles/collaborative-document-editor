import { Response, NextFunction } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'
import { getDocumentRole } from '../utils/documentAccess'

const prisma = new PrismaClient()
const SHAREABLE_ROLES = new Set<Role>([Role.EDITOR, Role.VIEWER])

export async function addMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const { email, role } = req.body

    if (!SHAREABLE_ROLES.has(role)) {
      return res.status(400).json({ message: 'Role must be EDITOR or VIEWER' })
    }

    const doc = await prisma.document.findFirst({
      where: { id, isDeleted: false },
      select: { ownerId: true }
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const requesterRole = await getDocumentRole(id, userId)
    const isOwner = requesterRole === Role.OWNER

    if (!isOwner) {
      return res.status(403).json({ message: 'Only the owner can add or modify members' })
    }

    const targetUser = await prisma.user.findUnique({ where: { email } })
    if (!targetUser) return res.status(404).json({ message: 'User not found' })
    if (targetUser.id === userId) {
      return res.status(400).json({ message: 'Owner cannot be added as a member' })
    }

    const member = await prisma.documentMember.upsert({
      where: { documentId_userId: { documentId: id, userId: targetUser.id } },
      create: { documentId: id, userId: targetUser.id, role },
      update: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
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

    const requesterRole = await getDocumentRole(id, userId)
    if (requesterRole !== Role.OWNER) {
      return res.status(403).json({ message: 'Only the owner can remove members' })
    }

    const result = await prisma.documentMember.deleteMany({
      where: { documentId: id, userId: targetUserId },
    })
    if (result.count === 0) return res.status(404).json({ message: 'Member not found' })

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
