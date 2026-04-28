import { useEffect, useRef, useState } from 'react'
import { useStreamStore } from '@/store/streamStore'
import { DanmakuItem } from '@/components/overlay/DanmakuItem'

const formatTime = (ts: number) => {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const ROOM_ID = import.meta.env.VITE_BILIBILI_ROOM_ID

export function ChatStrip() {
  const messages = useStreamStore(s => s.messages)
  const connection = useStreamStore(s => s.connection)
  const giftCount = useStreamStore(s => s.gifts.length)
  const [now, setNow] = useState(Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const dot =
    connection === 'connected'
      ? 'bg-emerald-400'
      : connection === 'connecting' || connection === 'reconnecting'
        ? 'bg-amber-400'
        : 'bg-rose-400'

  return (
    <div className="h-full w-full flex flex-col bg-black/45 backdrop-blur-md border-t border-white/10">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/10 text-xs text-white/70">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
            <span className="capitalize text-white/60">{connection}</span>
          </div>
          <span className="text-white/35">
            msgs <span className="text-white/85 tabular-nums">{messages.length}</span>
          </span>
          <span className="text-white/35">
            gifts <span className="text-white/85 tabular-nums">{giftCount}</span>
          </span>
          {ROOM_ID && (
            <span className="text-white/35">
              room <span className="text-white/85 tabular-nums">{ROOM_ID}</span>
            </span>
          )}
        </div>
        <span className="font-mono tabular-nums text-white/70">
          {formatTime(now)}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-end gap-1 px-3 py-2">
        {messages.map(m => (
          <DanmakuItem key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
