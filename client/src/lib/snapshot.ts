import * as Y from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'
import type { JSONContent } from '@tiptap/react'

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Chuyển snapshot Yjs (base64) sang ProseMirror JSON. Dùng yDocToProsemirrorJSON
// để convert trực tiếp Y.XmlFragment → JSON, tránh race với editor tạm khiến
// attribute (checked của TaskItem, color, highlight, …) bị mất.
export function snapshotToJSON(base64Snapshot: string): JSONContent {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, base64ToBytes(base64Snapshot))
  const json = yDocToProsemirrorJSON(ydoc, 'default') as JSONContent
  ydoc.destroy()
  return json
}
