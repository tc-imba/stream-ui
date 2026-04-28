import { useEffect } from 'react'
import { route } from '@/lib/eventRouter'
import { useLogStore } from '@/store/logStore'
import { makeEventId, type EventLevel, type UnifiedEvent } from '@/types/events'
import { isMockEnabled } from './useMockEvents'

const STS2_WS_URL =
  import.meta.env.VITE_STS2_WS_URL ?? 'ws://localhost:8081/ws/events'

interface STS2MonitorEvent {
  id?: string
  timestamp?: number
  type?: string
  data?: Record<string, unknown>
  step?: number
  run_id?: string
}

interface TypeMapping {
  kind: string
  level?: EventLevel
}

const TYPE_MAP: Record<string, TypeMapping> = {
  run_start: { kind: 'state', level: 'info' },
  run_end: { kind: 'state', level: 'info' },
  state: { kind: 'log', level: 'debug' },
  transition: { kind: 'log', level: 'info' },
  decision: { kind: 'thinking', level: 'info' },
  llm_call: { kind: 'thinking', level: 'info' },
  tool_call: { kind: 'log', level: 'info' },
  tool_result: { kind: 'log', level: 'info' },
  error: { kind: 'log', level: 'error' },
  perf: { kind: 'log', level: 'debug' },
}

const DEFAULT_MAPPING: TypeMapping = { kind: 'log', level: 'info' }

const stringField = (
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): string | undefined => {
  if (!obj) return undefined
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

const extractMessage = (e: STS2MonitorEvent): string => {
  const d = e.data
  return (
    stringField(d, 'message', 'text', 'reasoning', 'summary', 'tool_name', 'state_type') ??
    e.type ??
    'event'
  )
}

const transform = (e: STS2MonitorEvent): UnifiedEvent => {
  const mapping = TYPE_MAP[e.type ?? ''] ?? DEFAULT_MAPPING
  const tsRaw = e.timestamp ?? Date.now() / 1000
  const tsMillis = tsRaw < 1e12 ? tsRaw * 1000 : tsRaw

  return {
    id: e.id ?? makeEventId(),
    source: 'sts2agent',
    kind: mapping.kind,
    level: mapping.level,
    message: extractMessage(e),
    meta: {
      eventType: e.type,
      step: e.step,
      runId: e.run_id,
      ...(e.data ?? {}),
    },
    timestamp: tsMillis,
  }
}

class STS2Client {
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private attempts = 0
  private destroyed = false

  constructor(
    private readonly url: string,
    private readonly onEvent: (e: STS2MonitorEvent) => void,
  ) {}

  connect() {
    if (this.destroyed) return

    let ws: WebSocket
    try {
      ws = new WebSocket(this.url)
    } catch (err) {
      console.error('[sts2] failed to construct WebSocket', err)
      this.scheduleReconnect()
      return
    }

    this.ws = ws

    ws.onopen = () => {
      this.attempts = 0
    }

    ws.onmessage = ev => {
      try {
        const parsed = JSON.parse(ev.data) as STS2MonitorEvent
        this.onEvent(parsed)
      } catch (err) {
        console.error('[sts2] parse error', err)
      }
    }

    ws.onerror = () => {
      // close handler will run reconnect
    }

    ws.onclose = () => {
      if (this.destroyed) return
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts, 5))
    this.attempts++
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay)
  }

  destroy() {
    this.destroyed = true
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}

export function useSTS2AgentEvents() {
  useEffect(() => {
    if (isMockEnabled) return

    const client = new STS2Client(STS2_WS_URL, raw => {
      if (raw.type === 'run_start') {
        useLogStore.getState().clear()
      }
      route(transform(raw))
    })
    client.connect()

    return () => client.destroy()
  }, [])
}
