import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCollabEditor } from '../hooks/useCollabEditor'
import { useAwareness } from '../hooks/useAwareness'
import { Editor } from '../components/Editor'
import { UserList } from '../components/UserList'
import { Toolbar } from '../components/Toolbar'
import { CollabCursor } from '../components/CollabCursor'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { VersionPanel } from '../components/VersionPanel'
import { VersionHistoryView } from '../components/VersionHistoryView'
import { documentApi } from '../services/api'

type Role = 'OWNER' | 'EDITOR' | 'VIEWER'
type SidebarTab = 'users' | 'versions'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role | null>(null)
  const [tab, setTab] = useState<SidebarTab>('users')
  const [versionMode, setVersionMode] = useState(false)

  const { editor, provider, indexeddbProvider } = useCollabEditor(id!, {
    editable: role !== 'VIEWER',
  })
  const { users, connection } = useAwareness(provider, indexeddbProvider)

  useEffect(() => {
    if (!id) return
    documentApi.get(id).then((res) => {
      const r = (res.data as { currentUserRole?: Role }).currentUserRole
      if (r) setRole(r)
    }).catch(() => {
      // Lỗi fetch không chặn editor — Hocuspocus sẽ tự reject nếu không có quyền.
    })
  }, [id])

  const canRestore = role === 'OWNER' || role === 'EDITOR'

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
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #eee', gap: 12 }}>
        <button onClick={() => navigate('/')}>← Quay lại</button>
        <Toolbar editor={editor} />
        {role === 'VIEWER' && (
          <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
            Chế độ chỉ đọc
          </span>
        )}
        <ConnectionStatus connection={connection} />
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main editor */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, position: 'relative' }}>
          <CollabCursor editor={editor} />
          <Editor editor={editor} />
        </div>

        {/* Sidebar */}
        <div style={{ width: 260, borderLeft: '1px solid #eee', padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
