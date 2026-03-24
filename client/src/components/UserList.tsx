import { AwarenessUser } from '../hooks/useAwareness'

interface Props {
  users: AwarenessUser[]
}

export function UserList({ users }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        Đang online ({users.length})
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map((u) => (
          <li key={u.clientId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: u.color,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {u.name.charAt(0).toUpperCase()}
            </span>
            <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.name}
            </span>
          </li>
        ))}
        {users.length === 0 && (
          <li style={{ fontSize: 12, color: '#999' }}>Chưa có ai online</li>
        )}
      </ul>
    </div>
  )
}
