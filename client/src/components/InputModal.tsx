import { useEffect, useRef, useState } from 'react'

interface Props {
  title: string
  placeholder?: string
  defaultValue?: string
  submitLabel?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

/**
 * Modal chung để nhập dữ liệu — thay thế window.prompt.
 * Hiện giữa màn hình, backdrop blur, animation mượt.
 */
export function InputModal({ title, placeholder, defaultValue = '', submitLabel = 'Xác nhận', onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus + select text khi mở
    requestAnimationFrame(() => inputRef.current?.select())
  }, [])

  // Đóng bằng ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(value)
  }

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={titleStyle}>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={inputStyle}
            autoFocus
          />
          <div style={actionsStyle}>
            <button type="button" onClick={onCancel} style={cancelBtnStyle}>
              Hủy
            </button>
            <button type="submit" style={submitBtnStyle}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(4px)',
  zIndex: 9999,
  animation: 'modalFadeIn 0.18s ease-out',
}

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: '24px 28px',
  width: 420,
  maxWidth: '90vw',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
  animation: 'modalSlideIn 0.2s ease-out',
}

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#1a1a1a',
  margin: '0 0 16px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: '1.5px solid #d1d5db',
  borderRadius: 8,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 16,
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  transition: 'background 0.15s',
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
  transition: 'background 0.15s',
}
