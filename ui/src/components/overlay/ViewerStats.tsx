import { useStreamStore } from '@/store/streamStore'

const dotColor: Record<string, string> = {
  connected: 'bg-emerald-400',
  connecting: 'bg-amber-400',
  reconnecting: 'bg-amber-400',
  disconnected: 'bg-rose-400',
}

export function ViewerStats() {
  const connection = useStreamStore(s => s.connection)
  const messages = useStreamStore(s => s.messages.length)
  const gifts = useStreamStore(s => s.gifts.length)

  return (
    <div className="flex items-center gap-4 text-sm text-(--color-overlay-fg)">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${dotColor[connection] ?? 'bg-zinc-400'}`}
        />
        <span className="capitalize text-(--color-overlay-muted)">
          {connection}
        </span>
      </div>
      <div className="text-(--color-overlay-muted)">
        msgs <span className="text-(--color-overlay-fg)">{messages}</span>
      </div>
      <div className="text-(--color-overlay-muted)">
        gifts <span className="text-(--color-overlay-fg)">{gifts}</span>
      </div>
    </div>
  )
}
