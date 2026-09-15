// Shared wire protocol between server and web. Keep in sync with web/src/lib/protocol.ts.

export type TradeSide = 'buy' | 'sell';
export type PoolKind = 'v4' | 'v3' | 'v2' | 'pons' | 'demo';

/** A trade as observed on chain. Kept server-side for price derivation and /api/trades; browsers only get aggregates. */
export interface Trade {
  /** txHash:logIndex (or demo id) */
  id: string;
  side: TradeSide;
  /** token amount in whole tokens */
  tokenAmount: number;
  /** trade value in USD */
  usd: number;
  /** effective price used for this trade */
  priceUsd: number;
  pool: string;
  poolKind: PoolKind;
  quote: string;
  txHash: string;
  block: number;
  /** ms epoch when the trade was observed */
  ts: number;
}

/** A step of the prophecy: reached when the market cap first crosses `mcapUsd`. */
export interface Milestone {
  index: number;
  name: string;
  mcapUsd: number;
  /** one line of lore shown when it is reached */
  line: string;
}

export interface ShrineState {
  /** ms epoch of the launch (launch block time, or the first trade seen) */
  launchedAt: number | null;
  /** lifetime counters since launch */
  trades: number;
  buys: number;
  sells: number;
  volumeUsd: number;
  /** all-time-high market cap and when it was set */
  athMcapUsd: number;
  athAt: number | null;
  athPriceUsd: number;
  /** wallets holding at least HOLDER_MIN_TOKENS, contracts excluded */
  holders: number;
  /** highest holder count ever seen */
  peakHolders: number;
  /** index of the highest prophecy milestone reached (-1 = none) */
  prophecy: number;
  lastTradeAt: number | null;
  updatedAt: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  /** Dexscreener chain slug, e.g. "robinhood" */
  dexChain: string;
  /** total supply in whole tokens, when known */
  totalSupply?: number;
}

export interface PriceInfo {
  usd: number;
  /** true while the price is derived from the last bonding-curve trade instead of Dexscreener */
  derived?: boolean;
  updatedAt: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  liquidityUsd?: number;
}

export type ServerMessage =
  | {
      type: 'hello';
      state: ShrineState;
      token: TokenInfo;
      price: PriceInfo;
      milestones: Milestone[];
      demo: boolean;
      /** true before the token exists: the site shows the launching-soon page */
      prelaunch: boolean;
      /** planned launch moment (ms epoch) for the prelaunch countdown, when configured */
      launchAt: number | null;
      serverTime: number;
    }
  | { type: 'state'; state: ShrineState }
  | { type: 'price'; price: PriceInfo; state: ShrineState }
  | { type: 'milestone'; milestone: Milestone; state: ShrineState };
