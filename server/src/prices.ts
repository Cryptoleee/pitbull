import { isStable } from './market.js';
import { NATIVE } from './pons.js';

interface DexPair {
  chainId: string;
  baseToken: { address: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
}

const fetchJson = async (url: string) => {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
};

/**
 * USD prices of quote assets (ETH, tokenized stocks, ...) so that every trade can be
 * valued from the quote leg, which is exact and works on a bonding curve where
 * Dexscreener has no price for the token itself.
 */
export class QuotePrices {
  private prices = new Map<string, { usd: number; at: number }>();
  private tracked = new Map<string, string>();
  private timer: NodeJS.Timeout | null = null;
  private inflight = new Map<string, Promise<void>>();

  constructor(
    private readonly chain: string,
    private readonly refreshMs = 60_000,
  ) {}

  private isEth(address: string, symbol: string) {
    return address === NATIVE || /^W?ETH$/i.test(symbol);
  }

  track(quotes: { address: string; symbol: string }[]) {
    for (const q of quotes) {
      const address = q.address.toLowerCase();
      if (isStable(q.symbol)) continue;
      if (!this.tracked.has(address)) {
        this.tracked.set(address, q.symbol);
        void this.refreshOne(address);
      }
    }
  }

  /** Last known USD price of a quote asset, 1 for stables, undefined when unknown. */
  get(address: string, symbol: string): number | undefined {
    if (isStable(symbol)) return 1;
    return this.prices.get(address.toLowerCase())?.usd;
  }

  ageMs(address: string): number | null {
    const p = this.prices.get(address.toLowerCase());
    return p ? Date.now() - p.at : null;
  }

  /** Resolves once every tracked quote has a price, or after timeoutMs (so a slow price API never blocks the watcher for long). */
  async ready(timeoutMs = 8000): Promise<boolean> {
    const missing = [...this.tracked.keys()].filter((a) => !this.prices.has(a));
    if (missing.length === 0) return true;
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const all = Promise.all(missing.map((a) => this.refreshOne(a))).then(() => missing.every((a) => this.prices.has(a)));
    const ok = await Promise.race([all, timeout]);
    if (timer) clearTimeout(timer);
    return ok;
  }

  refreshOne(address: string): Promise<void> {
    const running = this.inflight.get(address);
    if (running) return running;
    const job = this.doRefresh(address).finally(() => this.inflight.delete(address));
    this.inflight.set(address, job);
    return job;
  }

  private async doRefresh(address: string) {
    try {
      const symbol = this.tracked.get(address) ?? '';
      const usd = this.isEth(address, symbol) ? await this.ethPrice() : await this.tokenPrice(address);
      if (usd && Number.isFinite(usd) && usd > 0) {
        const prev = this.prices.get(address);
        this.prices.set(address, { usd, at: Date.now() });
        if (!prev) console.log(`[prices] ${symbol || address} = $${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
      }
    } catch (err) {
      console.warn('[prices] refresh failed for', address, (err as Error).message);
    }
  }

  private async tokenPrice(address: string): Promise<number | undefined> {
    const pairs = (await fetchJson(`https://api.dexscreener.com/tokens/v1/${this.chain}/${address}`)) as DexPair[];
    let best: DexPair | undefined;
    for (const p of Array.isArray(pairs) ? pairs : []) {
      if (p.baseToken.address.toLowerCase() !== address || !p.priceUsd) continue;
      if (!best || (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0)) best = p;
    }
    return best ? Number(best.priceUsd) : undefined;
  }

  private async ethPrice(): Promise<number | undefined> {
    try {
      const j = (await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')) as { ethereum?: { usd?: number } };
      if (j.ethereum?.usd) return j.ethereum.usd;
    } catch {
      /* fall through */
    }
    const j = (await fetchJson('https://api.dexscreener.com/latest/dex/search?q=WETH%20USDC')) as { pairs?: DexPair[] };
    let best: DexPair | undefined;
    for (const p of j.pairs ?? []) {
      if (!/^W?ETH$/i.test(p.baseToken.symbol) || !isStable(p.quoteToken.symbol) || !p.priceUsd) continue;
      if (!best || (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0)) best = p;
    }
    return best ? Number(best.priceUsd) : undefined;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      for (const address of this.tracked.keys()) void this.refreshOne(address);
    }, this.refreshMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
