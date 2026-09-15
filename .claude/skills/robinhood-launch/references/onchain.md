# Robinhood Chain and Pons: everything the watcher needs

## Chain

| Item | Value |
|---|---|
| Chain id / name | `4663` / Robinhood Chain (Arbitrum-style L2, ~0.1 s blocks, ~36 000 blocks per hour) |
| Public RPCs (use all four as a viem `fallback()` transport, `rank: false`) | `https://rpc.mainnet.chain.robinhood.com`, `https://robinhood-chain.gateway.tenderly.co`, `https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public`, `https://rpc-robinhood.blockmachine.io` |
| Explorer | `https://robinhoodchain.blockscout.com` (its REST API returns HTML from cloud sandboxes; use RPC logs instead) |
| Dexscreener chain slug | `robinhood` (`https://api.dexscreener.com/token-pairs/v1/robinhood/<token>`) |
| Uniswap v4 PoolManager | `0x8366a39cc670b4001a1121b8f6a443a643e40951` |
| Native ETH as pair token | `0x0000000000000000000000000000000000000000` (18 dec) |
| Tokenized stocks seen as pairs | NVDA `0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec` (18 dec), QQQ `0xd5f3879160bc7c32ebb4dc785f8a4f505888de68` (18 dec); USDG `0x5fc5360d0400a0fd4f2af552add042d716f1d168` (6 dec) |

RPC rules that cost hours when ignored: public nodes reject `eth_getLogs` without an `address` filter and
ranges above a few thousand blocks (use 2000-block chunks); the official node rate-limits log queries from
shared cloud IPs, so the fallback list is not optional; `viem`'s `http()` transport does not read the
sandbox proxy variables, but the chain is reachable directly.

## Pons launchpad (bonding curve -> Uniswap v4)

| Contract | Address |
|---|---|
| Factory (emits `TokenLaunched`, `PoolGraduated`, `LaunchSwept`) | `0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e` |
| Router (the `buyer`/`seller` in curve events; the user is `recipient`) | `0xe33e9e479df8802cb0866d5d05258bec4cf62948` |
| Meme hook on the graduated v4 pool | `0xe5e702641ea86f4ae6cc3cdaed2b886f976be044` |

Events (verified on chain with `toEventSelector`; the Bitquery docs were partly wrong):

```
TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)   0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607
CurveBuy(address indexed buyer, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 tax)      emitted by the curve contract
CurveSell(address indexed seller, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 tax)     emitted by the curve contract
PoolGraduated(address indexed token, uint256, uint256, uint256)                                                                  factory, at graduation
LaunchSwept(address indexed token, uint256, uint256)                                                                             factory
Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)   PoolManager, the v4 pool appearing
Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)   PoolManager (v4)
```

Lifecycle and how to watch it:

1. **Find the curve**: scan the factory for `TokenLaunched` with `topics[1] = token` (forward from `START_BLOCK`, or backward in chunks over a lookback of ~36 000 blocks). If the launch is older, take the curve address from the explorer and set it explicitly.
2. **Curve phase**: poll `eth_getLogs` on the curve address with topics `[[CurveBuy, CurveSell]]`. Trader perspective: buy => `tokenDelta = +tokensOut`, `quoteDelta = -quoteIn`; sell => `tokenDelta = -tokensIn`, `quoteDelta = +quoteOut`; the human is `recipient`. Replay from the launch block on a fresh start so the first buys count.
3. **Graduation**: every N polls (and once at startup as a backfill from the launch block) query PoolManager `Initialize` logs with the token as `currency1` (topic 3) or `currency0` (topic 2). The pool id is `topics[1]`; the hook address is the Pons hook. Add it as a v4 pool and keep the curve pool (it goes quiet). Some tokens graduate within a block of launch.
4. **Uniswap phase**: filter `Swap` on the PoolManager by pool id. v4 emits the swapper's balance delta (negative = paid); v3 emits pool deltas (sign flips); v2 emits in/out amounts. Dexscreener lists the pool within minutes and can be used to add v3/v2 pairs too.

Sign convention everywhere: **tokenDelta > 0 is a buy, < 0 a sell, from the trader's point of view.**

Two launch-day guards the watcher must have (both bit Plantoshi in review): wait for the quote price
(bounded, ~8 s) before the first poll and **park swaps that arrive without a USD price** until it lands,
otherwise the very first buys are dropped; and let an explicit replay (launch block or `START_BLOCK`)
exceed the normal catch-up cap once, otherwise a deploy more than an hour after launch silently skips the
early buys. Never run `/admin/reset` after the replay: state is keyed by token address anyway.

## Valuing a trade in USD

- Stable quote (USDG, USDC, USDT...): `usd = |quoteDelta|`.
- ETH quote: `usd = |quoteDelta| x ETH price` (CoinGecko `simple/price?ids=ethereum`, Dexscreener `search?q=WETH USDC` as fallback, refreshed every minute).
- Stock or other token quote: `usd = |quoteDelta| x` Dexscreener `tokens/v1/robinhood/<quote>` price (best-liquidity pair whose base is the quote).
- Fallback: token amount x Dexscreener token price once listed.
- During the curve, derive the token price (`usd / tokenAmount`) and market cap (`price x totalSupply()`) from each trade, marked `derived`, and prefer a fresh Dexscreener price (< 2 min) once it exists.

## Trade tiers and events (Plantoshi defaults, reuse them)

Tiers are a fraction of market cap with a floor and ceilings: small 0.02 %, medium 0.1 %, large 0.4 %,
whale 0.8 %, leviathan 3 % of cap; floor `TIER_MCAP_FLOOR` $60k; ceilings $25 / $250 / $2.5k / $10k / $50k.
Growth `6 x sqrt(usd)` for buys, `x0.3` negative for sells; whale buys get a bonus and a scene event, leviathan
buys a bigger one, big sells a negative event; consecutive buys build a streak multiplier. `MIN_TRADE_USD`
(0.25) drops dust.

## Rehearsing against a live token

Before your own launch, run the service against the busiest current Pons token: `node scripts/find_pons_token.mjs 6000`
(from a folder with `viem`) prints launches with trade counts and the latest graduations. Point
`TOKEN_ADDRESS` at a token with 100+ trades, watch `[pons] launch found`, `[prices] ETH = ...`, the trade
lines and `/health`; then at a token that just graduated to see the v4 pool being picked up. Memecoins go
quiet within an hour, so re-run the script on the day.

## Fixtures for tests

Capture two real logs (a `TokenLaunched` and a `CurveBuy`) with `eth_getLogs` and keep them as test
fixtures; assert the decoded fields, the sign convention, and the block number (hex vs decimal mistakes in
fixtures are the usual failing test).
