export const formatTime = (ms: number): string => {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const formatLatency = (ms: number): string => {
  if (!Number.isFinite(ms)) return '?'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export const formatTokens = (n: number): string => {
  if (!Number.isFinite(n)) return '?'
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

export const truncate = (s: string, max: number): string => {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

export const shortModel = (model: string): string => {
  if (!model) return 'unknown'
  return model.split('-').slice(0, 2).join('-')
}
