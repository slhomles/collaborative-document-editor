import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCollabEditor } from '../hooks/useCollabEditor'
import { useAwareness } from '../hooks/useAwareness'
import { useDocumentRole } from '../hooks/useDocumentRole'
import { Editor } from '../components/Editor'
import { UserList } from '../components/UserList'
import { Toolbar } from '../components/Toolbar'
import { CollabCursor } from '../components/CollabCursor'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { VersionPanel } from '../components/VersionPanel'
import { VersionHistoryView } from '../components/VersionHistoryView'
import { ShareModal } from '../components/ShareModal'
import { EditableTitle } from '../components/EditableTitle'
import { documentApi } from '../services/api'

type SidebarTab = 'users' | 'versions'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<SidebarTab>('users')
  const [versionMode, setVersionMode] = useState(false)
  const [showShare, setShowShare] = useState(false)

  // Quyền truy cập (chia sẻ / chỉ đọc) — nguồn chân lý cho khả năng chỉnh sửa.
  const { doc, canEdit, isOwner, refreshDoc } = useDocumentRole(id!)
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

  const canRestore = canEdit

  async function handleRenameTitle(newTitle: string) {
    if (!id) return
    try {
      await documentApi.update(id, { title: newTitle })
      refreshDoc()
    } catch {
      // Bỏ qua — refreshDoc sẽ kéo lại tên hiện tại nếu thất bại.
    }
  }

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
          <EditableTitle title={doc.title} canEdit={canEdit} onSave={handleRenameTitle} />
        )}

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

      {/* Toolbar — hàng riêng kiểu Google Docs */}
      <div style={{ flexShrink: 0 }}>
        <Toolbar editor={editor} readOnly={!canEdit} />
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
