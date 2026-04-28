import { useEffect, useMemo, useRef } from 'react'
import { useLogStore } from '@/store/logStore'
import { formatTokens, shortModel } from '@/lib/formatters'
import { LogHeader, LogBody, groupKey } from './LogItem'
import type { UnifiedEvent } from '@/types/events'

const groupEntries = (entries: UnifiedEvent[]): UnifiedEvent[][] => {
  const groups: UnifiedEvent[][] = []
  for (const e of entries) {
    const last = groups[groups.length - 1]
    if (last && groupKey(last[0]!) === groupKey(e)) {
      last.push(e)
    } else {
      groups.push([e])
    }
  }
  return groups
}

export function LogPanel() {
  const entries = useLogStore(s => s.entries)
  const modelName = useLogStore(s => s.modelName)
  const totalTokens = useLogStore(s => s.totalTokens)
  const callCount = useLogStore(s => s.llmCallCount)
  const groups = useMemo(
    () => groupEntries(entries).reverse().map(g => [...g].reverse()),
    [entries],
  )
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
          const head = group[0]!
          return (
            <div
              key={head.id}
              className="px-3 py-1.5 hover:bg-white/[0.03] transition-colors"
            >
              <LogHeader entry={head} count={group.length} />
              <div className="mt-0.5 space-y-1">
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
