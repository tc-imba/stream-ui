# Repository Guidelines

Short-form contributor + agent runtime guide for `stream-ui`. For end-user setup see `README.md`. For the STS2Agent integration contract see `docs/integration-sts2agent.md`.

## What This Project Is

OBS-ready streaming overlay for an LLM-agent-driven live stream. A React SPA designed to be loaded as an OBS Browser Source at 1920×1080. Composes:

- A **transparent 16:9 capture frame** at fixed coords (the streamer's actual game/screen capture goes behind it via OBS layering, not inside the page).
- A **right log panel** showing real-time agent thinking + arbitrary project logs.
- A **bottom chat strip** showing live danmaku from connected platforms.

## Project Structure & Module Organization

- `ui/` — the Vite + React app.
  - `src/components/layout/` — composite-layout pieces (`CaptureFrame`, `LogPanel`, `LogItem`, `ChatStrip`).
  - `src/components/overlay/` — primitives reusable across routes (`DanmakuList`, `DanmakuItem`, `GiftAlert`, `ViewerStats`).
  - `src/hooks/` — event-source hooks. One per upstream system. Each hook is responsible for: connecting, normalizing into `UnifiedEvent`, calling `route()`, and lifecycle cleanup.
  - `src/lib/eventRouter.ts` — single `route()` dispatcher. `kind=chat` / `kind=gift` go to `streamStore`; everything else goes to `logStore`. Adding a new event source = add a new hook + transform; do not add per-source stores.
  - `src/store/` — Zustand stores. `streamStore` (chat + gifts), `logStore` (unified ring buffer, 500 entries), `settingsStore` (persisted display options).
  - `src/types/events.ts` — `UnifiedEvent` type. Open `source` and `kind` strings; do not turn them into closed unions.
  - `src/routes/` — one component per OBS Browser Source URL. `Overlay.tsx` is the composite primary; the others (`/chat`, `/alert`, `/stats`) are standalone single-widget pages kept for users who prefer multiple browser sources.
  - `src/styles/index.css` — Tailwind v4 entry + theme tokens + grid CSS variables.
- `adapters/` — future external-process adapters (douyin, etc.). Each is its own pnpm workspace package; each publishes `UnifiedEvent`-shaped frames into `eventRouter` either by direct import (in-browser) or via a WebSocket the UI subscribes to.
- `docs/` — integration contracts and design specs.

## Build, Test, and Development Commands

```bash
# install
pnpm install

# dev server (port 5274 default; set PORT in ui/.env to override)
pnpm dev

# typecheck the workspace
pnpm typecheck

# production build
pnpm build
```

The dev server is the canonical OBS target. Hard-refresh in the browser source after layout changes — OBS aggressively caches.

## Coding Style & Conventions

- TypeScript strict, ESM only. Targets `ES2022`, `react-jsx`.
- 2-space indent, single quotes, no semicolons in TS. Tailwind v4 syntax (e.g. `bg-(--color-overlay-bg)` for arbitrary CSS-var values).
- Path alias `@/...` resolves to `ui/src/...`. Use it; relative chains beyond one level are noise.
- **No comments that restate code.** Comments explain WHY — hidden constraints, license boundaries, or non-obvious invariants.
- **No `@laplace.live/event-types` import.** The SDK is MIT but `event-types` is AGPL-3.0 — direct import would make this project AGPL. Type the SDK callbacks inline at the callsite if needed; we already do this in `useLaplaceEvents.ts`.
- Stores stay thin: ingest, expose, prune. UI components own derived/formatted views.
- Event sources never write to stores directly. Always go through `route()` in `lib/eventRouter.ts`. This is the seam for unified routing, future filtering, and dev-mode mocks.
- Each event-source hook short-circuits in mock mode (`if (isMockEnabled) return`) so the dev preview isn't competing with a real backend's data.

## Layout / Sizing

The composite `/overlay` layout is driven entirely by CSS variables in `ui/src/styles/index.css`:

```css
--layout-margin: 28px;
--capture-width: 1440px;     /* fixed 16:9 capture frame width */
--capture-height: calc(var(--capture-width) * 9 / 16);  /* derives 810 */
```

Log column and chat strip occupy the remaining grid space (`1fr` each). Changing `--capture-width` rebalances the rest. **Do not hardcode pixel dimensions on individual panels** — the variables are the source of truth so OBS users can pin the capture-source coords.

If you change `--capture-width`, also update the dimension label inside `CaptureFrame.tsx`.

## Adding a New Event Source

1. Create `ui/src/hooks/use<Source>Events.ts`. Match the existing pattern: connect, transform incoming frames into `UnifiedEvent`, call `route()`, return cleanup. Short-circuit when `isMockEnabled`.
2. Pick a stable `source` string (used as the visible tag and color key in `LogItem.tsx::sourceTone`).
3. Add the source's tone to `LogItem.tsx::sourceTone` if you want a distinct color.
4. Wire the hook into `App.tsx` alongside the others.
5. Add a corresponding env var to `.env.example` and the `ImportMetaEnv` interface in `vite-env.d.ts`.
6. Document the contract in `docs/integration-<source>.md` (mapping table, connection details, env vars, how to enrich the feed upstream).

## Integration Contracts

| Upstream | Doc | Default endpoint |
|---|---|---|
| LAPLACE event-bridge | (inline in README) | `ws://localhost:9696` |
| STS2Agent monitor | `docs/integration-sts2agent.md` | `ws://localhost:8081/ws/events` |

When integrating a new source, write the contract doc **first** — it forces you to define the mapping before scattering casts across the codebase.

## OBS Notes

- Browser source must be 1920×1080. Other sizes work but the fixed pixel layout (capture frame at 1440×810 anchored at 28,28) won't align cleanly.
- Transparency is genuine: `body { background: transparent }`. In a regular browser this looks white because the browser draws white behind the page; in OBS it composites onto the scene below. Do not "fix" the white — it's correct.
- After any CSS or component change, right-click the OBS browser source → **Refresh**. HMR reaches the dev browser but not OBS's embedded Chromium.

## Commit Guidelines

Conventional-commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `style:`, `perf:`. Scope each commit to one concern.
