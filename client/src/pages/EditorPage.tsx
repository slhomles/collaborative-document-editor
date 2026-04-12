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
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center px-4 py-2 border-b border-gray-200 gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Quay lại
        </button>
        <Toolbar editor={editor} />
        <span className={`ml-auto text-xs font-medium ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
          {isOnline ? '● Online' : '○ Offline'}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main editor */}
        <div className="flex-1 overflow-auto p-6 relative">
          <CollabCursor editor={editor} />
          <Editor editor={editor} />
        </div>

        {/* Sidebar */}
        <div className="w-56 border-l border-gray-200 p-4 overflow-auto bg-gray-50">
          <UserList users={users} />
        </div>
      </div>
    </div>
  )
}
