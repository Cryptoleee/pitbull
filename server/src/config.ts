const env = (key: string, fallback?: string): string | undefined => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};

const num = (key: string, fallback: number): number => {
  const v = env(key);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid numeric env ${key}=${v}`);
  return n;
};

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

/** Reads an EVM address from env, tolerating a missing 0x prefix. Falls back (with a warning) or throws when invalid. */
const address = (key: string, fallback: string, fatal = false): string => {
  const raw = env(key);
  if (raw === undefined) return fallback.toLowerCase();
  let v = raw.trim().toLowerCase();
  if (/^[0-9a-f]{40}$/.test(v)) v = `0x${v}`;
  if (ADDRESS_RE.test(v)) return v;
  const msg = `Invalid ${key}="${raw}" (expected a 0x-prefixed 20-byte address)`;
  if (fatal) throw new Error(msg);
  console.warn(`[config] ${msg}, using default ${fallback}`);
  return fallback.toLowerCase();
};

/** Public endpoints that handle eth_getLogs over 2000-block ranges; appended as fallbacks unless RPC_FALLBACKS=0. */
export const DEFAULT_RPC_FALLBACKS = [
  'https://robinhood-chain.gateway.tenderly.co',
  'https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public',
  'https://rpc-robinhood.blockmachine.io',
];

const rpcUrls = (): string[] => {
  const primary = env('RPC_URL', 'https://rpc.mainnet.chain.robinhood.com')!
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const list = env('RPC_FALLBACKS', '1') === '0' ? primary : [...primary, ...DEFAULT_RPC_FALLBACKS];
  return [...new Set(list.map((u) => u.replace(/\/+$/, '')))];
};

const dataDir = (): string => {
  const explicit = env('DATA_DIR');
  const volume = env('RAILWAY_VOLUME_MOUNT_PATH');
  if (explicit && volume && !explicit.startsWith('/')) {
    console.warn(`[config] DATA_DIR="${explicit}" is relative but a Railway volume is mounted at ${volume}; using the volume`);
    return volume;
  }
  return explicit ?? volume ?? './data';
};

/** Comma-separated list of addresses, lowercased, invalid entries dropped with a warning. */
const addressList = (key: string): string[] =>
  (env(key, '') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter((a) => {
      if (ADDRESS_RE.test(a)) return true;
      console.warn(`[config] ignoring invalid address in ${key}: ${a}`);
      return false;
    });

export const config = {
  port: num('PORT', 8080),
  /** Primary RPC(s) from RPC_URL (comma-separated) plus built-in public fallbacks. */
  rpcUrls: rpcUrls(),
  chainId: num('CHAIN_ID', 4663),
  chainName: env('CHAIN_NAME', 'Robinhood Chain')!,
  explorerUrl: env('EXPLORER_URL', 'https://robinhoodchain.blockscout.com')!,
  dexscreenerChain: env('DEXSCREENER_CHAIN', 'robinhood')!,
  /** The token to watch. Required unless PRELAUNCH=1. */
  tokenAddress: address('TOKEN_ADDRESS', '0x0000000000000000000000000000000000000000', true),
  /** Uniswap v4 PoolManager on the chain (Robinhood Chain default). A bad value falls back to the default. */
  poolManager: address('POOL_MANAGER', '0x8366a39cc670b4001a1121b8f6a443a643e40951'),
  /** How often to poll for new blocks/logs. Robinhood Chain has ~0.1s blocks. */
  pollMs: num('POLL_MS', 1500),
  /** Max blocks per eth_getLogs call. */
  maxBlockRange: num('MAX_BLOCK_RANGE', 2000),
  /** After a restart, replay at most this many blocks (36k blocks ~ 1 hour). */
  maxCatchupBlocks: num('MAX_CATCHUP_BLOCKS', 36000),
  /** Optional explicit start block for a fresh launch. */
  startBlock: env('START_BLOCK') ? num('START_BLOCK', 0) : undefined,
  /** Where state.json is persisted. Prefers the Railway volume mount path when a volume is attached. */
  dataDir: dataDir(),
  /** Ignore dust below this USD value. */
  minTradeUsd: num('MIN_TRADE_USD', 0.25),
  /** How often market data (price, pools) is refreshed from Dexscreener. */
  marketRefreshMs: num('MARKET_REFRESH_MS', 30000),
  /** Pre-launch: watch nothing, show the launching-soon page. Flip off (and set TOKEN_ADDRESS) at launch. */
  prelaunch: env('PRELAUNCH', '0') === '1',
  launchName: env('LAUNCH_NAME', 'Pitbull')!,
  launchSymbol: env('LAUNCH_SYMBOL', 'PITBULL')!,
  /** Optional launch moment (ISO 8601 or ms epoch) shown as a countdown on the prelaunch page. */
  launchAt: env('LAUNCH_AT'),
  /** Generate synthetic trades and holders (for local development / pre-launch demo). */
  demo: env('DEMO', '0') === '1',
  /** Token for POST /admin/* endpoints. Unset disables them. */
  adminToken: env('ADMIN_TOKEN'),
  corsOrigin: env('CORS_ORIGIN', '*')!,
  /** Extra pools, comma separated: kind:idOrAddress:quoteSymbol:quoteAddress */
  extraPools: env('EXTRA_POOLS', '')!,
  recentLimit: num('RECENT_LIMIT', 200),
  /** Pons launchpad support: watch the bonding curve and auto-detect graduation to Uniswap v4. */
  pons: env('PONS', '1') === '1',
  ponsFactory: address('PONS_FACTORY', '0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e'),
  /** Optional: the token's curve contract (skips the log scan). */
  ponsCurve: env('PONS_CURVE')?.trim().toLowerCase(),
  /** Optional: the curve's quote asset when PONS_CURVE is set (default native ETH). */
  ponsPair: env('PONS_PAIR')?.trim().toLowerCase(),
  /** How far back to scan for the TokenLaunched event when START_BLOCK is not set (36k blocks ≈ 1 h). */
  ponsLookbackBlocks: num('PONS_LOOKBACK_BLOCKS', 36_000),
  /** Count holders from ERC-20 Transfer logs (HOLDERS=0 disables the extra log query). */
  holders: env('HOLDERS', '1') === '1',
  /** Addresses never counted as holders (contracts: curve, pools, treasury...). The curve, PoolManager, factory, router and hook are always excluded. */
  holderIgnore: addressList('HOLDER_IGNORE'),
  /** Balances below this many whole tokens do not count as holding (dust after a full sell). */
  holderMinTokens: num('HOLDER_MIN_TOKENS', 1),
};

export type Config = typeof config;
