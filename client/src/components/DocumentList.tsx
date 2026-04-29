import { useState } from 'react'

interface Doc {
  id: string
  title: string
  updatedAt: string
  owner: { name: string }
}

interface Props {
  docs: Doc[]
  onOpen: (id: string) => void
  onDelete: (id: string) => void
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

function GridCard({ doc, onOpen, onDelete }: { doc: Doc; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => onOpen(doc.id)}
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
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          fontWeight: 500,
          fontSize: 14,
          color: '#1a1a1a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {doc.title}
        </div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {doc.owner.name} · {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Delete button — shown on hover */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid #FFAAAA',
            borderRadius: 4,
            color: '#f87171',
            cursor: 'pointer',
            fontSize: 14,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

function ListRow({ doc, onOpen, onDelete }: { doc: Doc; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <li
      onClick={() => onOpen(doc.id)}
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
      <DocIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.title}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          {doc.owner.name} · {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
        style={{
          background: 'none',
          border: '1px solid #FFAAAA',
          borderRadius: 6,
          color: '#dc2626',
          cursor: 'pointer',
          fontSize: 13,
          padding: '3px 10px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        Xóa
      </button>
    </li>
  )
}

export function DocumentList({ docs, onOpen, onDelete, viewMode = 'grid' }: Props) {
  if (docs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
        <p style={{ margin: 0, fontSize: 14 }}>Chưa có tài liệu nào. Tạo tài liệu mới để bắt đầu.</p>
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
          <GridCard key={doc.id} doc={doc} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>
    )
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {docs.map((doc) => (
        <ListRow key={doc.id} doc={doc} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </ul>
  )
}
