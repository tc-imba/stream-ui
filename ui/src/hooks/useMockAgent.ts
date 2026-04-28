import { useEffect } from 'react'
import { route } from '@/lib/eventRouter'
import { makeEventId } from '@/types/events'
import { isMockEnabled } from './useMockEvents'

const THOUGHTS = [
  'evaluating recent danmaku for sentiment cues',
  'considering whether to acknowledge @user',
  'recalling earlier topic about live2d setup',
  'queuing TTS for response: "thanks for the gift"',
  'tool_call: search_memory("user prefs")',
  'tool_call: get_stream_topic()',
  'cooling down — last response was 12s ago',
  'detected gift burst, prioritizing thank-you',
  'rate-limiting to avoid talking over chat',
  'sampling next utterance from persona profile',
  'reading viewer count delta',
  'pondering the meaning of 草',
]

const STATES: Array<'idle' | 'listening' | 'thinking' | 'responding' | 'tool'> = [
  'listening', 'thinking', 'responding', 'tool', 'idle',
]

const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!

const rand = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min))

export function useMockAgent() {
  useEffect(() => {
    if (!isMockEnabled) return

    let stopped = false

    const tick = () => {
      if (stopped) return

      if (Math.random() < 0.25) {
        route({
          id: makeEventId(),
          source: 'agent',
          kind: 'state',
          message: pick(STATES),
          timestamp: Date.now(),
        })
      } else {
        route({
          id: makeEventId(),
          source: 'agent',
          kind: 'thinking',
          level: 'info',
          message: pick(THOUGHTS),
          timestamp: Date.now(),
        })
      }

      window.setTimeout(tick, rand(1500, 5000))
    }

    const start = window.setTimeout(tick, 600)
    return () => {
      stopped = true
      window.clearTimeout(start)
    }
  }, [])
}
