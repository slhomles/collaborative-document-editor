import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentApi } from '../services/api'
import { DocumentList } from '../components/DocumentList'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

interface Doc {
  id: string
  title: string
  updatedAt: string
  owner: { name: string }
}

export function DashboardPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    documentApi.list().then(({ data }) => {
      setDocs(data as unknown as Doc[])
      setLoading(false)
    })
  }, [])

  async function createDoc() {
    const { data } = await documentApi.create('Tài liệu mới')
    navigate(`/doc/${(data as any).id}`)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Tài liệu của {user?.name}</h1>
        <div>
          <button onClick={createDoc} style={{ marginRight: 8 }}>+ Tạo mới</button>
          <button onClick={signOut}>Đăng xuất</button>
        </div>
      </div>
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <DocumentList docs={docs} onOpen={(id) => navigate(`/doc/${id}`)} />
      )}
    </div>
  )
}
