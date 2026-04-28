import { useEffect } from 'react'
import { useStreamStore } from '@/store/streamStore'
import { route } from '@/lib/eventRouter'
import { makeEventId } from '@/types/events'

const MOCK_ENABLED =
  import.meta.env.VITE_MOCK !== 'false' && import.meta.env.DEV

const USERNAMES = [
  '路过的观众', '老婆粉', '舰长大佬', '弹幕保安', '前排吃瓜',
  '电棍粉丝', '永雏塔菲', '今晚吃什么', '上课不听讲',
  'CodeKnight', 'MidnightOwl', 'tofu_san', 'pancake42',
  'lurkerOOO', 'first_view',
]

const MESSAGES = [
  '草', '哈哈哈哈', '666', '前排', '笑死',
  '主播好厉害', 'awsl', 'wdnmd', '泪目了',
  '这把稳了', '一眼丁真鉴定为典',
  'lol', 'first', 'pog', 'GG', 'EZ Clap',
  'hello from the chat', 'love this stream',
  '弹幕护体', '抱走主播', '今天直播到几点',
  '🔥🔥🔥', '🎉', '😂😂😂',
  '好长好长好长好长的弹幕看看会不会换行被截断处理得怎么样',
  'a really really long english message that should wrap nicely without breaking layout',
]

const GIFT_NAMES = ['小心心', '辣条', '干杯', '生日蛋糕', '摩天大楼', '嘉年华']

const COLORS = [
  '#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#f87171',
]

const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!

const rand = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min))

export function useMockEvents() {
  const setConnection = useStreamStore(s => s.setConnection)

  useEffect(() => {
    if (!MOCK_ENABLED) return

    setConnection('connected')

    let stopped = false

    const tickMessage = () => {
      if (stopped) return
      route({
        id: makeEventId(),
        source: 'bilibili',
        kind: 'chat',
        message: pick(MESSAGES),
        user: {
          name: pick(USERNAMES),
          color: Math.random() < 0.4 ? pick(COLORS) : undefined,
        },
        timestamp: Date.now(),
      })
      window.setTimeout(tickMessage, rand(200, 1800))
    }

    const tickGift = () => {
      if (stopped) return
      route({
        id: makeEventId(),
        source: 'bilibili',
        kind: 'gift',
        user: { name: pick(USERNAMES) },
        meta: {
          giftName: pick(GIFT_NAMES),
          giftCount: rand(1, 9),
        },
        timestamp: Date.now(),
      })
      window.setTimeout(tickGift, rand(6000, 18000))
    }

    const startMessage = window.setTimeout(tickMessage, 400)
    const startGift = window.setTimeout(tickGift, 3000)

    return () => {
      stopped = true
      window.clearTimeout(startMessage)
      window.clearTimeout(startGift)
      setConnection('disconnected')
    }
  }, [setConnection])
}

export const isMockEnabled = MOCK_ENABLED
