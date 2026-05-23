import { useState } from 'react'
import { versionApi } from '../services/api'

interface Props {
  documentId: string
  canRestore: boolean
  onOpenHistory: () => void
}

export function VersionPanel({ documentId, canRestore, onOpenHistory }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const label = prompt('Tên phiên bản (để trống để dùng mặc định):')
    if (label === null) return // người dùng bấm Cancel
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await versionApi.create(documentId, label.trim() || undefined)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError((e as Error).message || 'Lưu phiên bản thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {canRestore && (
        <button onClick={handleSave} disabled={saving} style={btnStyle({ primary: true, disabled: saving })}>
          {saving ? 'Đang lưu…' : '+ Lưu phiên bản'}
        </button>
      )}
      <button onClick={onOpenHistory} style={btnStyle()}>
        🕘 Xem lịch sử phiên bản
      </button>
      {saved && <div style={{ fontSize: 12, color: '#16a34a' }}>Đã lưu phiên bản.</div>}
      {error && <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>}
    </div>
  )
}

function btnStyle(opts: { primary?: boolean; disabled?: boolean } = {}): React.CSSProperties {
  return {
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid #ddd',
    borderRadius: 4,
    background: opts.primary ? '#2da44e' : '#f5f5f5',
    color: opts.primary ? '#fff' : '#111',
    cursor: opts.disabled ? 'not-allowed' : 'pointer',
    opacity: opts.disabled ? 0.5 : 1,
    textAlign: 'left',
  }
}
