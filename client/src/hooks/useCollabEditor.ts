import { useEffect, useMemo } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { useAuthStore } from '../store/authStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1234'

const COLORS = ['#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D']

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

interface UseCollabEditorOptions {
  editable?: boolean
}

export function useCollabEditor(documentId: string, options: UseCollabEditorOptions = {}) {
  const { editable = true } = options
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const ydoc = useMemo(() => new Y.Doc(), [documentId])

  // Hocuspocus 2.x đa hợp document trên một kết nối: mỗi message gắn tiền tố tên document.
  // Phải dùng HocuspocusProvider (không phải y-websocket) để khớp giao thức của server.
  const provider = useMemo(() => {
    return new HocuspocusProvider({
      url: WS_URL,
      name: documentId,
      document: ydoc,
      token: token || '',
      broadcast: false,
    })
  }, [documentId, ydoc, token])

  // Offline persistence via IndexedDB
  const indexeddbProvider = useMemo(() => {
    return new IndexeddbPersistence(`collab-${documentId}`, ydoc)
  }, [documentId, ydoc])

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user?.name || 'Anonymous',
          color: randomColor(),
        },
      }),
    ],
  })

  // Phản ánh role thay đổi (FE nhận role async sau khi mount).
  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    return () => {
      provider.destroy()
      indexeddbProvider.destroy()
      ydoc.destroy()
    }
  }, [provider, indexeddbProvider, ydoc])

  return { editor, provider, ydoc, indexeddbProvider }
}
