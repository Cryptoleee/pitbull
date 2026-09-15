import { createPublicClient, fallback, http, parseAbi, type Hex } from 'viem';
import { config } from './config.js';
import { DemoFeed, type DemoTrade } from './demo.js';
import { Holders, type Transfer } from './holders.js';
import { isStable, Market, parseExtraPools, type PoolInfo } from './market.js';
import type { PriceInfo, ServerMessage, ShrineState, TokenInfo, Trade } from './protocol.js';
import { curvePool, findLaunch, NATIVE as NATIVE_ADDR, PONS, type V4Pool } from './pons.js';
import { QuotePrices } from './prices.js';
import { createServer } from './server.js';
import { MILESTONES, Shrine } from './shrine.js';
import { Store } from './store.js';
import { Watcher, type RawSwap } from './watcher.js';

const ERC20_ABI = parseAbi(['function decimals() view returns (uint8)', 'function symbol() view returns (string)', 'function name() view returns (string)', 'function totalSupply() view returns (uint256)']);
const NATIVE = '0x0000000000000000000000000000000000000000';
const startedAt = Date.now();

/** LAUNCH_AT as ms epoch: ISO 8601 or a number (seconds or ms). */
function parseLaunchAt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) {
    console.warn(`[config] LAUNCH_AT="${raw}" is not a date, ignoring`);
    return null;
  }
  return t;
}

async function main() {
  const prelaunch = config.prelaunch;
  if (!prelaunch && config.tokenAddress === NATIVE) throw new Error('TOKEN_ADDRESS is required unless PRELAUNCH=1');
  console.log(`[pitbull] token ${config.tokenAddress} on chain ${config.chainId} via ${config.rpcUrls.join(', ')}`);
  console.log(`[pitbull] pool manager ${config.poolManager}, data dir ${config.dataDir}`);
  if (prelaunch) console.log('[pitbull] PRELAUNCH mode: not watching any token, serving the launching-soon page');
  const launchAt = parseLaunchAt(config.launchAt);
  const store = new Store(config.dataDir);
  const persisted = prelaunch ? null : store.load();
  const resume = persisted && persisted.token === config.tokenAddress ? persisted : null;
  if (persisted && !resume) console.log('[pitbull] persisted state belongs to another token, starting fresh');
  if (resume) console.log(`[pitbull] resumed state: ${resume.state.trades} trades, ${resume.state.holders} holders, ATH $${Math.round(resume.state.athMcapUsd)}, last block ${resume.lastBlock}`);

  const shrine = new Shrine(resume?.state ?? null);
  let recent: Trade[] = resume?.recent ?? [];

  const rpc = createPublicClient({
    transport: config.rpcUrls.length === 1 ? http(config.rpcUrls[0], { timeout: 15000 }) : fallback(config.rpcUrls.map((u) => http(u, { timeout: 15000 })), { rank: false }),
  });
  const decimalsCache = new Map<string, number>([[NATIVE, 18]]);
  async function decimalsOf(address: string): Promise<number> {
    const key = address.toLowerCase();
    const cached = decimalsCache.get(key);
    if (cached !== undefined) return cached;
    try {
      const d = await rpc.readContract({ address: key as Hex, abi: ERC20_ABI, functionName: 'decimals' });
      decimalsCache.set(key, Number(d));
      return Number(d);
    } catch (err) {
      console.warn(`[pitbull] decimals() failed for ${key}, assuming 18:`, (err as Error).message);
      decimalsCache.set(key, 18);
      return 18;
    }
  }

  const market = new Market(config.dexscreenerChain, config.tokenAddress, config.marketRefreshMs, parseExtraPools(config.extraPools, config.tokenAddress));
  if (!prelaunch) await market.refresh();
  const tokenDecimals = prelaunch ? 18 : await decimalsOf(config.tokenAddress);
  let symbol = prelaunch ? config.launchSymbol : market.symbol;
  let name = prelaunch ? config.launchName : market.name;
  if (!prelaunch && symbol === 'TOKEN') {
    try {
      symbol = await rpc.readContract({ address: config.tokenAddress as Hex, abi: ERC20_ABI, functionName: 'symbol' });
      name = await rpc.readContract({ address: config.tokenAddress as Hex, abi: ERC20_ABI, functionName: 'name' });
    } catch {
      // not an ERC-20 we can read (demo address): fall back to the configured launch name
      symbol = config.launchSymbol;
      name = config.launchName;
    }
  }
  let totalSupplyTokens: number | null = null;
  if (!prelaunch) {
    try {
      totalSupplyTokens = Number(await rpc.readContract({ address: config.tokenAddress as Hex, abi: ERC20_ABI, functionName: 'totalSupply' })) / 10 ** tokenDecimals;
    } catch {
      /* optional */
    }
  }
  const token: TokenInfo = {
    address: prelaunch ? '' : config.tokenAddress,
    symbol,
    name,
    decimals: tokenDecimals,
    chainId: config.chainId,
    chainName: config.chainName,
    explorerUrl: config.explorerUrl,
    dexChain: config.dexscreenerChain,
    totalSupply: totalSupplyTokens ?? undefined,
  };
  console.log(`[pitbull] ${token.symbol} (${token.name}), ${tokenDecimals} decimals, supply ${totalSupplyTokens ?? '?'}, ${market.pools.size} pools`);

  // Holders: every wallet with a real balance, contracts excluded. The curve is added once it is found.
  const holders = new Holders(
    { ignore: [config.poolManager, config.ponsFactory, PONS.router, PONS.hook, ...config.holderIgnore], minBalance: BigInt(Math.max(0, Math.round(config.holderMinTokens * 10 ** Math.min(tokenDecimals, 6)))) * 10n ** BigInt(Math.max(0, tokenDecimals - 6)) },
    resume?.balances,
  );
  if (resume?.balances) console.log(`[holders] resumed ${holders.tracked} balances, ${holders.count} holders`);

  async function symbolOf(address: string): Promise<string> {
    if (address === NATIVE_ADDR) return 'ETH';
    try {
      return await rpc.readContract({ address: address as Hex, abi: ERC20_ABI, functionName: 'symbol' });
    } catch {
      return address.slice(0, 6);
    }
  }
  const quotePrices = new QuotePrices(config.dexscreenerChain);

  const watcher = new Watcher(
    {
      rpcUrls: config.rpcUrls,
      poolManager: config.poolManager,
      token: config.tokenAddress,
      pollMs: config.pollMs,
      maxBlockRange: config.maxBlockRange,
      maxCatchupBlocks: config.maxCatchupBlocks,
      startBlock: config.startBlock,
      trackTransfers: config.holders,
    },
    resume?.lastBlock ?? null,
  );

  async function applyPools(pools: PoolInfo[]) {
    await Promise.all(pools.map((p) => decimalsOf(p.quoteAddress)));
    quotePrices.track(pools.map((p) => ({ address: p.quoteAddress, symbol: p.quoteSymbol })));
    watcher.setPools(pools);
    for (const p of pools) {
      if (p.kind === 'v3' || p.kind === 'v2' || p.kind === 'pons') holders.exclude(p.id);
      console.log(`[pitbull]   pool ${p.kind} ${p.id.slice(0, 12)}… ${token.symbol}/${p.quoteSymbol} liq $${Math.round(p.liquidityUsd)}`);
    }
  }

  // Pons launchpad: find the token's bonding curve so trades and holders count from the very first
  // buy, and watch for the Uniswap v4 pool that appears at graduation. Runs after the HTTP server
  // is listening (see the bottom of this file) because the log scans can take a while on public RPCs.
  let ponsLaunchBlock: number | null = null;
  async function discoverPons() {
    const head = Number(await rpc.getBlockNumber());
    let curve: { curve: string; pairToken: string; block: number } | null = null;
    if (config.ponsCurve && /^0x[0-9a-f]{40}$/.test(config.ponsCurve)) {
      curve = { curve: config.ponsCurve, pairToken: config.ponsPair && /^0x[0-9a-f]{40}$/.test(config.ponsPair) ? config.ponsPair : NATIVE_ADDR, block: config.startBlock ?? head };
      console.log(`[pons] using curve ${curve.curve} from PONS_CURVE`);
    } else {
      try {
        const launch = await findLaunch(rpc, config.tokenAddress, { head, fromBlock: config.startBlock, lookback: config.ponsLookbackBlocks, chunk: config.maxBlockRange, factory: config.ponsFactory });
        if (launch) {
          curve = launch;
          console.log(`[pons] launch found at block ${launch.block}: curve ${launch.curve}, pair ${launch.pairToken === NATIVE_ADDR ? 'ETH' : launch.pairToken}, deployer ${launch.deployer}`);
        } else {
          console.log(`[pons] no TokenLaunched event for ${config.tokenAddress} in the scanned range (set START_BLOCK to the launch block or PONS_CURVE); watching Uniswap pools only`);
        }
      } catch (err) {
        console.warn('[pons] launch scan failed:', (err as Error).message);
      }
    }
    if (curve) {
      ponsLaunchBlock = curve.block;
      holders.exclude(curve.curve);
      const quoteSymbol = await symbolOf(curve.pairToken);
      market.addPool(curvePool({ token: config.tokenAddress, curve: curve.curve, deployer: '', pairToken: curve.pairToken, graduationThreshold: 0n, block: curve.block, txHash: '' }, quoteSymbol));
      if (config.startBlock === undefined && watcher.lastBlock === null) {
        // fresh start: replay the curve from the launch block so early buys and holders count
        watcher.lastBlock = curve.block - 1;
        watcher.skipCatchupCapOnce = true;
        console.log(`[pons] replaying trades from launch block ${curve.block}`);
      }
      if (shrine.state.launchedAt === null) {
        try {
          const block = await rpc.getBlock({ blockNumber: BigInt(curve.block) });
          shrine.setLaunchedAt(Number(block.timestamp) * 1000);
          console.log(`[pons] launched at ${new Date(shrine.state.launchedAt!).toISOString()}`);
          scheduleState();
        } catch (err) {
          console.warn('[pons] could not read the launch block time:', (err as Error).message);
        }
      }
    }
  }
  market.on('pools', (pools: PoolInfo[]) => void applyPools(pools));
  watcher.on('graduated', (pool: V4Pool) => {
    void (async () => {
      const quoteAddress = pool.currency0 === config.tokenAddress ? pool.currency1 : pool.currency0;
      const quoteSymbol = await symbolOf(quoteAddress);
      console.log(`[pons] graduated: Uniswap v4 pool ${pool.id.slice(0, 12)}… ${token.symbol}/${quoteSymbol} (hook ${pool.hooks === PONS.hook ? 'pons' : pool.hooks}) at block ${pool.block}`);
      market.addPool({ id: pool.id, kind: 'v4', quoteSymbol, quoteAddress, tokenIsCurrency0: pool.currency0 === config.tokenAddress, liquidityUsd: 0, volume24hUsd: 0 });
    })();
  });
  async function backfillGraduation() {
    if (ponsLaunchBlock === null || market.poolList().some((p) => p.kind === 'v4')) return;
    // the curve may already have graduated before we started
    try {
      const head = Number(await rpc.getBlockNumber());
      await watcher.checkGraduation(ponsLaunchBlock, head);
    } catch (err) {
      console.warn('[pons] graduation backfill failed:', (err as Error).message);
    }
  }

  const hello = (): ServerMessage => ({
    type: 'hello',
    state: shrine.snapshot(),
    token,
    price: market.price,
    milestones: MILESTONES,
    demo: config.demo,
    prelaunch,
    launchAt,
    serverTime: Date.now(),
  });

  const persist = () =>
    prelaunch
      ? undefined
      : store.save({
          version: 1,
          token: config.tokenAddress,
          state: shrine.snapshot(),
          recent: recent.slice(0, config.recentLimit),
          lastBlock: watcher.lastBlock,
          savedAt: Date.now(),
          balances: config.holders ? holders.toJSON() : undefined,
        });

  const app = createServer({
    hello,
    trades: (limit) => recent.slice(0, limit),
    holders: (limit) => holders.top(limit).map((h) => ({ address: h.address, balance: h.balance.toString() })),
    health: () => ({
      ok: true,
      token: token.symbol,
      prelaunch,
      demo: config.demo,
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      head: watcher.head,
      lastBlock: watcher.lastBlock,
      blocksBehind: watcher.lastBlock === null ? null : watcher.head - watcher.lastBlock,
      lastPollAt: watcher.lastPollAt || null,
      swapsSeen: watcher.swapsSeen,
      transfersSeen: watcher.transfersSeen,
      rpc: { urls: config.rpcUrls, failures: watcher.failures, lastError: watcher.lastError },
      pools: market.poolList().map((p) => ({ kind: p.kind, id: p.id, quote: p.quoteSymbol })),
      pons: { launchBlock: ponsLaunchBlock, watchingGraduation: watcher.watchGraduation },
      holders: { count: holders.count, tracked: holders.tracked, enabled: config.holders },
      clients: app.clientCount(),
      price: market.price.usd,
      marketCapUsd: market.price.marketCapUsd ?? null,
      launchAt,
      state: shrine.snapshot(),
      persistent: store.writable,
      dataDir: config.dataDir,
      volumeMountPath: process.env.RAILWAY_VOLUME_MOUNT_PATH ?? null,
      poolManager: config.poolManager,
      tokenAddress: config.tokenAddress,
    }),
    reset: () => {
      const state = shrine.reset();
      recent = [];
      persist();
      console.log('[pitbull] state reset by admin');
      return state;
    },
    inject: (side, usd) => {
      const price = market.price.usd > 0 ? market.price.usd : 0.00003;
      ingest({
        id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        side,
        tokenAmount: usd / price,
        usd,
        priceUsd: price,
        pool: 'admin',
        poolKind: 'demo',
        quote: 'USDG',
        txHash: '0x' + 'a'.repeat(64),
        block: watcher.head,
        ts: Date.now(),
      });
      return shrine.snapshot();
    },
    adminToken: config.adminToken,
    corsOrigin: config.corsOrigin,
  });

  // State broadcasts are coalesced: many transfers or trades in one block become one message.
  let stateTimer: NodeJS.Timeout | null = null;
  function scheduleState(delayMs = 400) {
    if (stateTimer) return;
    stateTimer = setTimeout(() => {
      stateTimer = null;
      app.broadcast({ type: 'state', state: shrine.snapshot() });
      persist();
    }, delayMs);
  }
  function applyPrice(price: PriceInfo) {
    const reached = shrine.applyPrice(price);
    app.broadcast({ type: 'price', price, state: shrine.snapshot() });
    for (const m of reached) {
      console.log(`[prophecy] ${m.name} reached at $${Math.round(price.marketCapUsd ?? 0)} market cap — ${m.line}`);
      app.broadcast({ type: 'milestone', milestone: m, state: shrine.snapshot() });
    }
    persist();
  }

  const seen = new Set<string>();
  function ingest(trade: Trade) {
    if (seen.has(trade.id)) return;
    seen.add(trade.id);
    if (seen.size > 5000) {
      const iter = seen.values();
      for (let i = 0; i < 1000; i++) seen.delete(iter.next().value as string);
    }
    shrine.applyTrade(trade);
    recent.unshift(trade);
    if (recent.length > config.recentLimit) recent.length = config.recentLimit;
    scheduleState();
    const arrow = trade.side === 'buy' ? '▲' : '▼';
    const s = shrine.state;
    console.log(`[trade] ${arrow} ${trade.side.toUpperCase().padEnd(4)} $${trade.usd.toFixed(2).padStart(10)} ${trade.quote.padEnd(5)} → ${s.trades} trades, $${Math.round(s.volumeUsd)} volume, ${s.holders} holders`);
  }

  // Swaps seen before the quote asset has a USD price are parked and replayed once the price arrives,
  // so the first buys after launch are never dropped by a slow price API.
  const pendingSwaps: RawSwap[] = [];
  const flushPending = () => {
    const batch = pendingSwaps.splice(0, pendingSwaps.length);
    for (const raw of batch) handleSwap(raw, true);
  };
  const handleSwap = (raw: RawSwap, retry = false) => {
    const side = raw.tokenDelta > 0n ? 'buy' : 'sell';
    const tokenAmount = Math.abs(Number(raw.tokenDelta)) / 10 ** tokenDecimals;
    let usd: number;
    const quoteDecimals = decimalsCache.get(raw.pool.quoteAddress);
    const quoteAmount = quoteDecimals !== undefined && raw.quoteDelta !== 0n ? Math.abs(Number(raw.quoteDelta)) / 10 ** quoteDecimals : 0;
    const quoteUsd = quotePrices.get(raw.pool.quoteAddress, raw.pool.quoteSymbol);
    if (isStable(raw.pool.quoteSymbol) && quoteAmount > 0) {
      usd = quoteAmount;
    } else if (quoteUsd && quoteAmount > 0) {
      usd = quoteAmount * quoteUsd;
    } else if (market.price.usd > 0) {
      usd = tokenAmount * market.price.usd;
    } else if (!retry && pendingSwaps.length < 2000) {
      pendingSwaps.push(raw);
      if (pendingSwaps.length === 1) console.warn('[pitbull] no USD price yet, holding swaps until the quote price arrives');
      void quotePrices.refreshOne(raw.pool.quoteAddress).then(flushPending);
      return;
    } else {
      console.warn('[pitbull] no USD price, dropping swap', raw.txHash);
      return;
    }
    if (!Number.isFinite(usd) || usd < config.minTradeUsd) return;
    if (raw.pool.kind === 'pons' && tokenAmount > 0) market.setDerived(usd / tokenAmount, totalSupplyTokens);
    ingest({
      id: `${raw.txHash}:${raw.logIndex}`,
      side,
      tokenAmount,
      usd,
      priceUsd: tokenAmount > 0 ? usd / tokenAmount : market.price.usd,
      pool: raw.pool.id,
      poolKind: raw.pool.kind,
      quote: raw.pool.quoteSymbol,
      txHash: raw.txHash,
      block: raw.block,
      ts: Date.now(),
    });
  };
  watcher.on('swap', (raw: RawSwap) => handleSwap(raw));
  watcher.on('transfer', (t: Transfer) => {
    if (holders.apply(t) && shrine.setHolders(holders.count)) scheduleState();
  });
  watcher.on('block', () => persist());
  market.on('price', (price: PriceInfo) => applyPrice(price));

  if (config.demo && !prelaunch) {
    console.log('[pitbull] DEMO mode: emitting synthetic trades, holders and prices');
    const demo = new DemoFeed();
    const supply = totalSupplyTokens ?? 1_000_000_000;
    let price = market.price.usd > 0 ? market.price.usd : 30_000 / supply;
    let demoHolders = shrine.state.holders;
    let n = 0;
    demo.on('trade', (t: DemoTrade) => {
      // a random walk with an upward drift, sized by the trade
      const impact = Math.min(0.08, Math.sqrt(t.usd) / 900);
      price *= t.side === 'buy' ? 1 + impact : 1 - impact * 0.6;
      ingest({ id: `demo-${Date.now()}-${n++}`, side: t.side, tokenAmount: t.usd / price, usd: t.usd, priceUsd: price, pool: 'demo', poolKind: 'demo', quote: 'ETH', txHash: '0x' + 'd'.repeat(64), block: watcher.head, ts: Date.now() });
      if (t.newHolder) demoHolders++;
      else if (t.side === 'sell' && Math.random() < 0.3 && demoHolders > 3) demoHolders--;
      if (shrine.setHolders(demoHolders)) scheduleState();
      applyPrice({ usd: price, updatedAt: Date.now(), derived: true, marketCapUsd: price * supply, volume24hUsd: shrine.state.volumeUsd, liquidityUsd: price * supply * 0.12 });
    });
    demo.start();
  }

  setInterval(() => app.broadcast({ type: 'state', state: shrine.snapshot() }), 30000).unref();

  app.server.listen(config.port, () => console.log(`[pitbull] listening on :${config.port} (ws at /ws)`));

  if (!prelaunch && !config.demo) {
    // Start watching once the server answers health checks: pool discovery can take a while.
    void (async () => {
      if (config.pons) await discoverPons();
      await applyPools(market.poolList());
      quotePrices.start();
      if (!(await quotePrices.ready(8000))) console.warn('[prices] quote price not available yet, swaps will be held until it arrives');
      market.start();
      watcher.start();
      await backfillGraduation();
    })().catch((err) => console.error('[pitbull] failed to start watching:', (err as Error).message));
  }

  const shutdown = (signal: string) => {
    console.log(`[pitbull] ${signal}, shutting down`);
    watcher.stop();
    market.stop();
    store.flush();
    app.close();
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[pitbull] fatal:', err);
  process.exit(1);
});
