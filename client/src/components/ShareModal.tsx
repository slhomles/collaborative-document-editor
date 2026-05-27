import { useState, useEffect } from 'react'
import { documentApi } from '../services/api'
import { Member, DocDetail } from '../hooks/useDocumentRole'
import { useAuthStore } from '../store/authStore'

interface Props {
  documentId: string
  isOwner: boolean
  members: Member[]
  onClose: () => void
  onRefresh: () => void
}

export function ShareModal({ documentId, isOwner: _isOwner, members: _propMembers, onClose, onRefresh }: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER')
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Fetch full document details on mount
  const fetchDocDetails = async () => {
    try {
      const res = await documentApi.get(documentId)
      setDoc(res.data as unknown as DocDetail)
    } catch (err) {
      console.error('Failed to fetch document sharing details', err)
      setError('Không thể tải thông tin chi tiết chia sẻ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocDetails()
  }, [documentId])

  // Get a stable color based on name string
  const getAvatarBg = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const h = Math.abs(hash % 360)
    return `hsl(${h}, 50%, 45%)`
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await documentApi.addMember(documentId, email.trim(), role)
      setSuccess(`Đã thêm ${email.trim()} với quyền thành công.`)
      setEmail('')
      fetchDocDetails()
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
      fetchDocDetails()
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa thành viên.')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleRoleChange(_userId: string, newRole: 'EDITOR' | 'VIEWER', memberEmail: string) {
    setError(null)
    try {
      await documentApi.addMember(documentId, memberEmail, newRole)
      fetchDocDetails()
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể cập nhật quyền.')
    }
  }

  async function handleGeneralAccessChange(type: 'RESTRICTED' | 'VIEWER' | 'EDITOR') {
    if (!isMeOwner) return
    setError(null)
    try {
      await documentApi.update(documentId, { publicRole: type })
      fetchDocDetails()
      onRefresh()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể cập nhật quyền truy cập chung.')
    }
  }

  const handleCopyLink = () => {
    const url = window.location.origin + `/doc/${documentId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          Đang tải thông tin chia sẻ...
        </div>
      </div>
    )
  }

  const activeDoc: DocDetail = doc || {
    id: '',
    title: 'Tài liệu',
    ownerId: '',
    publicRole: 'RESTRICTED',
    editorsCanShare: true,
    owner: { id: '', name: 'Chủ sở hữu', email: '' },
    members: []
  }
  const ownerName = activeDoc.owner.name
  const ownerEmail = activeDoc.owner.email
  const isMeOwner = currentUser?.id === activeDoc.ownerId

  // Calculate my exact role and if I can manage members
  const canManageMembers = isMeOwner

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Modal Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          width: 520,
          maxWidth: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {showSettings ? (
          /* ================= SETTINGS SCREEN ================= */
          <>
            {/* Settings Header */}
            <div style={{
              padding: '24px 24px 12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <button 
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368', padding: 8, display: 'flex',
                  borderRadius: '50%', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Quay lại"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <h2 style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 500,
                color: '#1f1f1f',
              }}>
                Cài đặt chia sẻ
              </h2>
            </div>

            {/* Settings Content */}
            <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <input
                    type="checkbox"
                    id="editorsCanShareCheckbox"
                    checked={activeDoc.editorsCanShare}
                    disabled={!isMeOwner}
                    onChange={async () => {
                      if (!isMeOwner) return
                      try {
                        await documentApi.update(documentId, { editorsCanShare: !activeDoc.editorsCanShare })
                        fetchDocDetails()
                        onRefresh()
                      } catch (err: any) {
                        setError(err.response?.data?.message || 'Không thể cập nhật cấu hình chia sẻ.')
                      }
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 3,
                      cursor: isMeOwner ? 'pointer' : 'default',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <label 
                      htmlFor="editorsCanShareCheckbox"
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1f1f1f',
                        cursor: isMeOwner ? 'pointer' : 'default',
                        display: 'block',
                      }}
                    >
                      Người chỉnh sửa có thể thay đổi các quyền và chia sẻ
                    </label>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#5f6368', lineHeight: '16px' }}>
                      Cho phép các tài khoản biên soạn thêm người mới và thay đổi quyền của họ.
                    </p>
                  </div>
                </div>
              </div>
              {error && (
                <p style={{ marginTop: 16, fontSize: 13, color: '#b3261e' }}>{error}</p>
              )}
            </div>

            {/* Settings Footer */}
            <div style={{
              padding: '16px 24px 24px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid #e0e0e0',
            }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  backgroundColor: '#d97757',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 20,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c25e3c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d97757'}
              >
                Xong
              </button>
            </div>
          </>
        ) : (
          /* ================= MAIN SHARING SCREEN ================= */
          <>
            {/* Header */}
            <div style={{
              padding: '24px 24px 12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 500,
                  color: '#1f1f1f',
                }}>
                  Chia sẻ "{activeDoc.title}"
                </h2>
              </div>
              {/* Removed help and settings gear buttons */}
            </div>

            {/* Share Invite Form - Only visible/interactive if user has manage rights */}
            <div style={{ padding: '4px 24px 16px 24px' }}>
              {canManageMembers ? (
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    display: 'flex',
                    border: '1px solid #747775',
                    borderRadius: 8,
                    padding: '4px 12px',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s',
                  }}>
                    <input
                      type="email"
                      placeholder="Thêm người, nhóm, email..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: 15,
                        padding: '8px 0',
                        color: '#1f1f1f',
                      }}
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
                      style={{
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: '#444746',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        paddingRight: 10,
                      }}
                    >
                      <option value="VIEWER">Người xem</option>
                      <option value="EDITOR">Người chỉnh sửa</option>
                    </select>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        background: email.trim() ? '#d97757' : '#f1f3f4',
                        color: email.trim() ? '#fff' : '#1f1f1f',
                        border: 'none',
                        borderRadius: 20,
                        padding: '6px 16px',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: email.trim() && !submitting ? 'pointer' : 'default',
                        transition: 'background-color 0.2s',
                        marginLeft: 8,
                      }}
                    >
                      {submitting ? '...' : 'Thêm'}
                    </button>
                  </div>
                  {error && (
                    <p style={{ margin: 0, fontSize: 13, color: '#b3261e' }}>{error}</p>
                  )}
                  {success && (
                    <p style={{ margin: 0, fontSize: 13, color: '#146c2e' }}>{success}</p>
                  )}
                </form>
              ) : (
                <div style={{
                  padding: '8px 12px',
                  background: '#f1f3f4',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#5f6368',
                }}>
                  🔒 Chỉ Chủ sở hữu hoặc Biên soạn viên được cho phép mới có thể thêm thành viên mới.
                </div>
              )}
            </div>

            {/* Scrollable Content (People List + General Access) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}>
              {/* People with Access */}
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1f1f1f',
                  letterSpacing: '0.1px',
                }}>
                  Những người có quyền truy cập
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Owner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: getAvatarBg(ownerName),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                    }}>
                      {ownerName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {ownerName} {isMeOwner && <span style={{ color: '#5f6368', fontSize: 13, fontWeight: 400 }}>(bạn)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#444746', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ownerEmail || 'chusoahuu@email.com'}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: '#444746', paddingRight: 8, whiteSpace: 'nowrap' }}>
                      Chủ sở hữu
                    </div>
                  </div>

                  {/* Members */}
                  {activeDoc.members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: getAvatarBg(m.user.name),
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 14,
                        flexShrink: 0,
                      }}>
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1f1f1f', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {m.user.name} {currentUser?.id === m.userId && <span style={{ color: '#5f6368', fontSize: 13, fontWeight: 400 }}>(bạn)</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#444746', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.user.email}
                        </div>
                      </div>

                      {/* Dropdown for role (Only editable by authorized managers) */}
                      {canManageMembers ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as 'EDITOR' | 'VIEWER', m.user.email)}
                          style={{
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            color: '#1f1f1f',
                            fontSize: 14,
                            fontWeight: 400,
                            cursor: 'pointer',
                            padding: '4px 8px',
                          }}
                        >
                          <option value="VIEWER">Người xem</option>
                          <option value="EDITOR">Người chỉnh sửa</option>
                        </select>
                      ) : (
                        <div style={{ fontSize: 14, color: '#444746', paddingRight: 8 }}>
                          {m.role === 'EDITOR' ? 'Người chỉnh sửa' : 'Người xem'}
                        </div>
                      )}

                      {/* Remove Member Button - Only visible for OWNER */}
                      {isMeOwner && (
                        <button
                          onClick={() => handleRemove(m.userId)}
                          disabled={removingId === m.userId}
                          title="Xóa quyền truy cập"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#5f6368',
                            padding: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f4'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* General Access ("Quyền truy cập chung") */}
              <div style={{
                borderTop: '1px solid #e0e0e0',
                paddingTop: 16,
                marginBottom: 24,
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1f1f1f',
                }}>
                  Quyền truy cập chung
                </h3>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Globe / Lock Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: activeDoc.publicRole === 'RESTRICTED' ? '#f1f3f4' : '#fdf8f6',
                    color: activeDoc.publicRole === 'RESTRICTED' ? '#5f6368' : '#d97757',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {activeDoc.publicRole === 'RESTRICTED' ? (
                      // Lock icon
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    ) : (
                      // Globe icon
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    )}
                  </div>

                  {/* Status and dropdowns */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {/* General Access Main Select (Only editable by OWNER) */}
                      <select
                        value={activeDoc.publicRole === 'RESTRICTED' ? 'RESTRICTED' : 'PUBLIC'}
                        disabled={!isMeOwner}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'RESTRICTED') {
                            handleGeneralAccessChange('RESTRICTED')
                          } else {
                            handleGeneralAccessChange('VIEWER') // Default public access to Viewer
                          }
                        }}
                        style={{
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          color: '#1f1f1f',
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: isMeOwner ? 'pointer' : 'default',
                          padding: '4px 0',
                        }}
                      >
                        <option value="RESTRICTED">Hạn chế</option>
                        <option value="PUBLIC">Bất kỳ ai có đường liên kết</option>
                      </select>

                      {/* Dropdown arrow handled by browser */}

                      {/* Public role selector (Viewer / Editor) - only visible if access is not Restricted */}
                      {activeDoc.publicRole !== 'RESTRICTED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                          <select
                            value={activeDoc.publicRole}
                            disabled={!isMeOwner}
                            onChange={(e) => handleGeneralAccessChange(e.target.value as 'VIEWER' | 'EDITOR')}
                            style={{
                              border: 'none',
                              outline: 'none',
                              backgroundColor: 'transparent',
                              color: '#444746',
                              fontSize: 14,
                              fontWeight: 500,
                              cursor: isMeOwner ? 'pointer' : 'default',
                              padding: '4px 8px',
                            }}
                          >
                            <option value="VIEWER">Người xem</option>
                            <option value="EDITOR">Người chỉnh sửa</option>
                          </select>
                          {/* Dropdown arrow handled by browser */}
                        </div>
                      )}
                </div>

                {/* Subtext description */}
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: 12,
                  color: '#5f6368',
                  lineHeight: '16px',
                }}>
                  {activeDoc.publicRole === 'RESTRICTED'
                    ? 'Chỉ những người được thêm mới có thể mở bằng đường liên kết này'
                    : activeDoc.publicRole === 'VIEWER'
                    ? 'Bất kỳ ai có kết nối Internet và có đường liên kết này đều có thể xem'
                    : 'Bất kỳ ai có kết nối Internet và có đường liên kết này đều có thể chỉnh sửa'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px 24px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#fff',
        }}>
          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#fff',
              border: '1px solid #747775',
              borderRadius: 20,
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: '#d97757',
              cursor: 'pointer',
              transition: 'background-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fdf8f6'
              e.currentTarget.style.borderColor = '#d97757'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff'
              e.currentTarget.style.borderColor = '#747775'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
            </svg>
            {copied ? 'Đã sao chép liên kết!' : 'Sao chép đường liên kết'}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#d97757',
              color: '#fff',
              border: 'none',
              borderRadius: 20,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c25e3c'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d97757'}
          >
            Xong
          </button>
        </div>
      </>
    )}
  </div>
</div>
  )
}
