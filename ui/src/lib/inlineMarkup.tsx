import type { ReactNode } from 'react'

const TAG_RE = /\[(e|c|r|k)\]([\s\S]*?)\[\/\1\]/g

/**
 * Tag → tailwind class. For cards (`c`), color depends on whether the name
 * ends with `+` (upgraded → green, otherwise → amber). Relics (`r`) all
 * share one color, distinct from cards.
 */
const tagClass = (tag: string, content: string): string => {
  switch (tag) {
    case 'e':
      return 'text-red-400 font-semibold'
    case 'k':
      return 'text-cyan-300 font-semibold'
    case 'r':
      return 'text-teal-300 font-semibold'
    case 'c':
      return content.endsWith('+')
        ? 'text-emerald-300 font-semibold'
        : 'text-amber-200 font-semibold'
    default:
      return ''
  }
}

/**
 * Parse text containing inline `[e]…[/e]`, `[c]…[/c]`, and `[k]…[/k]`
 * markup tags into a flat array of React nodes. Plain text segments pass
 * through unchanged; tagged spans are wrapped in colored `<span>`s.
 */
export function renderMarkup(text: string | undefined | null): ReactNode {
  if (!text) return text ?? null
  if (!text.includes('[')) return text

  const out: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  TAG_RE.lastIndex = 0

  for (let m = TAG_RE.exec(text); m !== null; m = TAG_RE.exec(text)) {
    if (m.index > lastIndex) {
      out.push(text.slice(lastIndex, m.index))
    }
    const content = m[2] ?? ''
    out.push(
      <span key={key++} className={tagClass(m[1]!, content)}>
        {content}
      </span>,
    )
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex))
  }
  return out
}

/**
 * Split text on newlines (one or more), render each paragraph through
 * `renderMarkup`, and stack with `space-y-3` between paragraphs.
 *
 * Returns plain text passthrough when there are no newlines, so
 * single-line bodies don't pay the wrapper cost.
 */
export function renderParagraphs(
  text: string | undefined | null,
): ReactNode {
  if (!text) return text ?? null
  const parts = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
  if (parts.length <= 1) return renderMarkup(text)
  return (
    <div className="space-y-3">
      {parts.map((p, i) => (
        <div key={i}>{renderMarkup(p)}</div>
      ))}
    </div>
  )
}
