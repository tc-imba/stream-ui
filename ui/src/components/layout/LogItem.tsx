import type { UnifiedEvent, EventLevel } from '@/types/events'
import { formatTime } from '@/lib/formatters'
import {
  STS2_EVENT_COLORS,
  STS2_EVENT_LABELS,
  renderSts2Summary,
} from '@/lib/sts2EventFormat'

const NON_STS2_TONE: Record<string, string> = {
  agent: '#a78bfa',
  stt: '#7dd3fc',
  tts: '#34d399',
  tools: '#fbbf24',
  memory: '#e879f9',
  persona: '#fb7185',
  router: '#22d3ee',
  safety: '#fb923c',
  bilibili: '#f472b6',
  douyin: '#fb7185',
}

const levelDot: Record<EventLevel, string> = {
  debug: 'bg-zinc-500',
  info: 'bg-sky-400',
  warn: 'bg-amber-400',
  error: 'bg-rose-400',
}

const isSts2 = (e: UnifiedEvent) => e.source === 'sts2agent'

const eventTypeOf = (e: UnifiedEvent): string =>
  isSts2(e)
    ? ((e.meta?.eventType as string | undefined) ?? 'unknown')
    : e.source

const labelOf = (e: UnifiedEvent): string => {
  const t = eventTypeOf(e)
  return isSts2(e)
    ? (STS2_EVENT_LABELS[t] ?? t.toUpperCase().replace(/_/g, ' '))
    : e.source
}

const colorOf = (e: UnifiedEvent): string => {
  const t = eventTypeOf(e)
  return isSts2(e)
    ? (STS2_EVENT_COLORS[t] ?? '#94a3b8')
    : (NON_STS2_TONE[e.source] ?? '#94a3b8')
}

export const groupKey = (e: UnifiedEvent): string =>
  isSts2(e) ? `sts2:${eventTypeOf(e)}` : `src:${e.source}`

interface HeaderProps {
  entry: UnifiedEvent
  count?: number
}

export function LogHeader({ entry, count }: HeaderProps) {
  const label = labelOf(entry)
  const color = colorOf(entry)
  const dot = entry.level ? levelDot[entry.level] : null

  const isThinking =
    isSts2(entry) && eventTypeOf(entry) === 'thinking'
  const thinkingActive = isThinking && entry.meta?.endedAt == null
  const hideLabel = isThinking && !thinkingActive

  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="font-mono text-white/35 tabular-nums">
        {formatTime(entry.timestamp)}
      </span>
      {!hideLabel && (
        <span
          className="font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-[12px]"
          style={{ color, backgroundColor: `${color}1f` }}
        >
          {label}
        </span>
      )}
      {count && count > 1 && (
        <span className="text-white/50 tabular-nums text-[12px]">
          ×{count}
        </span>
      )}
      {thinkingActive ? (
        <span
          className="ml-auto inline-block w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"
          aria-label="thinking"
        />
      ) : (
        dot && (
          <span
            className={`ml-auto inline-block w-1.5 h-1.5 rounded-full ${dot}`}
          />
        )
      )}
    </div>
  )
}

interface BodyProps {
  entry: UnifiedEvent
}

export function LogBody({ entry }: BodyProps) {
  return (
    <div className="text-[14px] leading-snug break-words">
      {isSts2(entry) ? (
        renderSts2Summary(eventTypeOf(entry), entry.meta ?? {})
      ) : (
        <span className="text-white/80">{entry.message}</span>
      )}
    </div>
  )
}
