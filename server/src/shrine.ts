import type { Milestone, PriceInfo, ShrineState, Trade } from './protocol.js';

/**
 * The prophecy: lore milestones tied to market cap. Reached once, never lost
 * (they follow the all-time-high, not the current cap).
 */
export const MILESTONES: Milestone[] = [
  { index: 0, name: 'The Sighting', mcapUsd: 50_000, line: 'A shape on the desert road. Horns. Aviators. It flexes.' },
  { index: 1, name: 'The Awakening', mcapUsd: 250_000, line: 'The beast has smelled the wealth.' },
  { index: 2, name: 'The Flex', mcapUsd: 1_000_000, line: 'Both arms up. The charts bow.' },
  { index: 3, name: 'Mr. Wealthwide', mcapUsd: 5_000_000, line: 'Every timezone. Every bag.' },
  { index: 4, name: 'The Stampede', mcapUsd: 25_000_000, line: 'The herd follows the beast.' },
  { index: 5, name: 'Worldwide', mcapUsd: 100_000_000, line: 'Nobody laughed. Everybody held.' },
  { index: 6, name: 'DALE.', mcapUsd: 1_000_000_000, line: 'The prophecy is complete.' },
];

export const emptyState = (): ShrineState => ({
  launchedAt: null,
  trades: 0,
  buys: 0,
  sells: 0,
  volumeUsd: 0,
  athMcapUsd: 0,
  athAt: null,
  athPriceUsd: 0,
  holders: 0,
  peakHolders: 0,
  prophecy: -1,
  lastTradeAt: null,
  updatedAt: Date.now(),
});

/** Highest milestone index whose threshold is at or below `mcap` (-1 when none). */
export function milestoneFor(mcap: number, milestones: Milestone[] = MILESTONES): number {
  let idx = -1;
  for (const m of milestones) if (mcap >= m.mcapUsd) idx = m.index;
  return idx;
}

/**
 * Aggregates on-chain activity into the numbers the shrine shows. Pure and
 * synchronous: every method returns the milestones newly reached (usually none)
 * so the caller can announce them.
 */
export class Shrine {
  state: ShrineState;

  constructor(initial: ShrineState | null = null, private readonly milestones: Milestone[] = MILESTONES) {
    this.state = initial ? { ...emptyState(), ...initial } : emptyState();
  }

  snapshot(): ShrineState {
    return { ...this.state };
  }

  reset(): ShrineState {
    this.state = emptyState();
    return this.snapshot();
  }

  setLaunchedAt(ts: number) {
    if (this.state.launchedAt === null || ts < this.state.launchedAt) {
      this.state.launchedAt = ts;
      this.state.updatedAt = Date.now();
    }
  }

  applyTrade(trade: Trade): Milestone[] {
    const s = this.state;
    s.trades++;
    if (trade.side === 'buy') s.buys++;
    else s.sells++;
    s.volumeUsd += trade.usd;
    s.lastTradeAt = trade.ts;
    if (s.launchedAt === null) s.launchedAt = trade.ts;
    if (trade.priceUsd > s.athPriceUsd) s.athPriceUsd = trade.priceUsd;
    s.updatedAt = Date.now();
    return [];
  }

  /** Records a price/market-cap observation; returns milestones newly reached by a new ATH. */
  applyPrice(price: PriceInfo, at = Date.now()): Milestone[] {
    const s = this.state;
    const reached: Milestone[] = [];
    if (price.usd > s.athPriceUsd) s.athPriceUsd = price.usd;
    const mcap = price.marketCapUsd ?? 0;
    if (mcap > s.athMcapUsd) {
      s.athMcapUsd = mcap;
      s.athAt = at;
      const idx = milestoneFor(mcap, this.milestones);
      for (let i = s.prophecy + 1; i <= idx; i++) reached.push(this.milestones[i]);
      if (idx > s.prophecy) s.prophecy = idx;
    }
    s.updatedAt = Date.now();
    return reached;
  }

  setHolders(count: number) {
    const s = this.state;
    if (count === s.holders) return false;
    s.holders = count;
    if (count > s.peakHolders) s.peakHolders = count;
    s.updatedAt = Date.now();
    return true;
  }
}
