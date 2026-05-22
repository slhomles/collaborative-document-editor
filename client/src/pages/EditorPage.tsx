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
import { VersionHistory } from '../components/VersionHistory'
import { ShareModal } from '../components/ShareModal'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { editor, provider, indexeddbProvider } = useCollabEditor(id!)
  const { users, connection } = useAwareness(provider, indexeddbProvider)
  const { doc, role, canEdit, isOwner, refreshDoc } = useDocumentRole(id!)
  const [showShare, setShowShare] = useState(false)

  // Sync Tiptap editable state with user's role
  useEffect(() => {
    if (!editor) return
    editor.setEditable(canEdit)
  }, [editor, canEdit])

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid #eee',
        gap: 12,
        flexShrink: 0,
        background: '#fff',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '4px 10px', fontSize: 13,
            background: '#f5f5f5', border: '1px solid #ddd',
            borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          ← Quay lại
        </button>

        {/* Document title */}
        {doc && (
          <span style={{
            fontSize: 15, fontWeight: 600, color: '#1a1a1a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 240,
          }}>
            {doc.title}
          </span>
        )}

        <Toolbar editor={editor} readOnly={!canEdit} />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ConnectionStatus connection={connection} />

          {/* Share button — visible to all, but only owner can manage */}
          <button
            onClick={() => setShowShare(true)}
            style={{
              padding: '5px 12px', fontSize: 13, fontWeight: 600,
              background: '#d97757', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
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
              marginBottom: 16,
              padding: '8px 14px',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: 8,
              fontSize: 13,
              color: '#856404',
            }}>
              👁 Bạn đang ở chế độ <strong>Chỉ xem</strong>. Chỉ chủ sở hữu và biên soạn viên mới có thể chỉnh sửa.
            </div>
          )}
          <CollabCursor editor={editor} />
          <Editor editor={editor} />
        </div>

        {/* Sidebar */}
        <div style={{
          width: 250, borderLeft: '1px solid #eee',
          padding: 16, overflow: 'auto',
          display: 'flex', flexDirection: 'column',
          background: '#fff',
        }}>
          <UserList users={users} />
          <VersionHistory documentId={id!} />
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
