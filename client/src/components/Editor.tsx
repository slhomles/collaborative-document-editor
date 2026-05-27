import { EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import { LinkBubbleMenu } from './LinkBubbleMenu'

interface Props {
  editor: TiptapEditor | null
}

export function Editor({ editor }: Props) {
  if (!editor) return <p>Đang kết nối...</p>

  return (
    <div className="editor-wrapper">
      <LinkBubbleMenu editor={editor} />
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
        .editor-wrapper .ProseMirror h3 { font-size: 1.25em; margin: 10px 0 6px; }

        /* Ảnh */
        .editor-wrapper .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        /* Liên kết */
        .editor-wrapper .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        /* Highlight */
        .editor-wrapper .ProseMirror mark {
          border-radius: 2px;
          padding: 0 1px;
        }

        /* Danh sách bullet */
        .editor-wrapper .ProseMirror ul:not([data-type="taskList"]) {
          list-style-type: disc;
          padding-left: 24px;
          margin: 4px 0 8px;
        }
        .editor-wrapper .ProseMirror ul:not([data-type="taskList"]) ul {
          list-style-type: circle;
        }
        .editor-wrapper .ProseMirror ul:not([data-type="taskList"]) ul ul {
          list-style-type: square;
        }

        /* Danh sách đánh số */
        .editor-wrapper .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 24px;
          margin: 4px 0 8px;
        }
        .editor-wrapper .ProseMirror ol ol {
          list-style-type: lower-alpha;
        }
        .editor-wrapper .ProseMirror ol ol ol {
          list-style-type: lower-roman;
        }

        /* Item chung cho cả ul/ol */
        .editor-wrapper .ProseMirror li {
          margin: 2px 0;
        }
        .editor-wrapper .ProseMirror li p {
          margin: 0;
        }

        /* Danh sách kiểm (task list) */
        .editor-wrapper .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 4px;
        }
        .editor-wrapper .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .editor-wrapper .ProseMirror ul[data-type="taskList"] li > label {
          margin-top: 4px;
          user-select: none;
        }
        .editor-wrapper .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }

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

        /* Modal animations */
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Resizable image */
        .resizable-image-container.selected {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
          border-radius: 4px;
        }
        .resizable-image-container.resizing {
          outline-color: #60a5fa;
        }
        .resize-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #2563eb;
          border: 2px solid #fff;
          border-radius: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          z-index: 10;
        }
        .resize-handle:hover {
          background: #1d4ed8;
          transform: scale(1.2);
        }
        .resize-handle-tl { top: -5px; left: -5px; cursor: nw-resize; }
        .resize-handle-tr { top: -5px; right: -5px; cursor: ne-resize; }
        .resize-handle-bl { bottom: -5px; left: -5px; cursor: sw-resize; }
        .resize-handle-br { bottom: -5px; right: -5px; cursor: se-resize; }
      `}</style>
    </div>
  )
}
