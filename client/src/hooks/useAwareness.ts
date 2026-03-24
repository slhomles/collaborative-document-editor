import { useEffect, useState } from 'react'
import { WebsocketProvider } from 'y-websocket'

export interface AwarenessUser {
  clientId: number
  name: string
  color: string
}

export function useAwareness(provider: WebsocketProvider | null) {
  const [users, setUsers] = useState<AwarenessUser[]>([])
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!provider) return

    function updateUsers() {
      const states = Array.from(provider!.awareness.getStates().entries())
      const list: AwarenessUser[] = states
        .filter(([, state]) => state.user)
        .map(([clientId, state]) => ({ clientId, ...state.user }))
      setUsers(list)
    }

    function handleStatus({ status }: { status: string }) {
      setIsOnline(status === 'connected')
    }

    provider.awareness.on('change', updateUsers)
    provider.on('status', handleStatus)
    updateUsers()

    return () => {
      provider.awareness.off('change', updateUsers)
      provider.off('status', handleStatus)
    }
  }, [provider])

  return { users, isOnline }
}
