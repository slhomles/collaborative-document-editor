import { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
  readOnly?: boolean
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
]

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 24, 30, 36, 48]

export function Toolbar({ editor, readOnly = false }: Props) {
  if (!editor) return null

  const disabled = readOnly

  // ----- Kiểu đoạn (paragraph / heading) -----
  const currentBlock = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p'

  function applyBlock(value: string) {
    const chain = editor!.chain().focus()
    if (value === 'p') chain.setParagraph().run()
    else chain.toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run()
  }

  // ----- Font family -----
  const currentFont =
    FONT_FAMILIES.find((f) => editor.isActive('textStyle', { fontFamily: f.value }))?.value || ''

  // ----- Font size -----
  const activeSize = (editor.getAttributes('textStyle').fontSize as string | undefined) || ''
  const currentSize = activeSize ? parseInt(activeSize, 10) : 13

  function setSize(px: number) {
    const clamped = Math.max(6, Math.min(96, px))
    editor!.chain().focus().setFontSize(`${clamped}px`).run()
  }

  // ----- Link / Image -----
  function setLink() {
    const prev = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('Nhập URL liên kết (để trống để gỡ):', prev || '')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function addImage() {
    const url = window.prompt('Nhập URL ảnh:')
    if (url) editor!.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div style={barStyle}>
      {/* Undo / Redo / In */}
      <IconBtn title="Hoàn tác" disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↶</IconBtn>
      <IconBtn title="Làm lại" disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↷</IconBtn>
      <IconBtn title="In" disabled={disabled} onClick={() => window.print()}>🖨</IconBtn>
      <Sep />

      {/* Kiểu đoạn */}
      <select value={currentBlock} disabled={disabled} onChange={(e) => applyBlock(e.target.value)} style={selectStyle(132)} title="Kiểu văn bản">
        <option value="p">Văn bản thường</option>
        <option value="h1">Tiêu đề 1</option>
        <option value="h2">Tiêu đề 2</option>
        <option value="h3">Tiêu đề 3</option>
      </select>

      {/* Font family */}
      <select value={currentFont} disabled={disabled} onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} style={selectStyle(132)} title="Phông chữ">
        <option value="">Phông mặc định</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <Sep />

      {/* Cỡ chữ */}
      <IconBtn title="Giảm cỡ chữ" disabled={disabled} onClick={() => setSize(currentSize - 1)}>−</IconBtn>
      <select value={FONT_SIZES.includes(currentSize) ? String(currentSize) : ''} disabled={disabled} onChange={(e) => setSize(Number(e.target.value))} style={selectStyle(56)} title="Cỡ chữ">
        {!FONT_SIZES.includes(currentSize) && <option value="">{currentSize}</option>}
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <IconBtn title="Tăng cỡ chữ" disabled={disabled} onClick={() => setSize(currentSize + 1)}>+</IconBtn>
      <Sep />

      {/* B / I / U */}
      <IconBtn title="Đậm" active={editor.isActive('bold')} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></IconBtn>
      <IconBtn title="Nghiêng" active={editor.isActive('italic')} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></IconBtn>
      <IconBtn title="Gạch chân" active={editor.isActive('underline')} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></IconBtn>

      {/* Màu chữ + Highlight */}
      <label style={colorLabelStyle} title="Màu chữ">
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>A</span>
        <input type="color" disabled={disabled} value={(editor.getAttributes('textStyle').color as string) || '#000000'}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} style={colorInputStyle} />
      </label>
      <label style={colorLabelStyle} title="Màu nền chữ">
        <span style={{ fontSize: 13, lineHeight: 1 }}>🖊</span>
        <input type="color" disabled={disabled} value={(editor.getAttributes('highlight').color as string) || '#ffff00'}
          onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} style={colorInputStyle} />
      </label>
      <Sep />

      {/* Link / Ảnh */}
      <IconBtn title="Chèn liên kết" active={editor.isActive('link')} disabled={disabled} onClick={setLink}>🔗</IconBtn>
      <IconBtn title="Chèn ảnh" disabled={disabled} onClick={addImage}>🖼</IconBtn>
      <Sep />

      {/* Căn lề */}
      <IconBtn title="Căn trái" active={editor.isActive({ textAlign: 'left' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('left').run()}>⬅</IconBtn>
      <IconBtn title="Căn giữa" active={editor.isActive({ textAlign: 'center' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('center').run()}>⬌</IconBtn>
      <IconBtn title="Căn phải" active={editor.isActive({ textAlign: 'right' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('right').run()}>➡</IconBtn>
      <IconBtn title="Căn đều" active={editor.isActive({ textAlign: 'justify' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>☰</IconBtn>
      <Sep />

      {/* Lists */}
      <IconBtn title="Danh sách dấu đầu dòng" active={editor.isActive('bulletList')} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</IconBtn>
      <IconBtn title="Danh sách đánh số" active={editor.isActive('orderedList')} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</IconBtn>
      <IconBtn title="Danh sách kiểm" active={editor.isActive('taskList')} disabled={disabled} onClick={() => editor.chain().focus().toggleTaskList().run()}>☑</IconBtn>
      <Sep />

      {/* Xóa định dạng */}
      <IconBtn title="Xóa định dạng" disabled={disabled} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>⨯A</IconBtn>
    </div>
  )
}

function IconBtn({ children, onClick, active, disabled, title }: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        minWidth: 28,
        height: 28,
        padding: '0 6px',
        fontSize: 13,
        background: active ? '#d7e3ff' : 'transparent',
        color: '#1a1a1a',
        border: `1px solid ${active ? '#9db8f0' : 'transparent'}`,
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span style={{ width: 1, height: 20, background: '#e0e0dc', margin: '0 4px', flexShrink: 0 }} />
}

const barStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  flexWrap: 'wrap',
  padding: '6px 12px',
  background: '#F6F6F4',
  borderBottom: '1px solid #E0E0DC',
}

function selectStyle(width: number): React.CSSProperties {
  return {
    height: 28,
    width,
    fontSize: 12,
    border: '1px solid #D0D0CC',
    borderRadius: 4,
    background: '#fff',
    padding: '0 6px',
    cursor: 'pointer',
  }
}

const colorLabelStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 4,
  cursor: 'pointer',
}

const colorInputStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 1,
  width: 22,
  height: 6,
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
}
