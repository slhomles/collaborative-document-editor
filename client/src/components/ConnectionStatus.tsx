import { ConnectionState } from '../hooks/useAwareness'

interface Props {
  connection: ConnectionState
}

const STYLES: Record<ConnectionState, { color: string; dot: string; label: string }> = {
  connecting: { color: '#b58900', dot: '◐', label: 'Đang kết nối…' },
  connected: { color: '#2da44e', dot: '●', label: 'Đang trực tuyến' },
  disconnected: { color: '#cf222e', dot: '⨯', label: 'Mất kết nối' },
  'offline-cached': { color: '#6e7781', dot: '○', label: 'Lưu cục bộ (offline)' },
}

export function ConnectionStatus({ connection }: Props) {
  const { color, dot, label } = STYLES[connection]
  return (
    <span style={{ marginLeft: 'auto', fontSize: 12, color, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <span aria-hidden>{dot}</span>
      <span>{label}</span>
    </span>
  )
}
