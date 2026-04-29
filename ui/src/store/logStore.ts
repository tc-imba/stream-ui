import { create } from 'zustand'
import type { UnifiedEvent } from '@/types/events'

interface LogState {
  entries: UnifiedEvent[]
  modelName: string
  totalTokens: number
  llmCallCount: number
  thinkingActiveId: string | null
  inCombat: boolean
  ingest: (e: UnifiedEvent) => void
  clear: () => void
}

const MAX_ENTRIES = 500

const VISIBLE_STS2_TYPES = new Set([
  'combat_plan',
  'transition',
  'decision',
])

const STATS_STS2_TYPES = new Set([
  'llm_call',
  'llm_request_end',
  'postrun_llm_call',
  'evolution_round',
])

// Decision action names that are suppressed from the visible log because they
// are turn-by-turn combat actions and would flood the panel. Other action
// types (map choices, shop picks, event responses, etc.) still render even
// while combat is active.
const HIDDEN_DECISION_ACTIONS = new Set([
  'play_card',
  'end_turn',
  'use_potion',
])

const numField = (meta: Record<string, unknown>, key: string): number => {
  const v = meta[key]
  return typeof v === 'number' ? v : 0
}

const pushBounded = (entries: UnifiedEvent[], next: UnifiedEvent): UnifiedEvent[] => {
  const updated = entries.concat(next)
  if (updated.length > MAX_ENTRIES) {
    updated.splice(0, updated.length - MAX_ENTRIES)
  }
  return updated
}

export const useLogStore = create<LogState>(set => ({
  entries: [],
  modelName: '',
  totalTokens: 0,
  llmCallCount: 0,
  thinkingActiveId: null,
  inCombat: false,

  ingest: e =>
    set(s => {
      if (e.source === 'sts2agent') {
        const meta = e.meta ?? {}
        const type = (meta.eventType as string | undefined) ?? ''

        let stats: Partial<LogState> = {}
        if (STATS_STS2_TYPES.has(type)) {
          const total = numField(meta, 'tokens')
          const tokens = total > 0
            ? total
            : numField(meta, 'input_tokens') + numField(meta, 'output_tokens')
          const model = typeof meta.model === 'string' ? meta.model : ''
          stats = {
            modelName: model || s.modelName,
            totalTokens: s.totalTokens + tokens,
            llmCallCount: s.llmCallCount + 1,
          }
        }

        if (type === 'tool_preprocessing') {
          if (s.thinkingActiveId) {
            return { ...s, ...stats }
          }
          const thinkingEntry: UnifiedEvent = {
            id: `thinking-${e.id}`,
            source: 'sts2agent',
            kind: 'thinking',
            level: 'info',
            meta: {
              eventType: 'thinking',
              startedAt: e.timestamp,
            },
            timestamp: e.timestamp,
          }
          return {
            ...s,
            ...stats,
            entries: pushBounded(s.entries, thinkingEntry),
            thinkingActiveId: thinkingEntry.id,
          }
        }

        if (type === 'llm_request_start') {
          const id = s.thinkingActiveId
          const model = typeof meta.model === 'string' ? meta.model : ''
          if (id && model) {
            const entries = s.entries.map(en =>
              en.id === id
                ? { ...en, meta: { ...(en.meta ?? {}), model } }
                : en,
            )
            return { ...s, ...stats, entries }
          }
          return { ...s, ...stats }
        }

        if (type === 'llm_request_end' || type === 'llm_call') {
          const id = s.thinkingActiveId
          if (!id) {
            return { ...s, ...stats }
          }
          const status =
            typeof meta.status === 'string' ? meta.status : 'ok'
          const errorMsg =
            typeof meta.error === 'string' ? meta.error : ''
          const isError = status !== 'ok' || !!errorMsg

          if (isError) {
            const entries = s.entries.map(en => {
              if (en.id !== id) return en
              const prev = (en.meta?.errors as
                | Array<{ message: string; at: number }>
                | undefined) ?? []
              return {
                ...en,
                meta: {
                  ...(en.meta ?? {}),
                  // startedAt stays unchanged — the elapsed timer continues
                  // accumulating across retries so total cost is preserved.
                  errors: [
                    ...prev,
                    {
                      message: errorMsg || `status=${status}`,
                      at: e.timestamp,
                    },
                  ],
                },
              }
            })
            return { ...s, ...stats, entries }
          }

          const entries = s.entries.map(en => {
            if (en.id !== id) return en
            const startedAt =
              typeof en.meta?.startedAt === 'number' ? en.meta.startedAt : e.timestamp
            return {
              ...en,
              meta: {
                ...(en.meta ?? {}),
                endedAt: e.timestamp,
                durationMs: e.timestamp - startedAt,
              },
            }
          })
          return { ...s, ...stats, entries, thinkingActiveId: null }
        }

        let inCombat = s.inCombat
        if (type === 'transition') {
          const transType =
            typeof meta.type === 'string' ? meta.type : ''
          if (transType === 'combat_start') inCombat = true
          else if (transType === 'combat_end') inCombat = false
        }
        // A combat_plan event is itself proof we're in combat — promote to true
        // even if we missed the combat_start transition (e.g. on agent restart
        // mid-combat, or if the transition emit was dropped).
        if (type === 'combat_plan') {
          inCombat = true
        }

        if (!VISIBLE_STS2_TYPES.has(type)) {
          return { ...s, ...stats, inCombat }
        }

        if (type === 'decision') {
          const actionDict = meta.action
          let actionName = ''
          if (actionDict && typeof actionDict === 'object') {
            const a = (actionDict as Record<string, unknown>).action
            if (typeof a === 'string') actionName = a
          }
          if (HIDDEN_DECISION_ACTIONS.has(actionName)) {
            return { ...s, ...stats, inCombat }
          }
          const reasoning =
            typeof meta.reasoning === 'string' ? meta.reasoning : ''
          if (!reasoning) {
            return { ...s, ...stats, inCombat }
          }
          for (let i = s.entries.length - 1; i >= 0; i--) {
            const prev = s.entries[i]
            if (
              prev?.source === 'sts2agent' &&
              prev.meta?.eventType === 'decision'
            ) {
              if (prev.meta?.reasoning === reasoning) {
                return { ...s, ...stats, inCombat }
              }
              break
            }
          }
        }

        return {
          ...s,
          ...stats,
          inCombat,
          entries: pushBounded(s.entries, e),
        }
      }

      return { ...s, entries: pushBounded(s.entries, e) }
    }),

  clear: () =>
    set({
      entries: [],
      modelName: '',
      totalTokens: 0,
      llmCallCount: 0,
      thinkingActiveId: null,
      inCombat: false,
    }),
}))
