// Shared wire protocol between server and web. Keep in sync with server/src/protocol.ts.

export interface Milestone {
  index: number;
  name: string;
  mcapUsd: number;
  line: string;
}

export interface ShrineState {
  launchedAt: number | null;
  trades: number;
  buys: number;
  sells: number;
  volumeUsd: number;
  athMcapUsd: number;
  athAt: number | null;
  athPriceUsd: number;
  holders: number;
  peakHolders: number;
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
  dexChain: string;
  totalSupply?: number;
}

export interface PriceInfo {
  usd: number;
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
      prelaunch: boolean;
      launchAt: number | null;
      serverTime: number;
    }
  | { type: 'state'; state: ShrineState }
  | { type: 'price'; price: PriceInfo; state: ShrineState }
  | { type: 'milestone'; milestone: Milestone; state: ShrineState };
