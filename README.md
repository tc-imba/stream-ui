# stream-ui

OBS-ready streaming overlay for an LLM-agent-driven live stream. Built with Vite + React + Tailwind v4. Designed to be displayed as a Browser Source in OBS, sized **1920 × 1080**.

## Layout

```
+----------------------------------------+----------------+
|                                        |                |
|        CAPTURE 1440 × 810              |   LOG PANEL    |
|        (transparent — your OBS         |   agent +      |
|         capture source goes here)      |   project logs |
|                                        |                |
+----------------------------------------+                |
|        CHAT STRIP                      |                |
|        bilibili / douyin danmaku       |                |
+----------------------------------------+----------------+
```

- **Capture frame** — fixed 1440 × 810 transparent area at `(28, 28)` for your OBS game/screen capture source. Visible alignment markers (corner brackets, crosshair, dashed inner outline).
- **Log panel** — right column, real-time feed of LLM agent thinking, tool calls, errors, and arbitrary logs from any subscribed project.
- **Chat strip** — bottom strip showing live danmaku from connected platforms.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6 + TypeScript |
| UI | React 18, Tailwind v4 |
| State | Zustand |
| Router | react-router-dom v6 |
| Bilibili events | [`@laplace.live/event-bridge-sdk`](https://www.npmjs.com/package/@laplace.live/event-bridge-sdk) |
| Package mgmt | pnpm workspaces |

## Quick Start

```bash
# install
pnpm install

# copy env
cp ui/.env.example ui/.env

# run dev server (port 5274 by default)
pnpm dev
```

Open **http://127.0.0.1:5274/overlay**.

In dev mode, mock events fire automatically so you can iterate on the UI without any backends. Set `VITE_MOCK=false` in `ui/.env` to disable.

## Routes

| URL | Purpose |
|---|---|
| `/overlay` | Composite — primary OBS browser source |
| `/chat` | Standalone danmaku-only |
| `/alert` | Standalone gift alerts |
| `/stats` | Standalone status strip |

## Event Sources

Every incoming event from any source is normalized into a `UnifiedEvent` and routed by `kind`:

```
[bilibili]      → @laplace.live/event-bridge-sdk ─┐
[STS2Agent]     → ws://localhost:8081/ws/events   ├→ eventRouter → store → UI
[your project]  → (any adapter you write)         ┘
```

| `kind` | Lands in | Display |
|---|---|---|
| `chat` | `streamStore.messages` | Chat strip (bottom) |
| `gift` | `streamStore.gifts` | Gift alert popup over capture |
| anything else (`thinking`, `state`, `log`, ...) | `logStore.entries` | Log panel (right) |

To publish from any code path:

```ts
import { route } from '@/lib/eventRouter'
import { makeEventId } from '@/types/events'

route({
  id: makeEventId(),
  source: 'my-project',
  kind: 'log',
  level: 'info',
  message: 'whatever happened',
  timestamp: Date.now(),
})
```

## Integrations

### LAPLACE (Bilibili danmaku)

Run [`laplace-event-fetcher`](https://github.com/laplace-live/event-fetcher) v2.2+ in bridge mode (or the Go [`event-bridge`](https://github.com/laplace-live/event-bridge)) on `:9696`. The UI subscribes via `useLaplaceEvents`. See `ui/.env.example` for `VITE_BRIDGE_URL` / `VITE_BRIDGE_TOKEN`.

### STS2Agent (LLM agent runtime logs)

Subscribes to STS2Agent's FastAPI monitor at `ws://localhost:8081/ws/events`. Enable on the agent side with `STS2_MONITOR_ENABLED=true`. See [`docs/integration-sts2agent.md`](docs/integration-sts2agent.md) for the event mapping and how to enrich the feed.

## Project Layout

```
stream-ui/
├── ui/                      # the React app (OBS browser source)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # CaptureFrame, LogPanel, ChatStrip, LogItem
│   │   │   └── overlay/     # DanmakuList, DanmakuItem, GiftAlert, ViewerStats
│   │   ├── hooks/
│   │   │   ├── useLaplaceEvents.ts        # bilibili via LAPLACE SDK
│   │   │   ├── useSTS2AgentEvents.ts      # STS2Agent via FastAPI WS
│   │   │   ├── useMockEvents.ts           # mock danmaku/gifts (dev)
│   │   │   ├── useMockAgent.ts            # mock LLM thinking (dev)
│   │   │   └── useMockLogs.ts             # mock external logs (dev)
│   │   ├── lib/
│   │   │   └── eventRouter.ts             # central dispatch
│   │   ├── store/
│   │   │   ├── streamStore.ts             # chat + gifts
│   │   │   ├── logStore.ts                # unified log feed
│   │   │   └── settingsStore.ts           # persisted user prefs
│   │   ├── types/events.ts                # UnifiedEvent type
│   │   └── routes/
│   │       ├── Overlay.tsx                # composite (primary)
│   │       ├── ChatOverlay.tsx
│   │       ├── AlertOverlay.tsx
│   │       └── StatsOverlay.tsx
│   ├── styles/index.css                   # tailwind + grid CSS variables
│   ├── vite.config.ts
│   └── package.json
├── adapters/                # future producers (douyin, etc.)
└── docs/
    └── integration-sts2agent.md
```

## OBS Setup

1. Add a **Browser Source** at `http://127.0.0.1:5274/overlay`, sized **1920 × 1080**, FPS 30.
2. Add your game/screen capture **below** the browser source in the layer list.
3. Set the capture source transform: position `(28, 28)`, size `1440 × 810`.

## License

Project source: MIT (your code).

Note: `@laplace.live/event-bridge-sdk` is MIT, but the related `@laplace.live/event-types` package and the `chat-overlay` reference repo are AGPL-3.0. We deliberately do **not** import from event-types directly to keep the project MIT-clean.
