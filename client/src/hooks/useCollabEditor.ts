import { useEffect, useMemo } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
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

export function useCollabEditor(documentId: string) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const ydoc = useMemo(() => new Y.Doc(), [documentId])

  const provider = useMemo(() => {
    return new WebsocketProvider(WS_URL, documentId, ydoc, {
      params: { token: token || '' },
    })
  }, [documentId, ydoc, token])

  // Offline persistence via IndexedDB
  const indexeddbProvider = useMemo(() => {
    return new IndexeddbPersistence(`collab-${documentId}`, ydoc)
  }, [documentId, ydoc])

  const editor = useEditor({
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

  useEffect(() => {
    return () => {
      provider.destroy()
      indexeddbProvider.destroy()
      ydoc.destroy()
    }
  }, [provider, indexeddbProvider, ydoc])

  return { editor, provider, ydoc, indexeddbProvider }
}
