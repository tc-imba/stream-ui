import type { StoredMessage } from '@/store/streamStore'
import { useSettingsStore } from '@/store/settingsStore'

interface Props {
  message: StoredMessage
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

export function DanmakuItem({ message }: Props) {
  const showTimestamps = useSettingsStore(s => s.showTimestamps)

  return (
    <div className="flex items-baseline gap-2 px-3 py-1.5 rounded-lg bg-(--color-overlay-bg) backdrop-blur-md text-(--color-overlay-fg) max-w-full">
      {showTimestamps && (
        <span className="text-xs text-(--color-overlay-muted) tabular-nums shrink-0">
          {formatTime(message.timestamp)}
        </span>
      )}
      <span
        className="font-semibold shrink-0"
        style={{ color: message.color ?? 'var(--color-accent)' }}
      >
        {message.username}
      </span>
      <span className="break-words break-all min-w-0">{message.message}</span>
    </div>
  )
}
