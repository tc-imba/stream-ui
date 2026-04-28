import { useEffect } from 'react'
import { LaplaceEventBridgeClient } from '@laplace.live/event-bridge-sdk'
import { useStreamStore, type ConnectionState } from '@/store/streamStore'
import { isMockEnabled } from './useMockEvents'
import { route } from '@/lib/eventRouter'
import { makeEventId } from '@/types/events'

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL ?? 'ws://localhost:9696'
const BRIDGE_TOKEN = import.meta.env.VITE_BRIDGE_TOKEN ?? ''

export function useLaplaceEvents() {
  const setConnection = useStreamStore(s => s.setConnection)
  const setClientId = useStreamStore(s => s.setClientId)

  useEffect(() => {
    if (isMockEnabled) return

    const client = new LaplaceEventBridgeClient({
      url: BRIDGE_URL,
      token: BRIDGE_TOKEN,
      reconnect: true,
    })

    const offMessage = client.on('message', e => {
      const ev = e as {
        username?: string
        message?: string
        timestamp?: number
        uid?: string | number
      }
      route({
        id: makeEventId(),
        source: 'bilibili',
        kind: 'chat',
        message: ev.message,
        user: ev.username ? { name: ev.username, uid: ev.uid } : undefined,
        timestamp: ev.timestamp ?? Date.now(),
      })
    })

    const offGift = client.on('gift', e => {
      const ev = e as {
        username?: string
        giftName?: string
        giftCount?: number
        timestamp?: number
      }
      route({
        id: makeEventId(),
        source: 'bilibili',
        kind: 'gift',
        user: ev.username ? { name: ev.username } : undefined,
        meta: { giftName: ev.giftName, giftCount: ev.giftCount },
        timestamp: ev.timestamp ?? Date.now(),
      })
    })

    const offState = client.onConnectionStateChange(state => {
      setConnection(state as ConnectionState)
      if (state === 'connected') {
        setClientId(client.getClientId() ?? null)
      } else if (state === 'disconnected') {
        setClientId(null)
      }
    })

    client.connect().catch(err => {
      console.error('[laplace] connect failed', err)
    })

    return () => {
      offMessage()
      offGift()
      offState()
      client.disconnect()
    }
  }, [setConnection, setClientId])
}
