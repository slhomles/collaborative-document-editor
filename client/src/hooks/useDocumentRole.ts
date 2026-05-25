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

export interface DocDetail {
  id: string
  title: string
  ownerId: string
  publicRole: 'RESTRICTED' | 'VIEWER' | 'EDITOR'
  editorsCanShare: boolean
  owner: { id: string; name: string; email?: string }
  members: Member[]
  isStarred?: boolean
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
        if (membership) {
          setRole(membership.role)
        } else if (data.publicRole && data.publicRole !== 'RESTRICTED') {
          setRole(data.publicRole)
        } else {
          setRole(null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch document', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoc()
    // Poll every 5 seconds to dynamically reflect permissions changes
    const interval = setInterval(fetchDoc, 5000)
    return () => clearInterval(interval)
  }, [documentId])

  const canEdit = role === 'OWNER' || role === 'EDITOR'
  const isOwner = role === 'OWNER'

  return { doc, setDoc, role, loading, canEdit, isOwner, refreshDoc: fetchDoc }
}
