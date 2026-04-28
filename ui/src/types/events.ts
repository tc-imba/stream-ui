export type EventLevel = 'debug' | 'info' | 'warn' | 'error'

export interface UnifiedEventUser {
  name: string
  uid?: string | number
  color?: string
}

export interface UnifiedEvent {
  id: string
  source: string
  kind: string
  level?: EventLevel
  message?: string
  user?: UnifiedEventUser
  meta?: Record<string, unknown>
  timestamp: number
}

let seq = 0
export const makeEventId = () =>
  `${Date.now().toString(36)}-${(seq++).toString(36)}`
