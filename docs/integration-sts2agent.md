# Integration: STS2Agent → stream-ui

How `stream-ui` consumes runtime events from [STS2Agent](https://github.com/...) and renders them in the right-side log panel.

## Architecture

```
[STS2Agent (Python)]
  agent loop
    ├─ SessionLogger ─→ logs/run_*.jsonl   (file)
    └─ EventBus  ─→ FastAPI :8081 ─→ /ws/events
                                          │
                                          │ (subscribed by stream-ui)
                                          ▼
[stream-ui (React)]
  useSTS2AgentEvents
    ├─ JSON.parse + transform (MonitorEvent → UnifiedEvent)
    └─ route() → logStore → LogPanel (right column)
```

Single direction, push-only. stream-ui never sends back to STS2Agent.

## Connection

| Setting | Default | Notes |
|---|---|---|
| URL | `ws://localhost:8081/ws/events` | Override with `VITE_STS2_WS_URL` in `ui/.env` |
| Auth | none | STS2Agent's monitor is local-only |
| Reconnect | exponential backoff, max 30s | Built into `useSTS2AgentEvents` |
| Disabled when | `VITE_MOCK` is on (dev) | So mock data and real data don't compete |

## STS2Agent Side: Required Setup

The agent's monitor is opt-in. Enable it before starting a run:

```bash
# in STS2Agent repo
pip install -e ".[dev,monitor]"        # ensures fastapi/uvicorn/websockets
export STS2_MONITOR_ENABLED=true
python -m scripts.run_agent --steps 500
```

The FastAPI server starts on `:8081` in a daemon thread alongside the agent and exposes:

- `GET  /api/status`             — health
- `GET  /api/events/history`     — backfill (we don't currently consume this)
- `WS   /ws/events`              — live event broadcast (we subscribe here)

## Wire Frame: STS2 `MonitorEvent`

JSON payload sent on each frame (one event per `ws.onmessage`):

```jsonc
{
  "id":        "uuid-or-monotonic-string",
  "timestamp": 1719999999.123,    // epoch seconds (float)
  "type":      "decision",        // 38 known types — see STS2Agent docs/superpowers/specs/2026-03-20-monitor-dashboard-design.md
  "data":      { /* type-specific */ },
  "step":      42,                // optional
  "run_id":    "2026-04-27-001"   // optional
}
```

## Mapping: `MonitorEvent` → `UnifiedEvent`

Implemented in `ui/src/hooks/useSTS2AgentEvents.ts::transform`.

| `MonitorEvent.type` | `UnifiedEvent.kind` | `level` | Lands in |
|---|---|---|---|
| `run_start`, `run_end` | `state` | `info` | log panel |
| `state` | `log` | `debug` | log panel |
| `transition` | `log` | `info` | log panel |
| `decision`, `llm_call` | `thinking` | `info` | log panel (rendered with 🧠 icon) |
| `tool_call`, `tool_result` | `log` | `info` | log panel |
| `error` | `log` | `error` | log panel (red dot) |
| `perf` | `log` | `debug` | log panel |
| (anything else) | `log` | `info` | log panel |

All STS2Agent events arrive with `source: 'sts2agent'`. The log panel applies a violet tone to that source. The original `MonitorEvent.type` is preserved in `UnifiedEvent.meta.eventType` so future variants can be styled differently without changing the upstream.

## Display Message Extraction

`extractMessage()` picks the first non-empty string field from the event data, in this order:

```
data.message → data.text → data.reasoning → data.summary → data.tool_name → data.state_type → event.type
```

This is best-effort. If a field STS2Agent emits doesn't appear in this list and renders as a generic type tag (e.g. `"decision"`), extend the order in `useSTS2AgentEvents.ts`.

## What Works Out Of The Box

With STS2Agent's current emit set, the log panel shows:

- ✅ Run lifecycle (`run_start`, `run_end`)
- ✅ State transitions (combat → map → shop, etc.)
- ✅ Decision events (when `data.reasoning` is populated)
- ✅ Errors with stack-trace context
- ✅ Performance metrics (LLM latency, token counts)

## What Needs STS2Agent-Side Enrichment

STS2Agent's `SessionLogger` is currently silent on:

- 🔧 **LLM thinking text** — the streamed reasoning inside `<thinking>` blocks isn't published to the EventBus today
- 🔧 **Tool call inputs** — only the tool name lands in `data.tool_name`; full arguments are not emitted
- 🔧 **Tool call outputs** — return values are stored locally but not broadcast
- 🔧 **Memory operations** — write-gate decisions, skill discovery, guide consolidation are logged to JSONL but not all are published as MonitorEvents

To enrich the feed, on STS2Agent side add `event_bus.emit(...)` calls in:

- `src/brain/v2_engine.py` — emit a `thinking` event with `data.text` for each streamed reasoning chunk
- `src/brain/v2_backend.py` — emit `tool_call` with full `data.arguments` and `tool_result` with `data.return_value`
- `src/skills/mistake_discovery.py`, `src/memory/write_gate.py` — emit per-stage progress for postrun visibility

Existing JSONL events are a good starting list to mirror into the EventBus.

## Troubleshooting

**Nothing appears in the log panel.**
- Verify STS2Agent is actually running with `STS2_MONITOR_ENABLED=true`. `curl http://localhost:8081/api/status` should return JSON.
- Check `VITE_MOCK` — if it's on, the real connection is intentionally disabled. Set `VITE_MOCK=false` in `ui/.env`.
- Look in browser DevTools console for `[sts2]` errors.

**Events appear, but messages all say `decision` or generic type tags.**
STS2Agent's event `data` doesn't have a recognized text field for that type. Either enrich on the agent side (add `data.message` or `data.summary` when emitting) or extend `extractMessage()` in `useSTS2AgentEvents.ts`.

**Connection drops every few seconds.**
STS2Agent's `/ws/events` may close on agent shutdown or restart. The hook reconnects with exponential backoff up to 30s. Log spam is acceptable; UI doesn't surface this currently.

**WebSocket fails immediately with `ECONNREFUSED`.**
Most likely STS2Agent isn't running, monitor isn't enabled, or it's bound to a different port. Confirm the bind address with `netstat -ano | grep 8081`.

## Future Work

- **History backfill on connect** — call `GET /api/events/history` once at connection to populate the log panel with the last N events instead of starting empty.
- **Per-`type` filtering UI** — checkbox panel to mute event types the streamer doesn't want on screen.
- **Persistent run-id label** — show the active `run_id` in the LogPanel header so multi-run sessions are distinguishable.
- **Echo back to agent** — if STS2Agent ever wants chat-driven control, stream-ui already has the chat data; it could POST viewer messages back via a future REST endpoint.
