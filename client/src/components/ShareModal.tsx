import { useState } from 'react'
import { documentApi } from '../services/api'
import { Member } from '../hooks/useDocumentRole'

interface Props {
  documentId: string
  isOwner: boolean
  members: Member[]
  onClose: () => void
  onRefresh: () => void
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên soạn',
  VIEWER: 'Xem',
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: '#d97757',
  EDITOR: '#0066cc',
  VIEWER: '#888',
}

export function ShareModal({ documentId, isOwner, members, onClose, onRefresh }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER')
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await documentApi.addMember(documentId, email.trim(), role)
      setSuccess(`Đã thêm ${email.trim()} với quyền ${ROLE_LABELS[role]}.`)
      setEmail('')
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể thêm thành viên.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!window.confirm('Xóa thành viên này khỏi tài liệu?')) return
    setRemovingId(userId)
    setError(null)
    try {
      await documentApi.removeMember(documentId, userId)
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa thành viên.')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleRoleChange(userId: string, newRole: 'EDITOR' | 'VIEWER', memberEmail: string) {
    setError(null)
    try {
      await documentApi.addMember(documentId, memberEmail, newRole)
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể cập nhật quyền.')
    }
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Modal box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          width: 480,
          maxWidth: '95vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>
            🔗 Chia sẻ tài liệu
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#888', lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

          {/* Add member form — only for owner */}
          {isOwner ? (
            <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                Thêm thành viên
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="Email người dùng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 14,
                    border: '1px solid #D0D0CC', borderRadius: 6,
                    outline: 'none', color: '#1a1a1a',
                    background: '#fafafa',
                  }}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
                  style={{
                    padding: '8px 10px', fontSize: 13,
                    border: '1px solid #D0D0CC', borderRadius: 6,
                    background: '#fafafa', cursor: 'pointer', color: '#1a1a1a',
                  }}
                >
                  <option value="EDITOR">Biên soạn</option>
                  <option value="VIEWER">Xem</option>
                </select>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: submitting ? '#ccc' : '#d97757',
                    color: '#fff', border: 'none', borderRadius: 6,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {submitting ? '...' : 'Thêm'}
                </button>
              </div>

              {error && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626' }}>{error}</p>
              )}
              {success && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#16a34a' }}>{success}</p>
              )}
            </form>
          ) : (
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              Chỉ chủ sở hữu mới có thể thêm hoặc xóa thành viên.
            </p>
          )}

          {/* Members list */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
              Thành viên ({members.length + 1})
            </label>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>

              {/* Members */}
              {members.map((m) => (
                <li key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: '#F8F8F6', border: '1px solid #EBEBEB',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name & email */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.user.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.user.email}
                    </div>
                  </div>

                  {/* Role badge / selector */}
                  {isOwner ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value as 'EDITOR' | 'VIEWER', m.user.email)}
                      style={{
                        padding: '4px 8px', fontSize: 12,
                        border: '1px solid #D0D0CC', borderRadius: 6,
                        background: '#fff', cursor: 'pointer',
                        color: ROLE_COLORS[m.role],
                        fontWeight: 600,
                      }}
                    >
                      <option value="EDITOR">Biên soạn</option>
                      <option value="VIEWER">Xem</option>
                    </select>
                  ) : (
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: ROLE_COLORS[m.role],
                      background: `${ROLE_COLORS[m.role]}18`,
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {ROLE_LABELS[m.role]}
                    </span>
                  )}

                  {/* Remove button */}
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      disabled={removingId === m.userId}
                      title="Xóa thành viên"
                      style={{
                        background: 'none', border: 'none',
                        cursor: removingId === m.userId ? 'not-allowed' : 'pointer',
                        color: '#999', fontSize: 16, lineHeight: 1,
                        padding: '2px 4px', borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      {removingId === m.userId ? '...' : '×'}
                    </button>
                  )}
                </li>
              ))}

              {members.length === 0 && (
                <li style={{ fontSize: 13, color: '#999', padding: '8px 0', textAlign: 'center' }}>
                  Chưa có thành viên nào được chia sẻ.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0,
          background: '#fafafa',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 500,
              background: '#f0f0ee', border: '1px solid #D0D0CC',
              borderRadius: 6, cursor: 'pointer', color: '#333',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
