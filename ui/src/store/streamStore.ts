import { create } from 'zustand'

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

export interface StoredMessage {
  id: string
  username: string
  message: string
  timestamp: number
  uid?: string | number
  color?: string
}

export interface StoredGift {
  id: string
  username: string
  giftName: string
  giftCount: number
  timestamp: number
}

export interface IngestMessageInput {
  username?: string
  message?: string
  timestamp?: number | string
  uid?: string | number
  color?: string
}

export interface IngestGiftInput {
  username?: string
  giftName?: string
  giftCount?: number
  timestamp?: number | string
}

interface StreamState {
  messages: StoredMessage[]
  gifts: StoredGift[]
  connection: ConnectionState
  clientId: string | null
  ingestMessage: (e: IngestMessageInput) => void
  ingestGift: (e: IngestGiftInput) => void
  setConnection: (s: ConnectionState) => void
  setClientId: (id: string | null) => void
  clear: () => void
}

const MAX_MESSAGES = 200
const MAX_GIFTS = 30

let seq = 0
const nextId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`

const toMillis = (t: number | string | undefined): number => {
  if (typeof t === 'number') return t
  if (typeof t === 'string') {
    const n = Number(t)
    if (!Number.isNaN(n)) return n
    const d = Date.parse(t)
    if (!Number.isNaN(d)) return d
  }
  return Date.now()
}

export const useStreamStore = create<StreamState>(set => ({
  messages: [],
  gifts: [],
  connection: 'disconnected',
  clientId: null,

  ingestMessage: e =>
    set(state => {
      const next = state.messages.concat({
        id: nextId(),
        username: e.username ?? 'unknown',
        message: e.message ?? '',
        timestamp: toMillis(e.timestamp),
        uid: e.uid,
        color: e.color,
      })
      if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES)
      return { messages: next }
    }),

  ingestGift: e =>
    set(state => {
      const next = state.gifts.concat({
        id: nextId(),
        username: e.username ?? 'unknown',
        giftName: e.giftName ?? 'gift',
        giftCount: e.giftCount ?? 1,
        timestamp: toMillis(e.timestamp),
      })
      if (next.length > MAX_GIFTS) next.splice(0, next.length - MAX_GIFTS)
      return { gifts: next }
    }),

  setConnection: s => set({ connection: s }),
  setClientId: id => set({ clientId: id }),
  clear: () => set({ messages: [], gifts: [] }),
}))
