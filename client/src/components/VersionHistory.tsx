import { useState, useEffect } from 'react'
import { versionApi } from '../services/api'

interface Props {
  documentId: string
}

interface Version {
  id: string
  label: string
  versionNumber: number
  createdBy: string
  createdAt: string
}

export function VersionHistory({ documentId }: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const res = await versionApi.list(documentId)
      setVersions(res.data)
    } catch (err) {
      console.error('Failed to fetch versions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions()
    // Auto-refresh every 30s to catch auto-snapshots
    const interval = setInterval(fetchVersions, 30000)
    return () => clearInterval(interval)
  }, [documentId])

  const handleCreateSnapshot = async () => {
    try {
      setCreating(true)
      await versionApi.create(documentId, `Lưu thủ công - ${new Date().toLocaleTimeString()}`)
      await fetchVersions()
    } catch (err: any) {
      console.error('Failed to create snapshot', err)
      const msg = err.response?.data?.message || err.message
      alert(`Có lỗi xảy ra khi lưu phiên bản: ${msg}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#333' }}>Lịch sử phiên bản</h3>
        <button
          onClick={handleCreateSnapshot}
          disabled={creating}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            background: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: creating ? 0.7 : 1
          }}
        >
          {creating ? 'Đang lưu...' : '+ Lưu mốc'}
        </button>
      </div>

      {loading && versions.length === 0 ? (
        <p style={{ fontSize: 12, color: '#666' }}>Đang tải...</p>
      ) : versions.length === 0 ? (
        <p style={{ fontSize: 12, color: '#666' }}>Chưa có phiên bản nào.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 300, overflowY: 'auto' }}>
          {versions.map((v) => (
            <li key={v.id} style={{ 
              padding: '8px 0', 
              borderBottom: '1px solid #f5f5f5',
              fontSize: 12 
            }}>
              <div style={{ fontWeight: 500, color: '#333', marginBottom: 4 }}>
                v{v.versionNumber}: {v.label}
              </div>
              <div style={{ color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(v.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
