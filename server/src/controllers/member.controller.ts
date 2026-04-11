import { Response, NextFunction } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import { AuthRequest } from '../middleware/auth.middleware'

const prisma = new PrismaClient()

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
