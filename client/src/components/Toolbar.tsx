import { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
}

interface ToolbarButton {
  label: string
  action: () => void
  isActive?: boolean
  disabled?: boolean
}

export function Toolbar({ editor }: Props) {
  if (!editor) return null

  const buttons: ToolbarButton[] = [
    {
      label: 'B',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      label: 'I',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      label: 'H1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      label: '• List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      label: '1. List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      label: '↩ Undo',
      action: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
    },
    {
      label: '↪ Redo',
      action: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().redo(),
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.action}
          disabled={btn.disabled}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            fontWeight: btn.isActive ? 700 : 400,
            background: btn.isActive ? '#e0e7ff' : '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 4,
            cursor: btn.disabled ? 'not-allowed' : 'pointer',
            opacity: btn.disabled ? 0.4 : 1,
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}
