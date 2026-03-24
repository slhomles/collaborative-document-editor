import { useParams, useNavigate } from 'react-router-dom'
import { useCollabEditor } from '../hooks/useCollabEditor'
import { useAwareness } from '../hooks/useAwareness'
import { Editor } from '../components/Editor'
import { UserList } from '../components/UserList'
import { Toolbar } from '../components/Toolbar'
import { CollabCursor } from '../components/CollabCursor'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { editor, provider } = useCollabEditor(id!)
  const { users, isOnline } = useAwareness(provider)

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #eee', gap: 12 }}>
        <button onClick={() => navigate('/')}>← Quay lại</button>
        <Toolbar editor={editor} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: isOnline ? 'green' : 'gray' }}>
          {isOnline ? '● Online' : '○ Offline'}
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main editor */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, position: 'relative' }}>
          <CollabCursor editor={editor} />
          <Editor editor={editor} />
        </div>

        {/* Sidebar */}
        <div style={{ width: 220, borderLeft: '1px solid #eee', padding: 16, overflow: 'auto' }}>
          <UserList users={users} />
        </div>
      </div>
    </div>
  )
}
