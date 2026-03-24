interface Doc {
  id: string
  title: string
  updatedAt: string
  owner: { name: string }
}

interface Props {
  docs: Doc[]
  onOpen: (id: string) => void
}

export function DocumentList({ docs, onOpen }: Props) {
  if (docs.length === 0) {
    return <p style={{ color: '#999' }}>Chưa có tài liệu nào. Tạo tài liệu mới để bắt đầu.</p>
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {docs.map((doc) => (
        <li
          key={doc.id}
          onClick={() => onOpen(doc.id)}
          style={{
            padding: '12px 16px',
            border: '1px solid #eee',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>{doc.title}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {doc.owner.name} · {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
          <span style={{ fontSize: 18 }}>→</span>
        </li>
      ))}
    </ul>
  )
}
