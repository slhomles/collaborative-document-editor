import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

export type DocumentRole = Role | null

export async function getDocumentRole(documentId: string, userId: string): Promise<DocumentRole> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
    select: {
      ownerId: true,
      publicRole: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  })

  if (!document) return null
  if (document.ownerId === userId) return Role.OWNER

  const memberRole = document.members[0]?.role
  if (memberRole) return memberRole

  if (document.publicRole === 'VIEWER') return Role.VIEWER
  if (document.publicRole === 'EDITOR') return Role.EDITOR

  return null
}

export function canEditDocument(role: DocumentRole) {
  return role === Role.OWNER || role === Role.EDITOR
}
