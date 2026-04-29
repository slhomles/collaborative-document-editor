import { useEffect, useState } from 'react'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface AwarenessUser {
  clientId: number
  name: string
  color: string
}

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'offline-cached'

export function useAwareness(
  provider: WebsocketProvider | null,
  indexeddbProvider: IndexeddbPersistence | null = null,
) {
  const [users, setUsers] = useState<AwarenessUser[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [indexeddbSynced, setIndexeddbSynced] = useState(false)

  useEffect(() => {
    if (!indexeddbProvider) return

    function handleSynced() {
      setIndexeddbSynced(true)
    }

    indexeddbProvider.on('synced', handleSynced)
    return () => {
      indexeddbProvider.off('synced', handleSynced)
    }
  }, [indexeddbProvider])

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
      // y-websocket phát ra: 'connecting' | 'connected' | 'disconnected'
      if (status === 'connected') setConnection('connected')
      else if (status === 'connecting') setConnection('connecting')
      else setConnection('disconnected')
    }

    provider.awareness.on('change', updateUsers)
    provider.on('status', handleStatus)
    // Sync initial state phòng trường hợp provider đã connect xong trước khi effect chạy.
    setConnection(provider.wsconnected ? 'connected' : 'connecting')
    updateUsers()

    return () => {
      provider.awareness.off('change', updateUsers)
      provider.off('status', handleStatus)
    }
  }, [provider])

  // Khi đã mất kết nối WS nhưng IndexedDB đã hydrate xong → user vẫn edit được offline.
  const effectiveConnection: ConnectionState =
    connection === 'disconnected' && indexeddbSynced ? 'offline-cached' : connection

  return { users, connection: effectiveConnection }
}
