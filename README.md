# 🐂🕶️ $PITBULL — the mythical creature that brings wealth

Half bull. Half pitbull. All star. A lore shrine with live on-chain numbers for **$PITBULL** on
Robinhood Chain (chain id 4663), launched through the Pons launchpad. No trade feed, no candles, no
"buys do X": the site tells the legend and shows what the chain says — market cap, believers (holders),
all-time high, volume, price, time since the summoning — plus **The Prophecy**, seven lore milestones
unlocked by the highest market cap ever reached.

**Mechanic in one line:** *He doesn't watch the chart. The chart watches him.*

The site is a deliberate 1998 Geocities homepage: tiled sky, WordArt titles, Windows 95 windows
(`SHRINE.EXE`, `PROPHECY.EXE`, `PITBULL-CAM.AVI`), marquees, blinking tags, a visitor counter and money
falling past the page forever. `brand/geo/` holds the same style as standalone HTML for the banner, the
memes and the video; `web/src/styles.css` is that style as the site.

| | |
|---|---|
| Name / ticker | Pitbull / `$PITBULL` |
| Chain / launchpad | Robinhood Chain (4663) / Pons, native ETH pair |
| Site | https://thepitbull.fun (Vercel) |
| API / WebSocket | Railway, `server/` |
| X | https://x.com/thepitbullfun (placeholder until the handle is claimed) |

```
pitbull/
├── server/   Node + TypeScript  → Railway   (chain watcher, holders, shrine stats, WebSocket + REST)
├── web/      Vite + React       → Vercel    (the shrine)
├── stream/   Xvfb + Chromium + ffmpeg → RTMP (optional 24/7 stream service)
├── brand/    every generated asset, with a README line each
└── scripts/  art/video helpers (download, GIF, contact sheet, labels, Pons token finder)
```

## How it works

1. **Pons discovery** – the server finds the token's `TokenLaunched` event on the Pons factory, watches the
   bonding curve (`CurveBuy`/`CurveSell`) and detects graduation to Uniswap v4 (`Initialize` on the
   PoolManager). Trades are valued from the quote leg (ETH via CoinGecko/Dexscreener).
2. **Holders** – every ERC-20 `Transfer` of the token is applied to a balance map; wallets holding at least
   `HOLDER_MIN_TOKENS` count as *believers*. The curve, PoolManager, Pons factory/router/hook, any v2/v3
   pair and `HOLDER_IGNORE` addresses never count. Replayed from the launch block on a fresh start, so the
   first buyers count.
3. **Shrine** – lifetime trades/volume, ATH market cap (from Dexscreener once listed, derived from the curve
   before that), holder count and peak, launch time (launch block timestamp), prophecy index.
4. **The Prophecy** – `$50K The Sighting · $250K The Awakening · $1M The Flex · $5M Mr. Wealthwide ·
   $25M The Stampede · $100M Worldwide · $1B DALE.` Reached once, kept forever; a `milestone` message
   shows a toast on the site and the stream.
5. **Broadcast** – `hello` on connect, then coalesced `state`, `price` and `milestone` messages over
   WebSocket. State is persisted to `DATA_DIR/state.json` (mount a Railway volume), keyed by token address.

### Endpoints

`GET /health` (head block, blocks behind, pools, launch block, holders, last RPC error), `GET /api/state`,
`GET /api/holders?limit=10`, `GET /api/trades?limit=50`, `POST /admin/reset`, `POST /admin/trade
{"side":"buy","usd":500}` (bearer `ADMIN_TOKEN`), WebSocket at `/ws`.

### Modes

- `PRELAUNCH=1` – no chain reads; the site shows *launching soon* with a countdown when `LAUNCH_AT` is set.
- `DEMO=1` – synthetic trades, holders and a random-walk price, for screenshots and rehearsals.
- `?stream=1` on the site – a 1920×1080 broadcast frame for OBS or the `stream/` service.

## Run locally

```
npm --prefix server ci && npm --prefix server test
PORT=8080 DEMO=1 TOKEN_ADDRESS=0x1111111111111111111111111111111111111111 npm --prefix server run dev
npm --prefix web ci && VITE_WS_URL=ws://127.0.0.1:8080/ws npm --prefix web run dev
```

## Deploy

See `.claude/skills/robinhood-launch/references/deploy.md`. Railway service with root `server` and a
volume; Vercel from the repo root (`vercel.json` builds `web/`). Server env (prelaunch):

```
PRELAUNCH="1"
LAUNCH_NAME="Pitbull"
LAUNCH_SYMBOL="PITBULL"
LAUNCH_AT="2026-09-20T18:00:00Z"
CHAIN_ID="4663"
CHAIN_NAME="Robinhood Chain"
DEXSCREENER_CHAIN="robinhood"
EXPLORER_URL="https://robinhoodchain.blockscout.com"
POOL_MANAGER="0x8366a39cc670b4001a1121b8f6a443a643e40951"
RPC_URL="https://rpc.mainnet.chain.robinhood.com,https://robinhood-chain.gateway.tenderly.co,https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public,https://rpc-robinhood.blockmachine.io"
PONS="1"
HOLDERS="1"
HOLDER_MIN_TOKENS="1"
MIN_TRADE_USD="0.25"
POLL_MS="1500"
MARKET_REFRESH_MS="30000"
DEMO="0"
PORT="8080"
ADMIN_TOKEN="a-long-random-string"
```

At launch: remove `PRELAUNCH`, set `TOKEN_ADDRESS="0x..."` (and `START_BLOCK` when deploying more than an
hour after launch), save, check `/health` for `pons.launchBlock` and the curve pool. Web env:
`VITE_WS_URL=wss://<railway-domain>/ws`, `VITE_X_URL`, `VITE_BUY_URL` (the Pons token page),
`VITE_SITE_URL`, optional `VITE_PRELAUNCH=1`.

## Disclaimer

$PITBULL is a meme coin with no intrinsic value, utility or expectation of financial return. The Pitbull is
a fictional creature; the project is not affiliated with, endorsed by or connected to any artist, person,
brand or exchange.
