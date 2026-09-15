import { EventEmitter } from 'node:events';
import type { PriceInfo } from './protocol.js';

export type PoolKind = 'v4' | 'v3' | 'v2' | 'pons';

export interface PoolInfo {
  /** lowercase: 32-byte pool id for v4, 20-byte pair address for v3/v2 */
  id: string;
  kind: PoolKind;
  quoteSymbol: string;
  quoteAddress: string;
  /** true when the tracked token sorts before the quote token (currency0/token0) */
  tokenIsCurrency0: boolean;
  liquidityUsd: number;
  volume24hUsd: number;
}

export interface MarketSnapshot {
  pools: PoolInfo[];
  price: PriceInfo;
  symbol: string;
  name: string;
}

interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  labels?: string[] | null;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
}

const STABLES = new Set(['USDG', 'USDC', 'USDT', 'DAI', 'USDE', 'FDUSD', 'PYUSD']);

export function isStable(symbol: string) {
  return STABLES.has(symbol.toUpperCase());
}

export function poolKindOf(pair: DexPair): PoolKind | null {
  const addr = pair.pairAddress.toLowerCase();
  if (addr.length === 66) return 'v4';
  if (addr.length !== 42) return null;
  const labels = (pair.labels ?? []).map((l) => l.toLowerCase());
  if (labels.includes('v3')) return 'v3';
  if (labels.includes('v2') || labels.length === 0) return 'v2';
  // DLMM / CLMM forks etc. are not decoded.
  return null;
}

export function poolFromPair(pair: DexPair, token: string): PoolInfo | null {
  const kind = poolKindOf(pair);
  if (!kind) return null;
  const base = pair.baseToken.address.toLowerCase();
  const quote = pair.quoteToken.address.toLowerCase();
  const other = base === token ? pair.quoteToken : quote === token ? pair.baseToken : null;
  if (!other) return null;
  return {
    id: pair.pairAddress.toLowerCase(),
    kind,
    quoteSymbol: other.symbol,
    quoteAddress: other.address.toLowerCase(),
    tokenIsCurrency0: token < other.address.toLowerCase(),
    liquidityUsd: pair.liquidity?.usd ?? 0,
    volume24hUsd: pair.volume?.h24 ?? 0,
  };
}

/** Parses EXTRA_POOLS="v4:0xpoolid:USDG:0xquote,v3:0xpair:WETH:0xweth" */
export function parseExtraPools(spec: string, token: string): PoolInfo[] {
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [kind, id, quoteSymbol, quoteAddress] = s.split(':');
      if (!kind || !id || !quoteSymbol || !quoteAddress) throw new Error(`Bad EXTRA_POOLS entry: ${s}`);
      if (kind !== 'v4' && kind !== 'v3' && kind !== 'v2' && kind !== 'pons') throw new Error(`Bad pool kind in EXTRA_POOLS: ${kind}`);
      return {
        id: id.toLowerCase(),
        kind,
        quoteSymbol,
        quoteAddress: quoteAddress.toLowerCase(),
        tokenIsCurrency0: token < quoteAddress.toLowerCase(),
        liquidityUsd: 0,
        volume24hUsd: 0,
      };
    });
}

/**
 * Polls Dexscreener for the token's pools and USD price. Pools are only ever
 * added (never removed) so a flaky API response cannot drop a live pool.
 */
export class Market extends EventEmitter {
  pools = new Map<string, PoolInfo>();
  price: PriceInfo = { usd: 0, updatedAt: 0 };
  symbol = 'TOKEN';
  name = 'Token';
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly chain: string,
    private readonly token: string,
    private readonly refreshMs: number,
    extra: PoolInfo[] = [],
  ) {
    super();
    for (const p of extra) this.pools.set(p.id, p);
  }

  async refresh(): Promise<boolean> {
    const url = `https://api.dexscreener.com/token-pairs/v1/${this.chain}/${this.token}`;
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pairs = (await res.json()) as DexPair[];
      if (!Array.isArray(pairs)) throw new Error('unexpected response');
      let added = 0;
      let best: DexPair | null = null;
      let volume = 0;
      let liquidity = 0;
      for (const pair of pairs) {
        const pool = poolFromPair(pair, this.token);
        if (pool) {
          const existing = this.pools.get(pool.id);
          if (!existing) added++;
          this.pools.set(pool.id, pool);
        }
        volume += pair.volume?.h24 ?? 0;
        liquidity += pair.liquidity?.usd ?? 0;
        if (pair.baseToken.address.toLowerCase() === this.token && pair.priceUsd) {
          if (!best || (pair.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0)) best = pair;
        }
      }
      if (best) {
        this.symbol = best.baseToken.symbol;
        this.name = best.baseToken.name;
        const usd = Number(best.priceUsd);
        if (Number.isFinite(usd) && usd > 0) {
          this.price = {
            usd,
            updatedAt: Date.now(),
            derived: false,
            marketCapUsd: best.marketCap ?? best.fdv,
            volume24hUsd: volume,
            liquidityUsd: liquidity,
          };
          this.emit('price', this.price);
        }
      }
      if (added > 0) {
        console.log(`[market] tracking ${this.pools.size} pools (+${added})`);
        this.emit('pools', this.poolList());
      }
      return true;
    } catch (err) {
      console.warn('[market] refresh failed:', (err as Error).message);
      return false;
    }
  }

  poolList(): PoolInfo[] {
    return [...this.pools.values()];
  }

  /** Adds a pool discovered on chain (Pons curve, graduated v4 pool). */
  addPool(pool: PoolInfo): boolean {
    if (this.pools.has(pool.id)) return false;
    this.pools.set(pool.id, pool);
    console.log(`[market] tracking ${this.pools.size} pools (+1 ${pool.kind})`);
    this.emit('pools', this.poolList());
    return true;
  }

  /** Price derived from the last trade (bonding curve): used while Dexscreener has nothing fresh. */
  setDerived(usd: number, totalSupplyTokens: number | null) {
    if (!Number.isFinite(usd) || usd <= 0) return;
    const fresh = this.price.updatedAt > 0 && this.price.usd > 0 && Date.now() - this.price.updatedAt < 120_000 && !this.price.derived;
    if (fresh) return;
    this.price = { ...this.price, usd, updatedAt: Date.now(), marketCapUsd: totalSupplyTokens ? usd * totalSupplyTokens : this.price.marketCapUsd, derived: true };
    this.emit('price', this.price);
  }

  start() {
    if (this.timer) return;
    const tick = async () => {
      await this.refresh();
      this.timer = setTimeout(tick, this.refreshMs);
    };
    void tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
