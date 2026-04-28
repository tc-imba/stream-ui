import { useEffect, useRef } from 'react'
import { useStreamStore } from '@/store/streamStore'
import { useSettingsStore } from '@/store/settingsStore'
import { DanmakuItem } from './DanmakuItem'

export function DanmakuList() {
  const messages = useStreamStore(s => s.messages)
  const fontScale = useSettingsStore(s => s.fontScale)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div
      className="h-full w-full flex flex-col justify-end gap-1.5 p-3 overflow-hidden"
      style={{ fontSize: `${fontScale}rem` }}
    >
      <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto">
        {messages.map(m => (
          <DanmakuItem key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
