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
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          { publicRole: { in: ['VIEWER', 'EDITOR'] } }
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    // Tính role hiện tại của user trong document để FE biết có được edit / restore không.
    const currentUserRole: Role =
      doc.ownerId === userId
        ? Role.OWNER
        : doc.members.find((m) => m.userId === userId)?.role ?? Role.VIEWER

    res.json({ ...doc, currentUserRole })
  } catch (err) {
    next(err)
  }
}

export async function updateDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.userId!
    const doc = await prisma.document.findFirst({
      where: { id, isDeleted: false },
    })
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const isOwner = doc.ownerId === userId
    const isEditor = await prisma.documentMember.findFirst({
      where: { documentId: id, userId, role: Role.EDITOR },
    })

    const { title, publicRole, editorsCanShare } = req.body

    // Authorization checks:
    // 1. Changing publicRole or editorsCanShare is OWNER-only
    if ((publicRole !== undefined || editorsCanShare !== undefined) && !isOwner) {
      return res.status(403).json({ message: 'Only the owner can change sharing configurations' })
    }

    // 2. Changing title is OWNER or EDITOR only
    if (title !== undefined && !isOwner && !isEditor) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const dataToUpdate: any = {}
    if (title !== undefined) dataToUpdate.title = title
    if (editorsCanShare !== undefined) dataToUpdate.editorsCanShare = editorsCanShare
    if (publicRole !== undefined) {
      if (!['RESTRICTED', 'VIEWER', 'EDITOR'].includes(publicRole)) {
        return res.status(400).json({ message: 'Invalid public role' })
      }
      dataToUpdate.publicRole = publicRole
    }

    const updated = await prisma.document.update({
      where: { id },
      data: dataToUpdate,
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

    const access = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] }
    const select = {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { name: true } },
    }

    // 1. Khớp tên — ưu tiên hiển thị trước.
    const byTitle = await prisma.document.findMany({
      where: { isDeleted: false, title: { contains: q, mode: 'insensitive' }, ...access },
      select,
      orderBy: { updatedAt: 'desc' },
    })

    // 2. Khớp nội dung — loại các doc đã khớp tên để không trùng.
    const titleIds = byTitle.map((d) => d.id)
    const byContent = await prisma.document.findMany({
      where: {
        isDeleted: false,
        id: { notIn: titleIds },
        contentPreview: { contains: q, mode: 'insensitive' },
        ...access,
      },
      select,
      orderBy: { updatedAt: 'desc' },
    })

    res.json([...byTitle, ...byContent])
  } catch (err) {
    next(err)
  }
}
