import * as Y from 'yjs'
import { Editor as CoreEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import { getBaseExtensions } from './editorExtensions'

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Chuyển một snapshot Yjs (base64) thành ProseMirror JSON, qua một editor tạm read-only.
// Dùng để hiển thị nội dung version và để diff giữa các version.
export function snapshotToJSON(base64Snapshot: string): JSONContent {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, base64ToBytes(base64Snapshot))
  const tmp = new CoreEditor({
    extensions: [...getBaseExtensions(), Collaboration.configure({ document: ydoc })],
    editable: false,
  })
  const json = tmp.getJSON()
  tmp.destroy()
  ydoc.destroy()
  return json
}
