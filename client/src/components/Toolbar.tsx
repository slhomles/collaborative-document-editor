import { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
}

interface ToolbarButton {
  label: string
  action: () => void
  isActive?: boolean
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
    },
    {
      label: '↪ Redo',
      action: () => editor.chain().focus().redo().run(),
    },
  ]

  return (
    <div className="flex gap-1">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.action}
          className={`px-2 py-1 text-xs rounded border cursor-pointer transition-colors ${
            btn.isActive
              ? 'font-bold bg-indigo-100 border-indigo-300 text-indigo-700'
              : 'font-normal bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}
