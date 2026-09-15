# Deploying: Railway, Vercel, prelaunch and the env blocks

## Layout that worked

```
repo/
├── server/   Node 22 + TypeScript, Dockerfile, railway.json (healthcheckPath /health)   -> Railway service
├── web/      Vite + React, vercel.json at repo root builds web/                       -> Vercel
├── stream/   Dockerfile: Xvfb + PulseAudio + Chromium + ffmpeg -> RTMP (optional)     -> second Railway service
└── brand/    every generated asset with a README line
```

IDDQD is a single Railway service (engine + server + static site + its own RTMP push); pick that shape when
the visual is rendered server-side anyway.

## Railway (server)

1. New project -> Deploy from GitHub repo, **Root Directory = `server`** (the Dockerfile is picked up). One service per folder; the streamer is a second service with root `stream`.
2. Add a **volume** (any mount path) so state survives redeploys; read `RAILWAY_VOLUME_MOUNT_PATH` as the data dir. `GET /health` should show `dataDir` and `persistent: true`.
3. `railway.json`: `healthcheckPath: /health`, `healthcheckTimeout: 60` (IDDQD uses 180 because it compiles the engine). Anything that can take longer than that (log scans, backfills) must run **after** `listen()`.
4. Variables -> Raw editor. Deliver a complete block the user pastes; only the token address stays open. Railway redeploys on every variable change and on every push to the connected branch.
5. Generate a public domain and put `wss://<domain>/ws` into the web build.
6. Logs are the debugging surface: make the service print one line per phase (`listening`, `launch found at block`, `replaying from`, `graduated`, `[trade] ...`) and structured errors.

Server env template (Plantoshi shape):

```
CHAIN_ID="4663"
CHAIN_NAME="Robinhood Chain"
DEXSCREENER_CHAIN="robinhood"
EXPLORER_URL="https://robinhoodchain.blockscout.com"
TOKEN_ADDRESS="0x..."                       # the only thing to fill in at launch
POOL_MANAGER="0x8366a39cc670b4001a1121b8f6a443a643e40951"
RPC_URL="https://rpc.mainnet.chain.robinhood.com,https://robinhood-chain.gateway.tenderly.co,https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public,https://rpc-robinhood.blockmachine.io"
PONS="1"                                    # watch the bonding curve + auto-detect graduation
# START_BLOCK="63015951"                    # launch block, only when deploying > 1 h after launch
GROWTH_SCALE="6"
GROWTH_EXPONENT="0.5"
SELL_FACTOR="0.3"
MIN_TRADE_USD="0.25"
POLL_MS="1500"
MARKET_REFRESH_MS="30000"
DEMO="0"
PORT="8080"
ADMIN_TOKEN="a-long-random-string"          # no < > or quotes inside
```

Before launch add `PRELAUNCH="1"` (plus `LAUNCH_NAME`, `LAUNCH_SYMBOL`); at launch remove it and set the
address. State is keyed by token address, so an old plant is never reused; `POST /admin/reset` with
`Authorization: Bearer <ADMIN_TOKEN>` resets anyway.

Streamer env (second service, root `stream`):

```
RTMP_URL="rtmp://va.pscp.tv:80/x"           # from X Media Studio -> Producer -> source
STREAM_KEY="m9d..."                         # the full key, no brackets
PAGE_URL="https://<site>/?stream=1"
WIDTH="1920"  HEIGHT="1080"  FPS="30"  VIDEO_BITRATE="4500k"  AUDIO_BITRATE="160k"
```

## Vercel (web)

1. New project from the same repo; root `vercel.json` builds `web/` (`outputDirectory: web/dist`), so the project root can stay `/`.
2. `VITE_WS_URL=wss://<railway-domain>/ws` (Vite bakes env at build time: change it, redeploy). Optional `VITE_X_URL`, `VITE_BUY_URL`, `VITE_PRELAUNCH=1` to force the launching-soon page without the server.
3. Custom domain: apex redirects to `www` with a 308 and keeps the query string, so `?stream=1` survives.
4. **Deployments show `BLOCKED` (no build logs) when the commit author is not a member of the Vercel team.** Commit with the environment's default git identity (the one that produced READY deployments); never pass `-c user.name=... user.email=...` for the user. Check with `list_deployments` when a push does not appear on the site.
5. `web/public/assets` holds `og.jpg` (1200x630), the favicon and all art; cache headers are in `vercel.json`.

## Prelaunch and local verification

- `PRELAUNCH=1` (server) stops all chain reads and serves the launching-soon page: empty pot/scene, logo, manifesto, follow-on-X button. Deploy this days before launch; it is the safe state.
- Local harness: `DEMO=1` server on a port, `VITE_WS_URL=ws://127.0.0.1:<port>/ws npx vite build`, `npx vite preview`, Playwright with `executablePath: /opt/pw-browsers/chromium`, screenshots at 1440x900, 390x844 (phone), 1920x1080 (`?stream=1`). Read the screenshots before saying anything works.
- Streamer test without an RTMP server: `OUTPUT=/tmp/test.flv DURATION=30 ./entrypoint.sh`, then `ffprobe` (h264 + aac), `volumedetect` (audio not -91 dB) and one extracted frame.

## Health check contract

`GET /health` returns `ok`, token symbol, `prelaunch`, `head`, `lastBlock`, `blocksBehind`, `swapsSeen`,
`rpc.failures` + `lastError`, `pools[]`, `pons {launchBlock, watchingGraduation}`, price, `persistent`,
`dataDir`. On launch day the user checks exactly this URL; if `pons.launchBlock` is null the curve was not
found (set `START_BLOCK` or `PONS_CURVE`).
