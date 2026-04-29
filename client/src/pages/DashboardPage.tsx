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

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// Icon components
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="9" y="1" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="1" y="9" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="9" y="9" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="2.5" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="1" y="6.75" width="14" height="2.5" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="1" y="11.5" width="14" height="2.5" rx="1" fill={active ? '#d97757' : '#888'} />
    </svg>
  )
}

export function DashboardPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
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
    setCreating(true)
    setError(null)
    try {
      const { data } = await documentApi.create('Tài liệu mới')
      navigate(`/doc/${(data as any).id}`)
    } catch {
      setError('Không thể tạo tài liệu. Vui lòng thử lại.')
    } finally {
      setCreating(false)
    }
  }

  async function deleteDoc(id: string) {
    if (!window.confirm('Xóa tài liệu này?')) return
    setError(null)
    try {
      await documentApi.delete(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch {
      setError('Không thể xóa tài liệu. Vui lòng thử lại.')
    }
  }

  const sortedDocs = [...docs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const recentDocs = sortedDocs.slice(0, 4)
  const showRecent = !searchQuery && docs.length >= 5

  const filteredDocs = searchQuery
    ? docs.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedDocs

  const initials = user?.name ? getInitials(user.name) : '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8F8F6', color: '#1a1a1a' }}>

      {/* Header */}
      <header style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #E0E0DC',
        background: '#EFEFED',
        gap: 16,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 18, color: '#d97757', fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
          CollabEditor
        </span>
        <div style={{ flex: 1, maxWidth: 560 }}>
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#FFFFFF',
              border: '1px solid #E0E0DC',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#1a1a1a',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{user?.name}</span>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#d97757',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}>
            {initials}
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 240,
          background: '#EFEFED',
          borderRight: '1px solid #E0E0DC',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <nav style={{ flex: 1, padding: '12px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              background: '#E4E4E0',
              borderLeft: '3px solid #d97757',
              color: '#1a1a1a',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'default',
            }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span>Tài liệu của tôi</span>
            </div>
          </nav>
          <div style={{ padding: '16px', borderTop: '1px solid #E0E0DC' }}>
            <button
              onClick={signOut}
              style={{
                background: 'none',
                border: '1px solid #D0D0CC',
                borderRadius: 6,
                color: '#666',
                cursor: 'pointer',
                padding: '8px 0',
                width: '100%',
                fontSize: 13,
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {error && (
            <div style={{
              marginBottom: 20,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ color: '#666', fontSize: 14 }}>Đang tải...</p>
          ) : (
            <>
              {/* Recent section */}
              {showRecent && (
                <section style={{ marginBottom: 36 }}>
                  <h2 style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#666',
                    margin: '0 0 14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}>
                    Gần đây
                  </h2>
                  <DocumentList docs={recentDocs} onOpen={(id) => navigate(`/doc/${id}`)} onDelete={deleteDoc} viewMode="grid" />
                </section>
              )}

              {/* All docs section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 11, fontWeight: 600, color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {searchQuery ? `Kết quả tìm kiếm` : 'Tất cả tài liệu'}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={createDoc}
                      disabled={creating}
                      style={{
                        background: creating ? '#3a3a3a' : '#d97757',
                        border: 'none',
                        borderRadius: 6,
                        color: creating ? '#888' : '#fff',
                        cursor: creating ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        padding: '6px 14px',
                        transition: 'background 0.15s',
                      }}
                    >
                      {creating ? 'Đang tạo...' : '+ Tạo mới'}
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      title="Dạng lưới"
                      style={{
                        background: viewMode === 'grid' ? '#E4E4E0' : 'none',
                        border: `1px solid ${viewMode === 'grid' ? '#BBBBB6' : '#D0D0CC'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <GridIcon active={viewMode === 'grid'} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      title="Dạng danh sách"
                      style={{
                        background: viewMode === 'list' ? '#E4E4E0' : 'none',
                        border: `1px solid ${viewMode === 'list' ? '#BBBBB6' : '#D0D0CC'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ListIcon active={viewMode === 'list'} />
                    </button>
                  </div>
                </div>

                <DocumentList
                  docs={filteredDocs}
                  onOpen={(id) => navigate(`/doc/${id}`)}
                  onDelete={deleteDoc}
                  viewMode={viewMode}
                />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
