import { useEffect, useState } from 'react'
import { useStreamStore, type StoredGift } from '@/store/streamStore'

const VISIBLE_MS = 6000

export function GiftAlert() {
  const gifts = useStreamStore(s => s.gifts)
  const [visible, setVisible] = useState<StoredGift[]>([])

  useEffect(() => {
    if (gifts.length === 0) return
    const latest = gifts[gifts.length - 1]
    setVisible(v => [...v, latest])
    const timer = window.setTimeout(() => {
      setVisible(v => v.filter(g => g.id !== latest.id))
    }, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [gifts])

  return (
    <div className="absolute inset-x-0 top-6 flex flex-col items-center gap-3 pointer-events-none">
      {visible.map(g => (
        <div
          key={g.id}
          className="px-5 py-3 rounded-2xl bg-(--color-overlay-bg) backdrop-blur-md shadow-xl flex items-center gap-3 animate-[fade-in_0.25s_ease-out]"
        >
          <span className="text-xl">🎁</span>
          <span className="font-semibold text-(--color-accent)">
            {g.username}
          </span>
          <span className="text-(--color-overlay-fg)">
            sent <span className="text-(--color-gift)">{g.giftName}</span>
            {g.giftCount > 1 && (
              <span className="ml-1 text-(--color-overlay-muted)">
                × {g.giftCount}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
