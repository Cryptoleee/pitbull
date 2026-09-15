---
name: robinhood-launch
description: End-to-end playbook for building, branding, deploying and launching a token project on Robinhood Chain (chain id 4663) through the Pons launchpad - a live "the market plays X" site (a Node watcher turns Pons bonding-curve and Uniswap v4 trades into game/visual state over WebSocket), Railway + Vercel deployment, Magnific art (GPT Image 2.5 stills, Minimax H3 GIFs and videos), the Pons launch itself, a 24/7 X livestream and the launch-week posting campaign. Use it whenever the user wants to build or launch a (meme)coin, token or "coin with a site/game" on Robinhood Chain or Pons, asks for "the same setup as Plantoshi / IDDQD", needs launch assets (pfp, banner, announcement, GIFs, explainer video, stream thumbnail, posts), a Railway/Vercel env for a token site, a livestream on X, a rehearsal against a live Pons token, or post-launch content and community features - even when they only say "nieuw project", "nieuwe token", "launch" or "Pons".
---

# Robinhood Chain token launch playbook

Two shipped projects define the pattern this skill captures: **Plantoshi** (`Cryptoleee/flora`: a cartoon
plant that grows on buys and wilts on sells, Node server on Railway + Vite/React site on Vercel) and
**IDDQD** (`Cryptoleee/iddqd`: the order book plays Doom, one Node service on Railway that also composes its
own RTMP stream). Both do the same things in the same order:

1. an idea where **on-chain order flow drives something visible** (buys = good, sells = bad, whales = spectacle)
2. a Node service that **reads Robinhood Chain**, maps trades to actions, and streams state to browsers
3. **Railway** for the service (plus Vercel when the site is a separate SPA), a **prelaunch/demo mode** so the site is alive before the token exists
4. a **brand kit** in one locked cartoon style with Magnific (GPT Image 2.5 stills, Minimax H3 motion)
5. the **Pons launch**, one env switch, verification on `/health`
6. a **24/7 livestream** on X and a **two-posts-a-day campaign**

Use the phases below as a checklist. Read the reference file named in each phase before doing that phase;
they hold the addresses, event signatures, env templates, prompts and gotchas that took days to learn.

## Phase 0 - Kickoff (10 minutes, saves days)

Collect or decide, and write it down in the repo README before building:

- **Mechanic in one line**: "buys water the plant, sells wilt it, whales make it rain" / "buys run and shoot, sells turn away". Every later asset and post reuses this line.
- **Name, ticker, one-liner, domain, X handle** (check availability early; `plantoshi.fun` was bought before art was made).
- **Quote asset on Pons**: native ETH (default, `pairToken = 0x0`) or a tokenized stock such as NVDA for narrative. It decides how USD is valued (see `references/onchain.md`).
- **Launch moment** and what must be live by then (site in prelaunch mode, stream, thumbnail, first posts).
- **Art style**: the house style is flat cartoon stickers (thick black outlines, flat saturated colors, paper grain, kawaii faces). Lock one mascot image and one scene as references and reuse them for everything.
- **Budget**: roughly 100 Magnific credits per GPT image, ~920 per 10 s H3 video, and Railway needs ~2 vCPU for a 1080p stream. Say what a round will cost before generating a batch.

When the user says "same as last time", assume: ETH pair, Railway + Vercel, the flat cartoon style, Dutch conversation with English on-chain copy, and the campaign format below.

## Phase 1 - Build the live site

Start from the closest shipped repo rather than a blank page: copy `flora/server` for the chain plumbing
(watcher, Pons curve, Uniswap v4/v3/v2 decoding, quote pricing, persistence, admin endpoints) and either
`flora/web` (React scene) or `iddqd/public` (framework-free page). Keep the separation **chain -> trade
{side, usd, hash} -> mapper (pure, unit tested) -> visible state -> WebSocket**; the mapper is where each
project's personality lives and the only part that needs invention.

Non-negotiables learned the hard way (details in `references/onchain.md`):

- Watch **both** phases of a Pons token: `CurveBuy`/`CurveSell` on the per-token curve contract before graduation and Uniswap v4 `Swap` (or ERC-20 transfers against markets) after. Discover the curve from the factory's `TokenLaunched` event; detect graduation from the PoolManager `Initialize` log.
- Value trades from the **quote leg** (ETH via CoinGecko, stocks and other tokens via Dexscreener, stables = 1); derive the token price and market cap from the last trade until Dexscreener lists it.
- Use a **fallback list of public RPCs**, `eth_getLogs` in <=2000-block chunks, always with an `address` filter.
- Ship a **DEMO mode** (synthetic order flow) and a **PRELAUNCH mode** (launching-soon page, no chain reads) so the site can be deployed and screenshotted days before launch.
- Ship a **rehearsal script** that finds the busiest live Pons token so the whole pipeline is tested with strangers' trades (`scripts/find_pons_token.mjs`).
- Expose `GET /health` with head block, blocks behind, pools, launch block and last RPC error; expose `POST /admin/trade` (bearer token) to trigger events on camera.
- Do slow work (log scans, backfills) **after** the HTTP server listens, or the Railway health check kills the deploy.

Test the way the projects were tested: `npm test` for decoders and mappers with real captured logs, a local
DEMO server + built site under Playwright for screenshots (desktop and phone), and one live run against a
real Pons token before launch.

## Phase 2 - Deploy

Read `references/deploy.md`. Summary: Railway service per process (root directory set to the service
folder, Dockerfile, a volume for state, health check timeout in `railway.json`), Vercel for the SPA with
`VITE_WS_URL` baked at build time, all variables delivered to the user as a ready-to-paste raw block with
only the token address left open. Deploy in prelaunch mode first and verify `/health` and the site before
anything else is built on top.

Watch for the two silent failures: Vercel **blocks** deployments whose git author is not a member of the
Vercel team (commit with the environment's default identity), and Railway restarts a service whose start
takes longer than the health check timeout.

## Phase 3 - Brand kit and motion

Read `references/art-pipeline.md` before generating anything; it has the prompt boilerplate, the asset
list with sizes, the GIF and video pipelines and the download quirks. The order that worked: mascot pfp
and banner first, then the 3:2 announcement, teaser, explainer video, GIF pack, deep-dive infographics,
community image, stream thumbnail and end cards. Every generation passes the locked references; every
video is reviewed on a contact sheet before it is joined; every deliverable lands in `brand/` with a
README entry and is pushed.

## Phase 4 - Launch day

Read `references/launch-marketing.md` for the Pons form, the fee and bridging path, and the T-minus
checklist. The technical switch is one env edit on Railway (`PRELAUNCH` off, `TOKEN_ADDRESS` set,
`START_BLOCK` when deploying more than an hour after launch) followed by a `/health` check showing the
launch block and the curve pool. Do not reuse old plant/game state for a new token: state is keyed by
token address, and `/admin/reset` exists for the rest.

## Phase 5 - Livestream on X

The site needs a **stream page** (`?stream=1`: no controls, 16:9 overlay with brand, live stats, QR and a
trade ticker) or, like IDDQD, a broadcast frame composed server-side. Two routes to X Media Studio
Producer (RTMP URL + key, requires X Premium): OBS with a browser source on the user's own machine, or an
always-on Railway service (`flora/stream`: Xvfb + PulseAudio + Chromium + ffmpeg). Paste keys without
placeholder brackets; the source turns green 20-60 s after the first frames. Make the 1920x1080 thumbnail
with the same art pipeline. Keep licensed music out of the stream (X fingerprints audio).

## Phase 6 - After launch

Two posts a day for the first week (formats and text formulas in `references/launch-marketing.md`),
a "we keep growing" motivational piece once snipers are gone, then community features that reward
holding: wallet connect with hold-streak badges, a leaderboard by hold duration, whale alerts, day and
night cycles, seasonal events. Keep roadmap posts to things that are buildable in this codebase within a
week each.

## Working habits that kept these launches sane

- Verify every chain assumption against real logs (`toEventSelector`, captured fixtures in tests) before trusting docs or memory.
- Deliver configuration as complete raw env blocks; the user pastes, never edits by hand.
- Keep secrets in the user's own config only; flag `<>` and quotes that get pasted literally.
- Screenshot before claiming UI works; contact-sheet before claiming a video works; `/health` before claiming a deploy works.
- Commit and push after each deliverable with the environment's default git identity; artifacts go under `brand/` with a README line.
- Answer in the user's language (Dutch) and write on-chain and social copy in English unless asked otherwise.

## Pitfall index

| Symptom | Cause and fix |
|---|---|
| Site shows nothing during the bonding curve | Curve trades are Pons `CurveBuy`/`CurveSell` events, not swaps; watch the curve contract (`onchain.md`) |
| `eth_getLogs` rejected | Public RPCs refuse address-less filters and large ranges; filter by address, chunk 2000 blocks |
| Railway deploy loops | Start takes longer than `healthcheckTimeout`; listen first, scan later |
| Vercel deployment `BLOCKED` | Commit author not a team member; use the default git identity |
| X source stays grey | Wrong key (often `<key>` pasted literally), wrong root directory, or ffmpeg `End of file` right after connect |
| YouTube embed "Video unavailable" on the stream | Datacenter IP; use OBS on a PC or a local audio file |
| Magnific download fails with TLS errors | Retry with the proxy CA bundle (`scripts/dl.sh`) |
| H3 video stutters or ends mid-gesture | More than five beats, or the last beat did not "hold completely still"; chain segments via last frame |
| Labels stretched over the whole frame | A label/status class collided with an existing CSS class; prefix classes |
| Magnific: "Reference image flagged by moderation" on every generation | The reference itself is refused (Plantoshi-style cartoons never were; the photoreal Pitbull creature was, because of visible animal genitals). Upload a head-and-torso crop as the reference instead: the same face and design pass, and GPT Image 2.5 rebuilds the full body from the prompt |
