import { useEffect } from 'react'
import { route } from '@/lib/eventRouter'
import { makeEventId, type EventLevel } from '@/types/events'
import { isMockEnabled } from './useMockEvents'

interface LogTemplate {
  source: string
  level: EventLevel
  message: string
}

const TEMPLATES: LogTemplate[] = [
  { source: 'stt', level: 'info', message: 'transcribed segment (2.1s) — “大家好”' },
  { source: 'stt', level: 'info', message: 'silence detected, flushing buffer' },
  { source: 'stt', level: 'warn', message: 'low confidence on last word' },
  { source: 'tts', level: 'info', message: 'synth queued (124 chars)' },
  { source: 'tts', level: 'info', message: 'playback finished (3.4s)' },
  { source: 'tools', level: 'info', message: 'search_memory → 3 hits' },
  { source: 'tools', level: 'info', message: 'get_stream_topic → "vue-vs-react"' },
  { source: 'tools', level: 'error', message: 'fetch_emote_pack timeout' },
  { source: 'memory', level: 'info', message: 'wrote turn #142 to long-term store' },
  { source: 'persona', level: 'debug', message: 'mood vector shifted +0.2 cheerful' },
  { source: 'router', level: 'info', message: 'directed gift to thank-you handler' },
  { source: 'safety', level: 'warn', message: 'filtered 1 message in last window' },
]

const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!

const rand = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min))

export function useMockLogs() {
  useEffect(() => {
    if (!isMockEnabled) return

    let stopped = false

    const tick = () => {
      if (stopped) return
      const t = pick(TEMPLATES)
      route({
        id: makeEventId(),
        source: t.source,
        kind: 'log',
        level: t.level,
        message: t.message,
        timestamp: Date.now(),
      })
      window.setTimeout(tick, rand(800, 4500))
    }

    const start = window.setTimeout(tick, 1200)
    return () => {
      stopped = true
      window.clearTimeout(start)
    }
  }, [])
}
