import { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
}

// CollabCursor is handled natively by @tiptap/extension-collaboration-cursor.
// This component acts as a wrapper for any additional cursor UI overlays
// (e.g., tooltip on hover or cursor name badges not handled by Tiptap).
export function CollabCursor({ editor }: Props) {
  if (!editor) return null

  // The actual cursor rendering is done by TiptapCollaborationCursor extension.
  // This component can be extended to show custom overlays.
  return null
}
