# LAPLACE upstream stack (Docker Compose)

Runs `laplace-event-fetcher` in WebSocket bridge mode + a PostgreSQL backing store. Exposes the bridge on `ws://localhost:9696` for `stream-ui` to subscribe to.

## Layout

```
[bilibili.com] ──► laplace-fetcher (container)  ──► host :9696 ──► stream-ui
                          │
                          ▼
                   laplace-pg (container)
                   stores event history (~72h)
```

## First-time setup

1. **Get a bilibili login token** (see `.env.example` for details — install the LAPLACE Login Sync extension, log into bilibili, copy the key).
2. Copy `.env.example` to `.env` and paste the token into `LOGIN_SYNC_TOKEN`. Adjust `ROOMS` if needed.
3. From this directory:
   ```bash
   docker compose up -d
   ```
4. Verify both containers are healthy:
   ```bash
   docker compose ps
   docker compose logs fetcher --tail 30
   ```
   You should see `[lef] websocketBridge enabled` and no `RangeError` crash.
5. Confirm the bridge is reachable from the host:
   ```bash
   curl -s http://localhost:9696/ping
   ```

## Common operations

```bash
# stop everything (keeps volume)
docker compose stop

# tail logs
docker compose logs -f fetcher

# rebuild from scratch (drops postgres volume)
docker compose down -v && docker compose up -d

# change room without recreating containers
docker compose stop fetcher
# edit .env → ROOMS=...
docker compose up -d fetcher
```

## Why a token is needed

The fetcher's docs list `LOGIN_SYNC_TOKEN` as optional, but the current `:edge` image crashes during startup when the token is empty (string masking on a 0-length string). Until the upstream is fixed, treat it as required.

If you don't want to provide a real token, set a 16+ character placeholder — the fetcher won't crash but bilibili requests for non-public data will fail. Public danmaku may still flow.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `RangeError: ... repeat argument` in fetcher logs | `LOGIN_SYNC_TOKEN` is empty or shorter than 8 chars |
| `Container laplace-pg unhealthy` | Postgres failed to start; check `docker logs laplace-pg` |
| stream-ui still shows `disconnected` | Run `curl http://localhost:9696/ping`. If it fails, fetcher isn't running. If it succeeds, check stream-ui's browser DevTools console for WebSocket errors. |
| Events appear empty / no chat | Room ID may be wrong, or the room isn't currently live. Try a known-active room first. |
