import { create } from 'zustand'
import type { UnifiedEvent } from '@/types/events'

interface LogState {
  entries: UnifiedEvent[]
  modelName: string
  totalTokens: number
  llmCallCount: number
  thinkingActiveId: string | null
  lastThinkingId: string | null
  inCombat: boolean
  lastFloor: number
  lastCombatTurn: number | null
  ingest: (e: UnifiedEvent) => void
  clear: () => void
}

const MAX_ENTRIES = 500

const STATS_STS2_TYPES = new Set([
  'llm_call',
  'llm_request_end',
  'postrun_llm_call',
  'evolution_round',
])

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

const patchEntry = (
  entries: UnifiedEvent[],
  id: string,
  updater: (en: UnifiedEvent) => UnifiedEvent,
): UnifiedEvent[] => entries.map(en => en.id === id ? updater(en) : en)

export const useLogStore = create<LogState>(set => ({
  entries: [],
  modelName: '',
  totalTokens: 0,
  llmCallCount: 0,
  thinkingActiveId: null,
  lastThinkingId: null,
  inCombat: false,
  lastFloor: 0,
  lastCombatTurn: null,

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

        // Track floor + combat turn from `state` events so we can snapshot
        // them onto the next thinking entry. The agent can also include
        // these directly on tool_preprocessing — we prefer those if present.
        if (type === 'state') {
          const floor = numField(meta, 'floor')
          const combat = meta.combat as Record<string, unknown> | null | undefined
          const turn =
            combat && typeof combat.round === 'number' ? combat.round : null
          return {
            ...s,
            ...stats,
            lastFloor: floor || s.lastFloor,
            lastCombatTurn: turn,
          }
        }

        if (type === 'tool_preprocessing') {
          // If a thinking entry is still "active" (no llm_request_end received),
          // close it before creating the next one so it doesn't get stuck forever.
          let entries = s.entries
          if (s.thinkingActiveId) {
            entries = patchEntry(entries, s.thinkingActiveId, en => ({
              ...en,
              meta: {
                ...(en.meta ?? {}),
                endedAt: e.timestamp,
                durationMs:
                  e.timestamp -
                  (typeof en.meta?.startedAt === 'number'
                    ? en.meta.startedAt
                    : e.timestamp),
              },
            }))
          }
          const evFloor =
            typeof meta.floor === 'number' ? meta.floor : null
          const evTurn =
            typeof meta.combat_round === 'number' ? meta.combat_round : null
          const thinkingEntry: UnifiedEvent = {
            id: `thinking-${e.id}`,
            source: 'sts2agent',
            kind: 'thinking',
            level: 'info',
            meta: {
              eventType: 'thinking',
              startedAt: e.timestamp,
              floor: evFloor ?? s.lastFloor,
              combatTurn: evTurn ?? s.lastCombatTurn,
            },
            timestamp: e.timestamp,
          }
          return {
            ...s,
            ...stats,
            entries: pushBounded(entries, thinkingEntry),
            thinkingActiveId: thinkingEntry.id,
            lastThinkingId: thinkingEntry.id,
          }
        }

        if (type === 'llm_request_start') {
          const id = s.thinkingActiveId
          const model = typeof meta.model === 'string' ? meta.model : ''
          if (id && model) {
            const entries = patchEntry(s.entries, id, en => ({
              ...en,
              meta: { ...(en.meta ?? {}), model },
            }))
            return { ...s, ...stats, entries }
          }
          return { ...s, ...stats }
        }

        if (type === 'llm_request_end' || type === 'llm_call') {
          const id = s.thinkingActiveId
          if (!id) {
            return { ...s, ...stats }
          }
          const status = typeof meta.status === 'string' ? meta.status : 'ok'
          const errorMsg = typeof meta.error === 'string' ? meta.error : ''
          const isError = status !== 'ok' || !!errorMsg

          if (isError) {
            const entries = patchEntry(s.entries, id, en => {
              const prev = (en.meta?.errors as
                | Array<{ message: string; at: number }>
                | undefined) ?? []
              return {
                ...en,
                meta: {
                  ...(en.meta ?? {}),
                  errors: [
                    ...prev,
                    { message: errorMsg || `status=${status}`, at: e.timestamp },
                  ],
                },
              }
            })
            return { ...s, ...stats, entries }
          }

          const entries = patchEntry(s.entries, id, en => {
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

        // Track combat state
        let inCombat = s.inCombat
        if (type === 'transition') {
          const transType = typeof meta.type === 'string' ? meta.type : ''
          if (transType === 'combat_start') inCombat = true
          else if (transType === 'combat_end') inCombat = false
        }
        if (type === 'combat_plan') inCombat = true

        // Merge transition / decision / combat_plan into the last thinking entry
        const lastId = s.lastThinkingId

        if (type === 'transition') {
          if (!lastId) return { ...s, inCombat }
          const entries = patchEntry(s.entries, lastId, en => {
            const prev =
              (en.meta?.transitions as Array<Record<string, unknown>> | undefined) ?? []
            return {
              ...en,
              meta: { ...(en.meta ?? {}), transitions: [...prev, meta] },
            }
          })
          return { ...s, inCombat, entries }
        }

        if (type === 'decision') {
          const actionDict = meta.action
          let actionName = ''
          if (actionDict && typeof actionDict === 'object') {
            const a = (actionDict as Record<string, unknown>).action
            if (typeof a === 'string') actionName = a
          }
          if (HIDDEN_DECISION_ACTIONS.has(actionName)) return { ...s, inCombat }
          const reasoning = typeof meta.reasoning === 'string' ? meta.reasoning : ''
          if (!reasoning) return { ...s, inCombat }
          if (!lastId) return { ...s, inCombat }
          const entries = patchEntry(s.entries, lastId, en => {
            const prev =
              (en.meta?.decisions as Array<Record<string, unknown>> | undefined) ?? []
            // Skip if the most recent decision has identical reasoning
            const last = prev[prev.length - 1]
            if (last && (last as Record<string, unknown>).reasoning === reasoning) {
              return en
            }
            return {
              ...en,
              meta: { ...(en.meta ?? {}), decisions: [...prev, meta] },
            }
          })
          return { ...s, inCombat, entries }
        }

        if (type === 'combat_plan') {
          if (!lastId) return { ...s, inCombat }
          const entries = patchEntry(s.entries, lastId, en => ({
            ...en,
            meta: { ...(en.meta ?? {}), combatPlan: meta },
          }))
          return { ...s, inCombat, entries }
        }

        return { ...s, ...stats, inCombat }
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
      lastThinkingId: null,
      inCombat: false,
      lastFloor: 0,
      lastCombatTurn: null,
    }),
}))
