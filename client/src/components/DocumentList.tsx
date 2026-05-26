import { useState } from 'react'

export interface Doc {
  id: string
  title: string
  updatedAt: string
  owner: { name: string }
  ownerId?: string
  isStarred?: boolean
  viewedAt?: string | null
  publicRole?: string
  memberIds?: string[]
}

function formatRecentTime(viewedAt?: string | null, updatedAt?: string) {
  if (viewedAt) {
    const date = new Date(viewedAt)
    return `Bạn đã mở lúc ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN')}`
  }
  const date = new Date(updatedAt || '')
  return `Đã sửa ${date.toLocaleDateString('vi-VN')}`
}

interface Props {
  docs: Doc[]
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newTitle: string) => void
  onToggleStar?: (id: string, currentlyStarred: boolean) => void
  viewMode?: 'grid' | 'list'
}

function DocIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="2" width="22" height="30" rx="2" fill="#FFFFFF" stroke="#d97757" strokeWidth="1.5" />
      <line x1="11" y1="12" x2="23" y2="12" stroke="#d97757" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="18" x2="23" y2="18" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="24" x2="19" y2="24" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon({ starred }: { starred: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? '#fbbf24' : 'none'} stroke={starred ? '#fbbf24' : '#888'} strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.196-.4.778-.4 0-.8l1.384 2.802a1.24 1.24 0 0 0 .935.68l3.093.45c.44.064.616.606.297.918l-2.237 2.182a1.24 1.24 0 0 0-.356 1.096l.528 3.08c.075.44-.39.777-.788.57l-2.766-1.455a1.24 1.24 0 0 0-1.148 0l-2.766 1.455c-.398.207-.863-.13-.788-.57l.528-3.08a1.24 1.24 0 0 0-.356-1.096L3.89 9.549c-.319-.312-.143-.854.297-.918l3.093-.45a1.24 1.24 0 0 0 .935-.68L9.5 3.499c.197-.4.78-.4.98 0z" />
    </svg>
  )
}

function GridCard({ doc, onOpen, onDelete, onRename, onToggleStar }: { doc: Doc; onOpen: (id: string) => void; onDelete: (id: string) => void; onRename?: (id: string, t: string) => void; onToggleStar?: (id: string, currentlyStarred: boolean) => void }) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(doc.title)

  function commit() {
    const trimmed = value.trim()
    setEditing(false)
    if (trimmed && trimmed !== doc.title) onRename?.(doc.id, trimmed)
    else setValue(doc.title)
  }

  return (
    <div
      onClick={() => { if (!editing) onOpen(doc.id) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#EFEFED' : '#FFFFFF',
        border: `1px solid ${hovered ? '#BBBBB6' : '#E0E0DC'}`,
        borderRadius: 8,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'background 0.15s, border-color 0.15s',
        position: 'relative',
      }}
    >
      {/* Preview area */}
      <div style={{
        height: 100,
        background: '#F0F0EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #E0E0DC',
      }}>
        <DocIcon />
      </div>

      {/* Info area */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={value}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') { e.preventDefault(); commit() }
                else if (e.key === 'Escape') { setValue(doc.title); setEditing(false) }
              }}
              style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, border: '1px solid #d97757', borderRadius: 4, padding: '1px 4px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          ) : (
            <div style={{
              fontWeight: 500, fontSize: 14, color: '#1a1a1a',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4,
            }}>
              {doc.title}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#888' }}>
            {doc.owner.name} · {formatRecentTime(doc.viewedAt, doc.updatedAt)}
          </div>
        </div>

        {/* Star Button */}
        {onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar(doc.id, !!doc.isStarred)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: doc.isStarred ? 1 : (hovered ? 0.6 : 0.2),
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!doc.isStarred) e.currentTarget.style.opacity = '1'
              e.currentTarget.style.transform = 'scale(1.15)'
            }}
            onMouseLeave={(e) => {
              if (!doc.isStarred) e.currentTarget.style.opacity = hovered ? '0.6' : '0.2'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title={doc.isStarred ? 'Bỏ gắn dấu sao' : 'Gắn dấu sao'}
          >
            <StarIcon starred={!!doc.isStarred} />
          </button>
        )}
      </div>

      {/* Action buttons — shown on hover */}
      {hovered && !editing && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
          {onRename && (
            <button
              onClick={(e) => { e.stopPropagation(); setValue(doc.title); setEditing(true) }}
              title="Đổi tên"
              style={iconActionStyle('#888', '#D0D0CC')}
            >
              ✎
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
            title="Xóa"
            style={iconActionStyle('#f87171', '#FFAAAA')}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

function iconActionStyle(color: string, border: string): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 4,
    color,
    cursor: 'pointer',
    fontSize: 13,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  }
}

function ListRow({ doc, onOpen, onDelete, onRename, onToggleStar }: { doc: Doc; onOpen: (id: string) => void; onDelete: (id: string) => void; onRename?: (id: string, t: string) => void; onToggleStar?: (id: string, currentlyStarred: boolean) => void }) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(doc.title)

  function commit() {
    const trimmed = value.trim()
    setEditing(false)
    if (trimmed && trimmed !== doc.title) onRename?.(doc.id, trimmed)
    else setValue(doc.title)
  }

  return (
    <li
      onClick={() => { if (!editing) onOpen(doc.id) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        background: hovered ? '#EFEFED' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {onToggleStar && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar(doc.id, !!doc.isStarred)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: doc.isStarred ? 1 : (hovered ? 0.6 : 0.2),
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={(e) => {
            if (!doc.isStarred) e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'scale(1.15)'
          }}
          onMouseLeave={(e) => {
            if (!doc.isStarred) e.currentTarget.style.opacity = hovered ? '0.6' : '0.2'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title={doc.isStarred ? 'Bỏ gắn dấu sao' : 'Gắn dấu sao'}
        >
          <StarIcon starred={!!doc.isStarred} />
        </button>
      )}

      <DocIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={value}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') { e.preventDefault(); commit() }
              else if (e.key === 'Escape') { setValue(doc.title); setEditing(false) }
            }}
            style={{ fontWeight: 500, fontSize: 14, border: '1px solid #d97757', borderRadius: 4, padding: '1px 4px', outline: 'none', width: '100%', maxWidth: 360, boxSizing: 'border-box' }}
          />
        ) : (
          <div style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.title}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          {doc.owner.name} · {formatRecentTime(doc.viewedAt, doc.updatedAt)}
        </div>
      </div>
      {!editing && (
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          {onRename && (
            <button
              onClick={(e) => { e.stopPropagation(); setValue(doc.title); setEditing(true) }}
              style={{ background: 'none', border: '1px solid #D0D0CC', borderRadius: 6, color: '#666', cursor: 'pointer', fontSize: 13, padding: '3px 10px' }}
            >
              Đổi tên
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
            style={{ background: 'none', border: '1px solid #FFAAAA', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 13, padding: '3px 10px' }}
          >
            Xóa
          </button>
        </div>
      )}
    </li>
  )
}

export function DocumentList({ docs, onOpen, onDelete, onRename, onToggleStar, viewMode = 'grid' }: Props) {
  if (docs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
        <p style={{ margin: 0, fontSize: 14 }}>Chưa có tài liệu nào ở mục này.</p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16,
      }}>
        {docs.map((doc) => (
          <GridCard key={doc.id} doc={doc} onOpen={onOpen} onDelete={onDelete} onRename={onRename} onToggleStar={onToggleStar} />
        ))}
      </div>
    )
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {docs.map((doc) => (
        <ListRow key={doc.id} doc={doc} onOpen={onOpen} onDelete={onDelete} onRename={onRename} onToggleStar={onToggleStar} />
      ))}
    </ul>
  )
}
