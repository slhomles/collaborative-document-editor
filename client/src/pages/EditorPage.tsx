import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCollabEditor } from '../hooks/useCollabEditor'
import { useAwareness } from '../hooks/useAwareness'
import { useDocumentRole } from '../hooks/useDocumentRole'
import { documentApi } from '../services/api'
import { Editor } from '../components/Editor'
import { UserList } from '../components/UserList'
import { Toolbar } from '../components/Toolbar'
import { CollabCursor } from '../components/CollabCursor'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { VersionPanel } from '../components/VersionPanel'
import { VersionHistoryView } from '../components/VersionHistoryView'
import { ShareModal } from '../components/ShareModal'

type SidebarTab = 'users' | 'versions'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<SidebarTab>('users')
  const [versionMode, setVersionMode] = useState(false)
  const [showShare, setShowShare] = useState(false)

  // Quyền truy cập (chia sẻ / chỉ đọc) — nguồn chân lý cho khả năng chỉnh sửa.
  const { doc, setDoc, canEdit, isOwner, refreshDoc } = useDocumentRole(id!)

  async function handleToggleStar() {
    if (!doc) return
    const currentlyStarred = !!doc.isStarred

    // Optimistic UI update
    setDoc({
      ...doc,
      isStarred: !currentlyStarred
    })

    try {
      if (currentlyStarred) {
        await documentApi.unstar(doc.id)
      } else {
        await documentApi.star(doc.id)
      }
    } catch (err) {
      console.error('Failed to toggle star:', err)
      // Rollback on error
      setDoc({
        ...doc,
        isStarred: currentlyStarred
      })
    }
  }
  const { editor, provider, indexeddbProvider } = useCollabEditor(id!, { editable: canEdit })
  const { users, connection } = useAwareness(provider, indexeddbProvider)

  // Đồng bộ trạng thái editable của Tiptap theo quyền.
  useEffect(() => {
    if (!editor) return
    editor.setEditable(canEdit)
  }, [editor, canEdit])

  // Khi quyền đổi, reconnect provider để Hocuspocus re-auth với readOnly mới.
  useEffect(() => {
    if (!provider) return
    provider.disconnect()
    provider.connect()
  }, [canEdit, provider])

  // Ghi nhận lượt xem tài liệu khi mở trang (Chuẩn Google Drive)
  useEffect(() => {
    if (id) {
      documentApi.view(id).catch((err) => {
        console.error('Failed to log document view activity:', err)
      })
    }
  }, [id])

  const canRestore = canEdit

  // Chế độ lịch sử phiên bản toàn trang.
  if (versionMode && id) {
    return (
      <VersionHistoryView
        documentId={id}
        editor={editor}
        canRestore={canRestore}
        onClose={() => setVersionMode(false)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 16px',
        borderBottom: '1px solid #eee', gap: 12, flexShrink: 0, background: '#fff',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '4px 10px', fontSize: 13, background: '#f5f5f5',
            border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          ← Quay lại
        </button>

        {doc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize: 15, fontWeight: 600, color: '#1a1a1a',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240,
            }}>
              {doc.title}
            </span>
            <button
              onClick={handleToggleStar}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: doc.isStarred ? 1 : 0.4,
                transition: 'opacity 0.15s, transform 0.1s',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'scale(1.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = doc.isStarred ? '1' : '0.4'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              title={doc.isStarred ? 'Bỏ gắn dấu sao' : 'Gắn dấu sao'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={doc.isStarred ? '#fbbf24' : 'none'} stroke={doc.isStarred ? '#fbbf24' : '#666'} strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.196-.4.778-.4 0-.8l1.384 2.802a1.24 1.24 0 0 0 .935.68l3.093.45c.44.064.616.606.297.918l-2.237 2.182a1.24 1.24 0 0 0-.356 1.096l.528 3.08c.075.44-.39.777-.788.57l-2.766-1.455a1.24 1.24 0 0 0-1.148 0l-2.766 1.455c-.398.207-.863-.13-.788-.57l.528-3.08a1.24 1.24 0 0 0-.356-1.096L3.89 9.549c-.319-.312-.143-.854.297-.918l3.093-.45a1.24 1.24 0 0 0 .935-.68L9.5 3.499c.197-.4.78-.4.98 0z" />
              </svg>
            </button>
          </div>
        )}

        <Toolbar editor={editor} readOnly={!canEdit} />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ConnectionStatus connection={connection} />
          <button
            onClick={() => setShowShare(true)}
            style={{
              padding: '5px 12px', fontSize: 13, fontWeight: 600, background: '#d97757',
              color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            🔗 Chia sẻ
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main editor */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, position: 'relative', background: '#fafafa' }}>
          {!canEdit && (
            <div style={{
              marginBottom: 16, padding: '8px 14px', background: '#fff3cd',
              border: '1px solid #ffc107', borderRadius: 8, fontSize: 13, color: '#856404',
            }}>
              👁 Bạn đang ở chế độ <strong>Chỉ xem</strong>. Chỉ chủ sở hữu và biên soạn viên mới có thể chỉnh sửa.
            </div>
          )}
          <CollabCursor editor={editor} />
          <Editor editor={editor} />
        </div>

        {/* Sidebar */}
        <div style={{
          width: 260, borderLeft: '1px solid #eee', padding: 16, overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12, background: '#fff',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Người online</TabButton>
            <TabButton active={tab === 'versions'} onClick={() => setTab('versions')}>Phiên bản</TabButton>
          </div>
          {tab === 'users' && <UserList users={users} />}
          {tab === 'versions' && id && (
            <VersionPanel documentId={id} canRestore={canRestore} onOpenHistory={() => setVersionMode(true)} />
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShare && doc && (
        <ShareModal
          documentId={id!}
          isOwner={isOwner}
          members={doc.members}
          onClose={() => setShowShare(false)}
          onRefresh={refreshDoc}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '6px 8px',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        background: active ? '#e0e7ff' : '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: 4,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
