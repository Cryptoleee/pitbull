# Launch day, livestream and the posting campaign

## Pons launch (https://www.ponsfamily.com)

- Form: name, ticker, one-liner description (the mechanic line), **website** and **X** (aggregators such as Fomo and Dexscreener read these from the launch metadata; a missing website there is why an earlier token showed none), image (the pfp), quote asset.
- Quote asset: native ETH by default; a tokenized stock (NVDA for a "the order book plays Doom" narrative) is a legitimate hook but makes USD valuation depend on the stock price feed.
- Launch fee is paid in **ETH on Robinhood Chain**. Easiest way to fund the launch wallet: send ETH on Ethereum mainnet ("ERC-20 network" at the exchange) from any exchange to a **Phantom** wallet, then use Phantom's built-in swap to sell that ETH for **ETH on Robinhood Chain**; Phantom supports the chain and works as the launch wallet. Exchanges (Kraken included) do not withdraw to Robinhood Chain directly, and the alternative (withdraw to Arbitrum or Base, then Robinhood's bridge) has more steps. Do this a day early: swaps and bridges can take a while.
- The curve graduates to a Uniswap v4 pool with the Pons hook once the threshold is hit; nothing changes in the deployment.

## T-minus checklist

| When | Do |
|---|---|
| T-1 day | site live in `PRELAUNCH=1`; stream page and streamer tested (`OUTPUT` recording); thumbnail, announcement, first posts ready; Phantom wallet funded with ETH on Robinhood Chain (exchange -> ETH mainnet -> Phantom -> swap to Robinhood Chain) |
| T-1 h | X Producer source created (RTMP URL + key, no brackets), streamer service running against the prelaunch page, Producer shows the preview |
| T-0 | launch on Pons; copy the token address and launch block from the explorer |
| T+2 min | Railway: remove `PRELAUNCH`, set `TOKEN_ADDRESS` (and `START_BLOCK` if late), save; watch logs for `launch found at block`, `replaying trades`, `[trade]` lines |
| T+5 min | `GET /health`: `pons.launchBlock` set, `pools` has the curve; site shows trades; stream shows the plant/game; post the launch tweet with the stream quoted |
| T+1 h | check graduation detection if the curve filled; pin the launch post; reply with the stream link |

## Livestream on X

- X Media Studio -> Producer -> Create source (RTMP) gives `rtmp://va.pscp.tv:80/x` (and an `rtmps://...:443/x` twin) plus a key. Requires X Premium. Create the broadcast, attach the source, set title and thumbnail (1920x1080 JPG), go live once the preview shows.
- Quick route: OBS on the user's machine, browser source = the stream page at 1920x1080, "Control audio via OBS", Settings -> Stream -> Custom with URL + key. Music can be added in OBS.
- Always-on route: the `stream/` Railway service (`flora/stream`): Xvfb + PulseAudio null sink + Chromium kiosk + ffmpeg x11grab/pulse -> RTMP, restarts ffmpeg on drops, prints `[stream]` phase lines, strips brackets/quotes from the key. About 2 vCPU at 1080p30; 720p30 at 3000k on a small plan. IDDQD instead composes a 1280x720 frame in Node and pushes it with ffmpeg (no browser).
- Grey source = no data arriving: read the streamer logs (`End of file` right after connect = wrong key or URL), check the root directory of the service, try the rtmps URL.
- X fingerprints audio: no copyrighted music on the stream. YouTube embeds do not play from datacenter IPs.

## Post copy

Formulas that carried the Plantoshi launch (English copy, Dutch conversation):

- **Hook + mechanic + CTA**: "Meet Plantoshi 🌻 A plant that lives on-chain. Buys water it, sells wilt it, whales make it rain. Watch it grow live: plantoshi.fun $PLANTOSHI"
- **Announcement**: the mechanic line, `$TICKER on Robinhood Chain`, url, "launching soon" or "LIVE".
- **Reassurance**: no wallet connect needed to watch; connect or paste an address only for badges.
- **Motivational after launch**: snipers out, community first, features shipped in the open, "we keep growing".
- **Realism rule**: only promise features buildable in this codebase within a week each (day/night cycle, per-holder sprout in a shared field, seasonal events, weekly awards, whale alerts); say "what's next", never "done".

## Launch-week campaign template (14 posts, two per day, 6 videos)

| Day | Morning | Evening |
|---|---|---|
| 1 | video: meet the mascot (wave, water, grow, thumbs-up) | image: how it works (3 panels: buy = water, sell = wilt, whale = rain) |
| 2 | image: hold badges catalog | video: whale rain |
| 3 | image: leaderboard (top gardeners by hold streak) | video: seed to space (camera tilts up) |
| 4 | image: join the garden (empty pot "this one's yours") | video: every trade changes the weather |
| 5 | image: roadmap signpost (5 realistic features) | video: diamond hands through the storm |
| 6 | image: OG seed badge locked in | video: night garden (cozy) |
| 7 | image: the plant never sleeps (live 24/7) | image: one week in, we keep growing |

Each video is one 10 s H3 segment from a GPT start frame plus a 2.5 s end card ("url · buy · hold · grow");
each image is a 16:9 GPT poster with the references. Deliver a `SCHEDULE.md` with slot, file and text.
Credits: ~8 500 for the whole week (7 videos, ~20 images).

## Community features that reward holding (all shipped in Plantoshi)

Wallet connect (EIP-1193, no SDK) or paste an address; server polls `balanceOf` every 10 min for
registered wallets only; hold streak = time since the balance last decreased; badges OG Seed (within 24 h
of launch), Gardener, Rooted 24 h, Deep Roots 3 d, Diamond Roots 7 d, Old Growth 30 d, Never Sold, Whale
(>= 0.5 % supply); leaderboard top 10 by hold duration with the viewer's own row appended.
