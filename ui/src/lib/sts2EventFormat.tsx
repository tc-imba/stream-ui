import { useEffect, useState, type ReactNode } from 'react'
import { formatLatency, formatTokens, shortModel, truncate } from './formatters'
import { renderParagraphs } from './inlineMarkup'

export const STS2_EVENT_COLORS: Record<string, string> = {
  state: '#94a3b8',
  thinking: '#3b82f6',
  llm_call: '#3b82f6',
  llm_request_start: '#60a5fa',
  llm_first_chunk: '#38bdf8',
  llm_request_end: '#2563eb',
  decision: '#a78bfa',
  transition: '#c084fc',
  game_action: '#fb923c',
  action_result: '#fdba74',
  combat_plan: '#22d3ee',
  combat_summary: '#67e8f9',
  context_assembly: '#5eead4',
  tool_call: '#a5b4fc',
  tool_preprocessing: '#5eead4',
  run_start: '#facc15',
  run_end: '#facc15',
  error: '#f87171',
  ai_summary: '#34d399',
  postrun_llm_call: '#fbbf24',
  post_run_start: '#fbbf24',
  post_run_stage: '#fcd34d',
  post_run_end: '#fbbf24',
  evolution_round: '#e879f9',
  evolution_summary: '#d946ef',
  postrun_artifact: '#a3e635',
  monitor_init: '#7dd3fc',
}

export const STS2_EVENT_LABELS: Record<string, string> = {
  state: 'STATE',
  thinking: 'THINKING',
  llm_call: 'LLM',
  llm_request_start: 'LLM START',
  llm_first_chunk: 'FIRST CHUNK',
  llm_request_end: 'LLM END',
  decision: 'DECISION',
  transition: 'TRANSITION',
  game_action: 'ACTION',
  action_result: 'RESULT',
  combat_plan: 'PLAN',
  combat_summary: 'COMBAT END',
  context_assembly: 'CONTEXT',
  tool_call: 'TOOL',
  tool_preprocessing: 'PREPROCESS',
  run_start: 'RUN START',
  run_end: 'RUN END',
  error: 'ERROR',
  ai_summary: 'AI SUMMARY',
  postrun_llm_call: 'POSTRUN LLM',
  post_run_start: 'POSTRUN START',
  post_run_stage: 'POSTRUN STAGE',
  post_run_end: 'POSTRUN END',
  evolution_round: 'EVOLUTION',
  evolution_summary: 'EVOLUTION SUMMARY',
  postrun_artifact: 'ARTIFACT',
  monitor_init: 'INIT',
}

const get = <T,>(meta: Record<string, unknown>, key: string): T | undefined =>
  meta[key] as T | undefined

const getStr = (meta: Record<string, unknown>, key: string): string =>
  typeof meta[key] === 'string' ? (meta[key] as string) : ''

const getNum = (meta: Record<string, unknown>, key: string): number => {
  const v = meta[key]
  return typeof v === 'number' ? v : 0
}

interface PartProps {
  meta: Record<string, unknown>
}

const ModelTag = ({ meta }: PartProps) => {
  const m = getStr(meta, 'model')
  if (!m) return null
  return <span className="text-blue-300 font-medium">[{shortModel(m)}]</span>
}

const Dot = () => <span className="text-white/30 px-1">·</span>

export function renderSts2Summary(
  type: string,
  meta: Record<string, unknown>,
): ReactNode {
  switch (type) {
    case 'llm_call': {
      const callType = getStr(meta, 'call_type')
      const latency = getNum(meta, 'latency_ms')
      const tokens = getNum(meta, 'tokens')
      const attempt = getNum(meta, 'attempt')
      return (
        <span className="text-white/85">
          <ModelTag meta={meta} /> {callType}
          {attempt > 1 && (
            <span className="text-amber-300"> (retry #{attempt})</span>
          )}
          <span className="text-white/45">
            <Dot /> {formatLatency(latency)} <Dot /> {formatTokens(tokens)} tok
          </span>
        </span>
      )
    }

    case 'llm_request_start': {
      const callType = getStr(meta, 'call_type')
      const stateType = getStr(meta, 'state_type')
      const round = getNum(meta, 'round_idx')
      const tools = getNum(meta, 'tool_count')
      const msgs = getNum(meta, 'message_count')
      const think = get<boolean>(meta, 'think_enabled')
      return (
        <span className="text-white/85">
          <ModelTag meta={meta} /> {callType}
          <span className="text-white/45">
            <Dot /> {stateType} <Dot /> R{round} <Dot /> {tools} tools <Dot />{' '}
            {msgs} msgs
          </span>
          {think && <span className="text-cyan-300"> · think</span>}
        </span>
      )
    }

    case 'llm_first_chunk': {
      const latency = getNum(meta, 'latency_ms')
      const chunkMeta = (meta.chunk_meta ?? {}) as Record<string, unknown>
      const transport = typeof chunkMeta.transport === 'string'
        ? chunkMeta.transport
        : ''
      return (
        <span className="text-white/85">
          <ModelTag meta={meta} /> first chunk
          <span className="text-white/45">
            <Dot /> {formatLatency(latency)}
            {transport && (
              <>
                <Dot /> {transport}
              </>
            )}
          </span>
        </span>
      )
    }

    case 'llm_request_end': {
      const status = getStr(meta, 'status')
      const latency = getNum(meta, 'latency_ms')
      const tokens = getNum(meta, 'tokens')
      const error = getStr(meta, 'error')
      const ok = status === 'ok'
      return (
        <span className="text-white/85">
          <ModelTag meta={meta} />{' '}
          <span className={ok ? 'text-emerald-400' : 'text-rose-400'}>
            {status}
          </span>
          <span className="text-white/45">
            <Dot /> {formatLatency(latency)} <Dot /> {formatTokens(tokens)} tok
          </span>
          {error && (
            <span className="text-rose-400"> · {truncate(error, 80)}</span>
          )}
        </span>
      )
    }

    case 'game_action': {
      const action = getStr(meta, 'action')
      const params = (meta.params ?? {}) as Record<string, unknown>
      const paramStr = Object.entries(params)
        .filter(([k]) => k !== 'action')
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      return (
        <span className="text-orange-300">
          {action}
          {paramStr && <span className="text-white/55">({paramStr})</span>}
        </span>
      )
    }

    case 'action_result': {
      const action = getStr(meta, 'action')
      const status = getStr(meta, 'status')
      const error = getStr(meta, 'error')
      const ok = status === 'ok'
      return (
        <span className="text-orange-200">
          {action}{' '}
          <span className={ok ? 'text-emerald-400' : 'text-rose-400'}>
            {status}
          </span>
          {error && (
            <span className="text-rose-400"> {truncate(error, 60)}</span>
          )}
        </span>
      )
    }

    case 'state': {
      const combat = (meta.combat ?? null) as Record<string, unknown> | null
      const floor = getNum(meta, 'floor')
      if (combat) {
        const player = (combat.player ?? {}) as Record<string, unknown>
        const round = (combat.round ?? 0) as number
        const energy = (player.energy ?? 0) as number
        const hp = (player.hp ?? 0) as number
        const maxHp = (player.max_hp ?? 0) as number
        const block = (player.block ?? 0) as number
        const enemiesRaw = (combat.enemies ?? []) as Array<
          Record<string, unknown>
        >
        const enemies = enemiesRaw.map(e => `${e.name}(${e.hp})`).join(', ')
        return (
          <span className="text-white/65">
            Floor {floor} <Dot /> R{round} <Dot /> E:{energy} <Dot /> HP:{hp}/
            {maxHp}
            {block > 0 && (
              <>
                <Dot /> Block:{block}
              </>
            )}
            {enemies && (
              <span className="text-white/40"> · {truncate(enemies, 60)}</span>
            )}
          </span>
        )
      }
      const summary = getStr(meta, 'summary')
      const stateType = getStr(meta, 'state_type')
      return <span className="text-white/65">{summary || stateType}</span>
    }


    case 'transition': {
      const t = getStr(meta, 'type_zh') || getStr(meta, 'type')
      const summary =
        getStr(meta, 'summary_zh') || getStr(meta, 'summary')
      const stateType =
        getStr(meta, 'state_type_zh') || getStr(meta, 'state_type')
      return (
        <span className="text-purple-300">
          {t}
          <Dot />
          {summary || stateType}
        </span>
      )
    }

    case 'combat_plan':
      return <CombatPlanBlock meta={meta} />

    case 'thinking':
      return <ThinkingBody meta={meta} />


    case 'combat_summary': {
      const enemyKey = getStr(meta, 'enemy_key')
      const won = !!meta.won
      const totalRounds = getNum(meta, 'total_rounds')
      const cards = getNum(meta, 'total_cards_played')
      const hpBefore = getNum(meta, 'hp_before')
      const hpAfter = getNum(meta, 'hp_after')
      const delta = hpAfter - hpBefore
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`
      return (
        <span className="text-cyan-200">
          {enemyKey}{' '}
          <span className={won ? 'text-emerald-400' : 'text-rose-400'}>
            {won ? 'WON' : 'LOST'}
          </span>
          <span className="text-white/45">
            <Dot /> {totalRounds}R <Dot /> {cards} cards <Dot /> HP {deltaStr}
          </span>
        </span>
      )
    }

    case 'context_assembly': {
      const stateType = getStr(meta, 'state_type')
      const memory = getStr(meta, 'memory_type')
      const knowledge = getNum(meta, 'knowledge_chars')
      const skills = !!meta.skills
      const archetype = !!meta.archetype
      const boss = !!meta.boss_strategy
      const parts: string[] = []
      if (skills) parts.push('skills')
      if (memory && memory !== 'none') parts.push(`memory(${memory})`)
      if (knowledge > 0) parts.push(`knowledge(${knowledge}c)`)
      if (archetype) parts.push('archetype')
      if (boss) parts.push('boss')
      return (
        <span className="text-teal-300">
          {stateType}
          <Dot />
          {parts.join(' + ') || 'empty'}
        </span>
      )
    }

    case 'tool_call': {
      const name = getStr(meta, 'tool_name')
      const input = (meta.tool_input ?? {}) as Record<string, unknown>
      const preview = getStr(meta, 'result_preview')
      const inputStr = Object.entries(input)
        .map(([k, v]) =>
          `${k}=${typeof v === 'string' ? truncate(v, 30) : v}`,
        )
        .join(', ')
      return (
        <span className="text-indigo-300">
          {name}
          {inputStr && <span className="text-white/55">({inputStr})</span>}
          {preview && (
            <span className="text-white/45"> → {truncate(preview, 80)}</span>
          )}
        </span>
      )
    }

    case 'tool_preprocessing': {
      const stateType = getStr(meta, 'state_type')
      const hintCount = getNum(meta, 'hint_count')
      const tools = (meta.tools ?? []) as string[]
      const chars = getNum(meta, 'chars')
      return (
        <span className="text-teal-300">
          {stateType}
          <Dot />
          {hintCount} tools
          <span className="text-white/45">
            <Dot /> {tools.join(', ')} <Dot /> {chars}c
          </span>
        </span>
      )
    }

    case 'decision': {
      const marked = getStr(meta, 'text_marked')
      if (marked) {
        return (
          <div className="text-white/85">{renderParagraphs(marked)}</div>
        )
      }
      const reasoning =
        getStr(meta, 'reasoning_zh') || getStr(meta, 'reasoning')
      return (
        <div className="text-white/85">{renderParagraphs(reasoning)}</div>
      )
    }

    case 'run_start': {
      const runId = getStr(meta, 'runId') || getStr(meta, 'run_id')
      return <span className="text-yellow-300">Run started: {runId}</span>
    }

    case 'run_end': {
      const victory = !!meta.victory
      const ascension = meta.ascension
      const floor = getNum(meta, 'floor')
      const fitness = getNum(meta, 'fitness')
      const duration = getNum(meta, 'duration_s')
      return (
        <span className={victory ? 'text-emerald-400' : 'text-rose-400'}>
          {victory ? '🏆 VICTORY' : '💀 DEFEAT'}
          {ascension != null && (
            <>
              <Dot />
              <span className="text-amber-400">A{String(ascension)}</span>
            </>
          )}
          <span className="text-white/45">
            <Dot /> Floor {floor} <Dot /> Fit {fitness.toFixed(1)} <Dot />{' '}
            {duration.toFixed(0)}s
          </span>
        </span>
      )
    }

    case 'error': {
      const error = getStr(meta, 'error') || 'Unknown error'
      return <span className="text-rose-400">{truncate(error, 140)}</span>
    }

    case 'postrun_llm_call': {
      const callType = getStr(meta, 'call_type')
      const latency = getNum(meta, 'latency_ms')
      const inTok = getNum(meta, 'input_tokens')
      const outTok = getNum(meta, 'output_tokens')
      const response = getStr(meta, 'response')
      return (
        <span className="text-white/85">
          <ModelTag meta={meta} /> {callType}
          <span className="text-white/45">
            <Dot /> {formatLatency(latency)} <Dot />{' '}
            {formatTokens(inTok + outTok)} tok
          </span>
          {response && (
            <span className="text-white/65"> — {truncate(response, 80)}</span>
          )}
        </span>
      )
    }

    case 'post_run_start': {
      const reason = getStr(meta, 'completion_reason')
      return (
        <span className="text-amber-300">
          Postrun started{reason && ` (reason: ${reason})`}
        </span>
      )
    }

    case 'post_run_stage': {
      const stage = getStr(meta, 'stage')
      const status = getStr(meta, 'status')
      const error = getStr(meta, 'error')
      const cls =
        status === 'done'
          ? 'text-emerald-400'
          : status === 'failed'
            ? 'text-rose-400'
            : status === 'skipped'
              ? 'text-white/45'
              : 'text-amber-300'
      return (
        <span className="text-white/85">
          <span className="text-amber-200 font-medium">{stage}</span>{' '}
          <span className={cls}>{status}</span>
          {error && (
            <span className="text-rose-400"> — {truncate(error, 100)}</span>
          )}
        </span>
      )
    }

    case 'post_run_end':
      return <span className="text-amber-300">Postrun finished</span>

    case 'evolution_round': {
      const round = getNum(meta, 'round')
      const phase = getStr(meta, 'phase')
      const tools = (meta.tool_names ?? []) as string[]
      const inTok = getNum(meta, 'input_tokens')
      const outTok = getNum(meta, 'output_tokens')
      const latency = getNum(meta, 'latency_ms')
      return (
        <span className="text-white/85">
          <span className="text-fuchsia-400 font-medium">
            round {round}
            {phase && ` (${phase})`}
          </span>{' '}
          <ModelTag meta={meta} />
          {tools.length > 0 && (
            <span className="text-white/55"> tools: {tools.join(', ')}</span>
          )}
          <span className="text-white/45">
            <Dot /> {formatLatency(latency)} <Dot />{' '}
            {formatTokens(inTok + outTok)} tok
          </span>
        </span>
      )
    }

    case 'evolution_summary': {
      const rounds = getNum(meta, 'total_rounds')
      const actions = getNum(meta, 'actions_taken')
      const inTok = getNum(meta, 'total_input_tokens')
      const outTok = getNum(meta, 'total_output_tokens')
      return (
        <span className="text-white/85">
          <span className="text-fuchsia-400 font-medium">{rounds} rounds</span>,{' '}
          {actions} actions
          <span className="text-white/45">
            <Dot /> {formatTokens(inTok + outTok)} tok
          </span>
        </span>
      )
    }

    case 'postrun_artifact': {
      const stage = getStr(meta, 'stage')
      const kind = getStr(meta, 'kind')
      const action = getStr(meta, 'action') || 'write'
      const target = getStr(meta, 'target')
      const summary = getStr(meta, 'summary')
      return (
        <span className="text-white/85">
          <span className="text-lime-400 font-medium">{stage}</span>
          <span className="text-white/45"> / </span>
          <span className="text-lime-300">{kind}</span>
          <span className="text-white/55"> {action}</span>
          {target && <span className="text-white/85"> — {target}</span>}
          {summary && (
            <span className="text-white/45"> · {truncate(summary, 100)}</span>
          )}
        </span>
      )
    }

    case 'monitor_init': {
      const msg = getStr(meta, 'message') || 'Agent initialized'
      const monPort = getNum(meta, 'monitor_port')
      const gamePort = getNum(meta, 'game_port')
      return (
        <span className="text-sky-300">
          {msg}
          {(monPort || gamePort) && (
            <span className="text-white/45">
              {' '}· {monPort > 0 && `mon:${monPort}`}
              {gamePort > 0 && ` game:${gamePort}`}
            </span>
          )}
        </span>
      )
    }

    default: {
      const message = getStr(meta, 'message') || getStr(meta, 'summary')
      if (message) return <span className="text-white/75">{message}</span>
      const json = JSON.stringify(meta)
      return <span className="text-white/45">{truncate(json, 140)}</span>
    }
  }
}

// ───────── shared helpers ───────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])


// ───────── Combat plan block (full detail) ─────────────────────────────────

interface PlanItemLike {
  type?: unknown
  type_zh?: unknown
  card?: unknown
  card_zh?: unknown
  target?: unknown
}

// Card / relic display colors. All cards share one color; upgraded cards
// (display name ends with "+") switch to green so the upgrade signal is
// visible at a glance. Relics get their own distinct color.
export const CARD_COLOR = 'text-amber-200'
export const CARD_UPGRADED_COLOR = 'text-emerald-300'
export const RELIC_COLOR = 'text-teal-300'

export const itemColor = (type: unknown, name: unknown): string => {
  const t = typeof type === 'string' ? type.toLowerCase() : ''
  if (t === 'relic') return RELIC_COLOR
  const upgraded = typeof name === 'string' && name.endsWith('+')
  return upgraded ? CARD_UPGRADED_COLOR : CARD_COLOR
}

function CombatPlanBlock({ meta }: PartProps) {
  const reasoningMarked = str(meta.reasoning_marked)
  const reasoning = str(meta.reasoning_zh) || str(meta.reasoning)
  const items = arr<PlanItemLike>(meta.items)
  const endTurn = !!meta.end_turn

  const isZh =
    items.some(it => !!str(it.card_zh) || !!str(it.type_zh))

  return (
    <div className="leading-snug">
      {(reasoningMarked || reasoning) && (
        <div className="text-white/85 mb-3">
          {reasoningMarked
            ? renderParagraphs(reasoningMarked)
            : renderParagraphs(reasoning)}
        </div>
      )}
      <div className="space-y-0.5 font-mono">
        {items.length === 0 && !endTurn && (
          <div className="text-white/40">no actions queued</div>
        )}
        {items.map((it, i) => {
          const rawType = str(it.type)
          const type = str(it.type_zh) || rawType.toUpperCase()
          const card = str(it.card_zh) || str(it.card)
          const target = it.target
          const cardColor = itemColor(it.type, card)
          return (
            <div key={i} className="text-white/85">
              <span className="text-white/35 mr-2 inline-block w-5 text-right">
                {i + 1}.
              </span>
              <span className="text-cyan-300 font-bold mr-2">{type}</span>
              <span className={cardColor}>{card}</span>
              {target != null && target !== '' && (
                <span className="text-white/55">
                  {isZh ? ` → 目标 ${String(target)}` : ` → e${String(target)}`}
                </span>
              )}
            </div>
          )
        })}
        {endTurn && (
          <div className="text-yellow-300">
            <span className="text-white/35 mr-2 inline-block w-5 text-right">
              →
            </span>
            {isZh ? '结束回合' : 'END TURN'}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────── Thinking body ──────────────────────────────────────────────────

interface ThinkingError {
  message: string
  at: number
}

function ThinkingBody({ meta }: PartProps) {
  const startedAt =
    typeof meta.startedAt === 'number' ? meta.startedAt : 0
  const endedAt =
    typeof meta.endedAt === 'number' ? meta.endedAt : null
  const completed = endedAt != null
  const model = str(meta.model)
  const errors = Array.isArray(meta.errors)
    ? (meta.errors as ThinkingError[])
    : []
  const transitions = arr<Record<string, unknown>>(meta.transitions)
  const decisions = arr<Record<string, unknown>>(meta.decisions)
  const combatPlan = meta.combatPlan as Record<string, unknown> | undefined
  const floor = typeof meta.floor === 'number' ? meta.floor : null
  const combatTurn =
    typeof meta.combatTurn === 'number' ? meta.combatTurn : null

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (completed) return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [completed])

  const elapsedMs = completed ? (endedAt as number) - startedAt : now - startedAt
  const elapsed = (Math.max(elapsedMs, 0) / 1000).toFixed(1)

  return (
    <div className="text-white/65">
      {(decisions.length > 0 || combatPlan) && (
        <div className="mb-2 text-[14px] space-y-2">
          {decisions.map((d, i) => (
            <div key={i}>{renderSts2Summary('decision', d)}</div>
          ))}
          {combatPlan && renderSts2Summary('combat_plan', combatPlan)}
        </div>
      )}
      {transitions.length > 0 && (
        <div className="mb-1.5 space-y-0.5 text-[13px]">
          {transitions.map((t, i) => (
            <div key={i}>{renderSts2Summary('transition', t)}</div>
          ))}
        </div>
      )}
      <div className={(decisions.length > 0 || combatPlan || transitions.length > 0) ? 'pt-2 border-t border-white/10' : ''}>
        {floor != null && floor > 0 && (
          <>
            <span className="text-amber-300/80 tabular-nums">F{floor}</span>
            <span className="text-white/40"> · </span>
          </>
        )}
        {combatTurn != null && (
          <>
            <span className="text-rose-300/80 tabular-nums">T{combatTurn}</span>
            <span className="text-white/40"> · </span>
          </>
        )}
        {model ? (
          <span className="font-mono text-blue-300">{model}</span>
        ) : (
          <span className="text-white/55">Preprocessing</span>
        )}
        <span className="text-white/40"> · </span>
        <span className="text-white/40 tabular-nums">{elapsed}s</span>
      </div>
      {errors.map((err, i) => {
        const isLatest = i === errors.length - 1
        const retrying = !completed && isLatest
        const dt = ((err.at - startedAt) / 1000).toFixed(1)
        return (
          <div key={i} className="text-rose-400 mt-1">
            {truncate(err.message, 120)}
            {retrying && (
              <span className="text-rose-300/60"> · retrying</span>
            )}
            <span className="text-rose-300/60"> · </span>
            <span className="text-rose-300/60 tabular-nums">{dt}s</span>
          </div>
        )
      })}
    </div>
  )
}
