import { useState } from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'
import { InputModal } from './InputModal'

interface Props {
  editor: Editor
}

/**
 * Bubble menu hiện khi cursor ở trên text có link.
 * Hiển thị URL + nút Mở / Sửa / Gỡ link.
 */
export function LinkBubbleMenu({ editor }: Props) {
  const [editingLink, setEditingLink] = useState(false)

  const href = editor.getAttributes('link').href as string | undefined

  function handleEdit() {
    setEditingLink(true)
  }

  function handleSaveLink(url: string) {
    setEditingLink(false)
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function handleRemove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={{
          placement: 'bottom-start',
          appendTo: () => document.body,
        }}
        shouldShow={({ editor: e }) => e.isActive('link')}
      >
        <div style={bubbleStyle}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={linkDisplayStyle}
            title={href}
          >
            {truncateUrl(href || '')}
          </a>
          <div style={dividerStyle} />
          <button onClick={() => window.open(href, '_blank')} style={actionBtnStyle} title="Mở link trong tab mới">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          <button onClick={handleEdit} style={actionBtnStyle} title="Sửa link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={handleRemove} style={actionBtnStyle} title="Gỡ link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </BubbleMenu>

      {editingLink && (
        <InputModal
          title="Sửa liên kết"
          placeholder="https://example.com"
          defaultValue={href || ''}
          submitLabel="Lưu"
          onSubmit={handleSaveLink}
          onCancel={() => setEditingLink(false)}
        />
      )}
    </>
  )
}

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url
  return url.slice(0, max - 3) + '…'
}

const bubbleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  fontSize: 13,
}

const linkDisplayStyle: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 13,
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: '#e5e7eb',
  margin: '0 4px',
}

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: '#374151',
  cursor: 'pointer',
  transition: 'background 0.15s',
}
