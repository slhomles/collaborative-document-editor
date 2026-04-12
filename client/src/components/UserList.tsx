import { AwarenessUser } from '../hooks/useAwareness'

interface Props {
  users: AwarenessUser[]
}

export function UserList({ users }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Đang online ({users.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.clientId} className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: u.color }}
            >
              {u.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm text-gray-700 truncate">
              {u.name}
            </span>
          </li>
        ))}
        {users.length === 0 && (
          <li className="text-xs text-gray-400">Chưa có ai online</li>
        )}
      </ul>
    </div>
  )
}
