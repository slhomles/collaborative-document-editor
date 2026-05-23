import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import { versionApi } from '../services/api'
import { snapshotToJSON } from '../lib/snapshot'
import { VersionDiffEditor } from './VersionDiffEditor'

interface VersionListItem {
  id: string
  versionNumber: number
  label: string | null
  isAuto: boolean
  createdBy: string
  createdAt: string
  creator?: { id: string; name: string }
}

interface Props {
  documentId: string
  editor: TiptapEditor | null
  canRestore: boolean
  onClose: () => void
}

const CURRENT_KEY = 'current'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Nhãn nhóm theo ngày kiểu Google Docs: Hôm nay / Hôm qua / dd/MM/yyyy.
function dayGroupLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000)
  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN')
}

export function VersionHistoryView({ documentId, editor, canRestore, onClose }: Props) {
  const [versions, setVersions] = useState<VersionListItem[]>([])
  const [selectedKey, setSelectedKey] = useState<string>(CURRENT_KEY)
  const [content, setContent] = useState<JSONContent | null>(null)
  const [prevContent, setPrevContent] = useState<JSONContent | null>(null)
  const [highlight, setHighlight] = useState(true)
  const [anchorCount, setAnchorCount] = useState(0)
  const [activeAnchor, setActiveAnchor] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache JSON đã trích theo versionId để khỏi fetch + parse lại.
  const jsonCache = useRef<Map<string, JSONContent>>(new Map())

  const getVersionJSON = useCallback(
    async (versionId: string): Promise<JSONContent> => {
      const cached = jsonCache.current.get(versionId)
      if (cached) return cached
      const res = await versionApi.get(documentId, versionId)
      const json = snapshotToJSON((res.data as { yjsSnapshot: string }).yjsSnapshot)
      jsonCache.current.set(versionId, json)
      return json
    },
    [documentId],
  )

  useEffect(() => {
    versionApi
      .list(documentId)
      .then((res) => setVersions(res.data as VersionListItem[]))
      .catch((e) => setError((e as Error).message || 'Không tải được danh sách phiên bản'))
  }, [documentId])

  // Tính nội dung version đang chọn + version liền trước (để diff).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setActiveAnchor(-1)

    async function load() {
      try {
        let cur: JSONContent | null
        let prev: JSONContent | null
        if (selectedKey === CURRENT_KEY) {
          cur = editor ? editor.getJSON() : null
          prev = versions[0] ? await getVersionJSON(versions[0].id) : null
        } else {
          const idx = versions.findIndex((v) => v.id === selectedKey)
          cur = await getVersionJSON(selectedKey)
          prev = idx >= 0 && versions[idx + 1] ? await getVersionJSON(versions[idx + 1].id) : null
        }
        if (cancelled) return
        setContent(cur)
        setPrevContent(prev)
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Không tải được nội dung phiên bản')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedKey, versions, editor, getVersionJSON])

  async function handleRestore() {
    if (!editor || selectedKey === CURRENT_KEY) return
    const v = versions.find((x) => x.id === selectedKey)
    if (!confirm(`Khôi phục về bản v${v?.versionNumber}? Hệ thống sẽ tự lưu bản hiện tại trước.`)) return
    setRestoring(true)
    setError(null)
    try {
      // 1. Backup state hiện tại thành 1 version thủ công.
      await versionApi.create(documentId, 'Auto-backup before restore')
      // 2. Thay nội dung qua editor → y-prosemirror sinh xóa+chèn, đồng bộ mọi client.
      const json = await getVersionJSON(selectedKey)
      editor.commands.setContent(json, true)
      onClose()
    } catch (e) {
      setError((e as Error).message || 'Khôi phục thất bại')
      setRestoring(false)
    }
  }

  const grouped = groupByDay(versions)
  const isCurrent = selectedKey === CURRENT_KEY
  const selectedVersion = versions.find((v) => v.id === selectedKey)
  const title = isCurrent
    ? 'Phiên bản hiện tại'
    : selectedVersion
      ? selectedVersion.label || `${formatDateTime(selectedVersion.createdAt)}`
      : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Thanh trên */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderBottom: '1px solid #eee' }}>
        <button onClick={onClose} style={iconBtn()} title="Quay lại">←</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>

        <div style={{ flex: 1 }} />

        {/* Bộ đếm + điều hướng thay đổi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
          <span>Tổng số: {anchorCount} nội dung chỉnh sửa</span>
          <button
            onClick={() => setActiveAnchor((a) => Math.max(0, (a < 0 ? 0 : a) - 1))}
            disabled={anchorCount === 0 || activeAnchor <= 0}
            style={iconBtn({ disabled: anchorCount === 0 || activeAnchor <= 0 })}
            title="Thay đổi trước"
          >
            ↑
          </button>
          <button
            onClick={() => setActiveAnchor((a) => Math.min(anchorCount - 1, a + 1))}
            disabled={anchorCount === 0 || activeAnchor >= anchorCount - 1}
            style={iconBtn({ disabled: anchorCount === 0 || activeAnchor >= anchorCount - 1 })}
            title="Thay đổi tiếp theo"
          >
            ↓
          </button>
        </div>

        {canRestore && !isCurrent && (
          <button onClick={handleRestore} disabled={restoring} style={primaryBtn(restoring)}>
            {restoring ? 'Đang khôi phục…' : 'Khôi phục phiên bản này'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Nội dung version (vùng chính) */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading && <div style={{ color: '#6b7280', fontSize: 13 }}>Đang tải nội dung…</div>}
          {error && <div style={{ color: '#cf222e', fontSize: 13 }}>{error}</div>}
          <VersionDiffEditor
            content={content}
            prevContent={prevContent}
            highlight={highlight}
            activeAnchor={activeAnchor}
            onAnchors={setAnchorCount}
          />
        </div>

        {/* Sidebar phải: danh sách phiên bản */}
        <div style={{ width: 300, borderLeft: '1px solid #eee', overflow: 'auto', padding: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>Nhật ký phiên bản</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', margin: '12px 0' }}>
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
            Làm nổi bật nội dung thay đổi
          </label>

          {/* Mục Phiên bản hiện tại */}
          <button onClick={() => setSelectedKey(CURRENT_KEY)} style={itemStyle(isCurrent)}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Phiên bản hiện tại</div>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {grouped.map(([day, items]) => (
              <div key={day}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '4px 0 6px' }}>{day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((v) => (
                    <button key={v.id} onClick={() => setSelectedKey(v.id)} style={itemStyle(selectedKey === v.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                        <span>{formatTime(v.createdAt)}</span>
                        {!v.isAuto && <span style={namedBadge()}>Đã đặt tên</span>}
                      </div>
                      {!v.isAuto && v.label && (
                        <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{v.label}</div>
                      )}
                      {v.creator?.name && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={dotStyle()} />
                          {v.creator.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { hour12: false })
}

function groupByDay(versions: VersionListItem[]): [string, VersionListItem[]][] {
  const groups = new Map<string, VersionListItem[]>()
  for (const v of versions) {
    const key = dayGroupLabel(v.createdAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(v)
  }
  return Array.from(groups.entries())
}

function itemStyle(active: boolean): React.CSSProperties {
  return {
    width: '100%',
    textAlign: 'left',
    padding: 10,
    border: active ? '1px solid #2563eb' : '1px solid #e5e7eb',
    borderRadius: 6,
    background: active ? '#eff6ff' : '#fff',
    cursor: 'pointer',
  }
}

function namedBadge(): React.CSSProperties {
  return { fontSize: 10, fontWeight: 600, color: '#1d4ed8', background: '#dbeafe', borderRadius: 4, padding: '1px 5px' }
}

function dotStyle(): React.CSSProperties {
  return { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }
}

function iconBtn(opts: { disabled?: boolean } = {}): React.CSSProperties {
  return {
    padding: '4px 8px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 4,
    background: '#fff',
    cursor: opts.disabled ? 'not-allowed' : 'pointer',
    opacity: opts.disabled ? 0.4 : 1,
  }
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #2563eb',
    borderRadius: 4,
    background: '#2563eb',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }
}
