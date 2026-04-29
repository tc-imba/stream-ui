import { useEffect, useMemo, useRef } from 'react'
import { useLogStore } from '@/store/logStore'
import { formatTokens, shortModel } from '@/lib/formatters'
import { LogHeader, LogBody, groupKey } from './LogItem'
import type { UnifiedEvent } from '@/types/events'

// Cycle = one agent-action unit: transition → thinking → decision/plan.
// Consecutive events of these types collapse into a single visual row whose
// content morphs based on the current stage (thinking vs result).
const CYCLE_TYPES = new Set([
  'transition',
  'thinking',
  'decision',
  'combat_plan',
])

const isCycleEvent = (e: UnifiedEvent): boolean => {
  if (e.source !== 'sts2agent') return false
  const t = e.meta?.eventType
  return typeof t === 'string' && CYCLE_TYPES.has(t)
}

const groupEntries = (entries: UnifiedEvent[]): UnifiedEvent[][] => {
  const groups: UnifiedEvent[][] = []
  let cycle: UnifiedEvent[] | null = null

  const flushCycle = () => {
    if (cycle && cycle.length > 0) groups.push(cycle)
    cycle = null
  }

  for (const e of entries) {
    if (!isCycleEvent(e)) {
      flushCycle()
      const last = groups[groups.length - 1]
      if (last && last.length > 0 && !isCycleEvent(last[0]!) && groupKey(last[0]!) === groupKey(e)) {
        last.push(e)
      } else {
        groups.push([e])
      }
      continue
    }

    const t = e.meta?.eventType as string

    if (t === 'transition') {
      // Append to current cycle as long as it's still gathering transitions
      // (no thinking / decision / plan yet). Once a thinking or result lands
      // in the cycle, a fresh transition opens a new one.
      if (
        cycle &&
        cycle.every(x => x.meta?.eventType === 'transition')
      ) {
        cycle.push(e)
      } else {
        flushCycle()
        cycle = [e]
      }
    } else if (t === 'thinking') {
      if (!cycle) cycle = []
      cycle.push(e)
    } else {
      // decision or combat_plan: append to current cycle and close it
      if (!cycle) cycle = []
      cycle.push(e)
      flushCycle()
    }
  }
  flushCycle()
  return groups
}

const cycleRepresentative = (group: UnifiedEvent[]): UnifiedEvent => {
  // Active thinking → show the thinking entry (with spinner)
  const activeThinking = group.find(
    e =>
      e.source === 'sts2agent' &&
      e.meta?.eventType === 'thinking' &&
      e.meta?.endedAt == null,
  )
  if (activeThinking) return activeThinking

  // Decision or plan → show the result
  const decision = group.find(e => e.meta?.eventType === 'decision')
  if (decision) return decision
  const plan = group.find(e => e.meta?.eventType === 'combat_plan')
  if (plan) return plan

  // Otherwise show the most recent transition (or whatever's in the group)
  const transition = [...group]
    .reverse()
    .find(e => e.meta?.eventType === 'transition')
  if (transition) return transition

  return group[group.length - 1]!
}

export function LogPanel() {
  const entries = useLogStore(s => s.entries)
  const modelName = useLogStore(s => s.modelName)
  const totalTokens = useLogStore(s => s.totalTokens)
  const callCount = useLogStore(s => s.llmCallCount)
  const groups = useMemo(() => groupEntries(entries).reverse(), [entries])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [entries])

  return (
    <div className="h-full w-full flex flex-col bg-black/45 backdrop-blur-md border-l border-white/10">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 gap-3">
        <div className="min-w-0 flex-1">
          {modelName ? (
            <span
              className="font-mono text-sm text-blue-300 truncate block"
              title={modelName}
            >
              {shortModel(modelName)}
            </span>
          ) : (
            <span className="text-sm text-white/35">no llm yet</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          <span className="tabular-nums text-white/80">
            {formatTokens(totalTokens)}
            <span className="text-white/40"> tok</span>
          </span>
          {callCount > 0 && (
            <>
              <span className="text-white/30">·</span>
              <span className="tabular-nums text-white/55">
                {callCount} calls
              </span>
            </>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-1">
        {groups.map(group => {
          const isCycle = isCycleEvent(group[0]!)
          // Header: cycle groups use a stage-aware representative; non-cycle
          // groups use the latest entry so the title timestamp stays fresh.
          // Body order: chronological (oldest → newest within the group).
          const head = isCycle
            ? cycleRepresentative(group)
            : group[group.length - 1]!
          return (
            <div
              key={head.id}
              className="px-3 py-1.5 hover:bg-white/[0.03] transition-colors"
            >
              <LogHeader
                entry={head}
                count={isCycle ? undefined : group.length}
              />
              <div className="mt-0.5 flex flex-col gap-3">
                {group.map(e => (
                  <LogBody key={e.id} entry={e} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
