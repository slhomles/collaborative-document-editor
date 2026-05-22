import { useState, useEffect } from 'react'
import { documentApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

export type DocRole = 'OWNER' | 'EDITOR' | 'VIEWER' | null

export interface Member {
  id: string
  userId: string
  role: 'EDITOR' | 'VIEWER'
  user: { id: string; name: string; email: string }
}

interface DocDetail {
  id: string
  title: string
  ownerId: string
  owner: { id: string; name: string }
  members: Member[]
}

export function useDocumentRole(documentId: string) {
  const currentUser = useAuthStore((s) => s.user)
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [role, setRole] = useState<DocRole>(null)
  const [loading, setLoading] = useState(true)

  const fetchDoc = async () => {
    try {
      const res = await documentApi.get(documentId)
      const data = res.data as unknown as DocDetail
      setDoc(data)

      if (!currentUser) { setRole(null); return }

      if (data.ownerId === currentUser.id) {
        setRole('OWNER')
      } else {
        const membership = data.members.find((m) => m.userId === currentUser.id)
        setRole(membership ? membership.role : null)
      }
    } catch (err) {
      console.error('Failed to fetch document', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoc()
  }, [documentId])

  const canEdit = role === 'OWNER' || role === 'EDITOR'
  const isOwner = role === 'OWNER'

  return { doc, role, loading, canEdit, isOwner, refreshDoc: fetchDoc }
}
