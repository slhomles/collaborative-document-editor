import { EditorContent, Editor as TiptapEditor } from '@tiptap/react'

interface Props {
  editor: TiptapEditor | null
}

export function Editor({ editor }: Props) {
  if (!editor) return <p>Đang kết nối...</p>

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
      <style>{`
        .editor-wrapper .ProseMirror {
          outline: none;
          min-height: 500px;
          font-size: 16px;
          line-height: 1.7;
        }
        .editor-wrapper .ProseMirror p { margin: 0 0 8px; }
        .editor-wrapper .ProseMirror h1 { font-size: 2em; margin: 16px 0 8px; }
        .editor-wrapper .ProseMirror h2 { font-size: 1.5em; margin: 12px 0 6px; }

        /* Collaboration cursor styles */
        .collaboration-cursor__caret {
          border-left: 1px solid;
          border-right: 1px solid;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }
        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          left: -1px;
          line-height: 1;
          padding: 2px 6px;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
