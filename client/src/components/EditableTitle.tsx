import { useEffect, useRef, useState } from 'react'

interface Props {
  title: string
  canEdit: boolean
  onSave: (newTitle: string) => void
}

export function EditableTitle({ title, canEdit, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Đồng bộ khi title từ ngoài đổi (vd realtime / refreshDoc).
  useEffect(() => {
    if (!editing) setValue(title)
  }, [title, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    const trimmed = value.trim()
    setEditing(false)
    if (trimmed && trimmed !== title) onSave(trimmed)
    else setValue(title)
  }

  if (!canEdit) {
    return (
      <span style={{ ...textStyle, cursor: 'default' }}>{title}</span>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Escape') { setValue(title); setEditing(false) }
        }}
        style={{
          ...textStyle,
          border: '1px solid #d97757',
          borderRadius: 4,
          padding: '2px 6px',
          outline: 'none',
          maxWidth: 320,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Bấm để đổi tên"
      style={{ ...textStyle, cursor: 'text', padding: '2px 6px', borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ee')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {title}
    </span>
  )
}

const textStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#1a1a1a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 240,
}
