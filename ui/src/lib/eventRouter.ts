import { useStreamStore } from '@/store/streamStore'
import { useLogStore } from '@/store/logStore'
import type { UnifiedEvent } from '@/types/events'

export function route(e: UnifiedEvent) {
  switch (e.kind) {
    case 'chat': {
      useStreamStore.getState().ingestMessage({
        username: e.user?.name,
        message: e.message,
        timestamp: e.timestamp,
        uid: e.user?.uid,
        color: e.user?.color,
      })
      return
    }
    case 'gift': {
      useStreamStore.getState().ingestGift({
        username: e.user?.name,
        giftName: (e.meta?.giftName as string | undefined) ?? e.message ?? 'gift',
        giftCount: (e.meta?.giftCount as number | undefined) ?? 1,
        timestamp: e.timestamp,
      })
      return
    }
    default: {
      useLogStore.getState().ingest(e)
    }
  }
}
