import { EventEmitter } from 'node:events';
import { createPublicClient, decodeEventLog, fallback, http, parseAbi, toHex, type Hex, type PublicClient } from 'viem';
import type { PoolInfo } from './market.js';
import { decodeTransfer, TRANSFER_TOPIC, type Transfer } from './holders.js';
import { decodeCurveTrade, decodeInitialize, pad32, PONS_TOPICS, type V4Pool } from './pons.js';

export const TOPICS = {
  /** Uniswap v4 PoolManager Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24) */
  v4Swap: '0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f',
  /** Uniswap v3 pool Swap(address,address,int256,int256,uint160,uint128,int24) */
  v3Swap: '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67',
  /** Uniswap v2 pair Swap(address,uint256,uint256,uint256,uint256,address) */
  v2Swap: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
} as const;

const V4_ABI = parseAbi([
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)',
]);
const V3_ABI = parseAbi([
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
]);
const V2_ABI = parseAbi([
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
]);

export interface RawSwap {
  pool: PoolInfo;
  /** Tracked-token delta from the trader's perspective: > 0 received (buy), < 0 paid (sell). */
  tokenDelta: bigint;
  /** Quote-token delta from the trader's perspective (opposite sign). */
  quoteDelta: bigint;
  sender: string;
  txHash: string;
  block: number;
  logIndex: number;
}

interface RpcLog {
  address: Hex;
  topics: [Hex, ...Hex[]];
  data: Hex;
  blockNumber: Hex;
  transactionHash: Hex;
  logIndex: Hex;
}

export interface WatcherOptions {
  /** One or more RPC URLs; extra URLs are used as automatic fallbacks. */
  rpcUrls: string[];
  poolManager: string;
  /** tracked token (lowercase), used to spot its Uniswap v4 pool being initialised */
  token: string;
  /** check for a new v4 pool every N polls while a Pons curve is the only pool (default 10) */
  graduationCheckEvery?: number;
  pollMs: number;
  maxBlockRange: number;
  maxCatchupBlocks: number;
  startBlock?: number;
  /** also fetch the token's ERC-20 Transfer logs (emitted as `transfer`) */
  trackTransfers?: boolean;
}

/**
 * Decodes one Swap log into a trader-perspective token delta.
 * - v4 emits the swapper's BalanceDelta (negative = paid).
 * - v3 emits pool deltas (positive = pool received), so the sign flips.
 * - v2 emits in/out amounts.
 */
export function decodeSwap(log: RpcLog, pool: PoolInfo): RawSwap | null {
  const topic = log.topics[0];
  let tokenDelta: bigint;
  let quoteDelta: bigint;
  let sender: string;
  try {
    if (pool.kind === 'v4' && topic === TOPICS.v4Swap) {
      const { args } = decodeEventLog({ abi: V4_ABI, data: log.data, topics: log.topics });
      tokenDelta = pool.tokenIsCurrency0 ? args.amount0 : args.amount1;
      quoteDelta = pool.tokenIsCurrency0 ? args.amount1 : args.amount0;
      sender = args.sender;
    } else if (pool.kind === 'v3' && topic === TOPICS.v3Swap) {
      const { args } = decodeEventLog({ abi: V3_ABI, data: log.data, topics: log.topics });
      tokenDelta = -(pool.tokenIsCurrency0 ? args.amount0 : args.amount1);
      quoteDelta = -(pool.tokenIsCurrency0 ? args.amount1 : args.amount0);
      sender = args.sender;
    } else if (pool.kind === 'v2' && topic === TOPICS.v2Swap) {
      const { args } = decodeEventLog({ abi: V2_ABI, data: log.data, topics: log.topics });
      tokenDelta = pool.tokenIsCurrency0 ? args.amount0Out - args.amount0In : args.amount1Out - args.amount1In;
      quoteDelta = pool.tokenIsCurrency0 ? args.amount1Out - args.amount1In : args.amount0Out - args.amount0In;
      sender = args.sender;
    } else {
      return null;
    }
  } catch (err) {
    console.warn('[watcher] failed to decode log', log.transactionHash, (err as Error).message);
    return null;
  }
  if (tokenDelta === 0n) return null;
  return {
    pool,
    tokenDelta,
    quoteDelta,
    sender,
    txHash: log.transactionHash,
    block: Number(BigInt(log.blockNumber)),
    logIndex: Number(BigInt(log.logIndex)),
  };
}

/**
 * Polls the chain for Swap events on all known pools of the token and emits
 * `swap` (RawSwap) and `block` (last processed block number) events.
 */
export class Watcher extends EventEmitter {
  readonly client: PublicClient;
  lastBlock: number | null;
  head = 0;
  private pools: PoolInfo[] = [];
  private byId = new Map<string, PoolInfo>();
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  failures = 0;
  lastError: { message: string; at: number } | null = null;
  lastPollAt = 0;
  swapsSeen = 0;
  transfersSeen = 0;
  /** true while we still expect the token's Uniswap v4 pool to appear (Pons curve not graduated yet) */
  watchGraduation = false;
  private gradCursor: number | null = null;
  private polls = 0;
  /** set when replaying from a launch block / START_BLOCK: the first catch-up may exceed maxCatchupBlocks */
  skipCatchupCapOnce = false;

  constructor(
    private readonly opts: WatcherOptions,
    initialLastBlock: number | null,
  ) {
    super();
    const transports = opts.rpcUrls.map((url) => http(url, { timeout: 15000, retryCount: 0 }));
    this.client = createPublicClient({
      transport: transports.length === 1 ? transports[0] : fallback(transports, { rank: false, retryCount: 0 }),
    });
    this.lastBlock = initialLastBlock;
  }

  setPools(pools: PoolInfo[]) {
    this.pools = pools;
    this.byId = new Map(pools.map((p) => [p.id, p]));
    this.watchGraduation = pools.some((p) => p.kind === 'pons') && !pools.some((p) => p.kind === 'v4');
  }

  /** Scans PoolManager Initialize logs for a pool of the token; emits `graduated` (V4Pool) when found. */
  async checkGraduation(from: number, to: number): Promise<V4Pool | null> {
    const token = pad32(this.opts.token);
    for (let start = from; start <= to; start += this.opts.maxBlockRange) {
      const range = { fromBlock: toHex(start), toBlock: toHex(Math.min(to, start + this.opts.maxBlockRange - 1)), address: this.opts.poolManager as Hex };
      const [a, b] = (await Promise.all([
        this.client.request({ method: 'eth_getLogs', params: [{ ...range, topics: [PONS_TOPICS.v4Initialize, null, token] }] }),
        this.client.request({ method: 'eth_getLogs', params: [{ ...range, topics: [PONS_TOPICS.v4Initialize, null, null, token] }] }),
      ])) as [RpcLog[], RpcLog[]];
      for (const log of [...a, ...b]) {
        const pool = decodeInitialize(log, this.opts.token);
        if (pool) {
          this.watchGraduation = false;
          this.emit('graduated', pool);
          return pool;
        }
      }
    }
    this.gradCursor = Math.max(this.gradCursor ?? 0, to);
    return null;
  }

  start() {
    this.stopped = false;
    const loop = async () => {
      if (this.stopped) return;
      let delay = this.opts.pollMs;
      try {
        await this.tick();
        this.failures = 0;
        this.lastPollAt = Date.now();
      } catch (err) {
        this.failures++;
        const e = err as Error & { shortMessage?: string; details?: string; metaMessages?: string[] };
        const parts = [e.shortMessage ?? e.message, e.details ? `details: ${e.details}` : '', ...(e.metaMessages ?? [])].filter(Boolean);
        const message = parts.join(' | ').replace(/\s+/g, ' ').slice(0, 900);
        this.lastError = { message, at: Date.now() };
        delay = Math.min(30000, this.opts.pollMs * 2 ** Math.min(this.failures, 5));
        console.warn(`[watcher] poll failed (${this.failures}x), retry in ${delay}ms:`, message);
      }
      this.timer = setTimeout(loop, delay);
    };
    void loop();
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async tick() {
    this.head = Number(await this.client.getBlockNumber());
    if (this.lastBlock === null) {
      this.lastBlock = this.opts.startBlock !== undefined ? this.opts.startBlock - 1 : this.head;
      if (this.opts.startBlock !== undefined) this.skipCatchupCapOnce = true;
      console.log(`[watcher] starting at block ${this.lastBlock + 1} (head ${this.head})`);
      this.emit('block', this.lastBlock);
    }
    if (this.head - this.lastBlock > this.opts.maxCatchupBlocks) {
      if (this.skipCatchupCapOnce) {
        console.log(`[watcher] replaying ${this.head - this.lastBlock} blocks (explicit start block, catch-up cap skipped once)`);
      } else {
        console.warn(`[watcher] behind by ${this.head - this.lastBlock} blocks, skipping to the last ${this.opts.maxCatchupBlocks}`);
        this.lastBlock = this.head - this.opts.maxCatchupBlocks;
      }
    }
    this.skipCatchupCapOnce = false;
    this.polls++;
    if (this.watchGraduation && this.polls % (this.opts.graduationCheckEvery ?? 10) === 0) {
      const from = (this.gradCursor ?? this.lastBlock) + 1;
      if (from <= this.head) await this.checkGraduation(from, this.head);
    }
    while (this.lastBlock < this.head && !this.stopped) {
      const from = this.lastBlock + 1;
      const to = Math.min(this.head, this.lastBlock + this.opts.maxBlockRange);
      const [swaps, transfers] = await Promise.all([this.fetchSwaps(from, to), this.opts.trackTransfers ? this.fetchTransfers(from, to) : Promise.resolve([] as Transfer[])]);
      for (const t of transfers) {
        this.transfersSeen++;
        try {
          this.emit('transfer', t);
        } catch (err) {
          console.error('[watcher] transfer handler failed for', t.txHash, (err as Error).message);
        }
      }
      for (const s of swaps) {
        this.swapsSeen++;
        try {
          this.emit('swap', s);
        } catch (err) {
          console.error('[watcher] swap handler failed for', s.txHash, (err as Error).message);
        }
      }
      this.lastBlock = to;
      this.emit('block', to);
    }
  }

  /** ERC-20 Transfer logs of the tracked token in [from, to], in chain order. */
  async fetchTransfers(from: number, to: number): Promise<Transfer[]> {
    const logs = (await this.client.request({
      method: 'eth_getLogs',
      params: [{ fromBlock: toHex(from), toBlock: toHex(to), address: this.opts.token as Hex, topics: [TRANSFER_TOPIC] }],
    })) as RpcLog[];
    const out: Transfer[] = [];
    for (const log of logs) {
      const t = decodeTransfer(log);
      if (t) out.push(t);
    }
    out.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
    return out;
  }

  async fetchSwaps(from: number, to: number): Promise<RawSwap[]> {
    if (this.pools.length === 0) return [];
    const v4 = this.pools.filter((p) => p.kind === 'v4');
    const curves = this.pools.filter((p) => p.kind === 'pons');
    const legacy = this.pools.filter((p) => p.kind === 'v3' || p.kind === 'v2');
    const requests: Promise<unknown>[] = [];
    const range = { fromBlock: toHex(from), toBlock: toHex(to) };
    if (v4.length > 0) {
      requests.push(
        this.client.request({
          method: 'eth_getLogs',
          params: [{ ...range, address: this.opts.poolManager as Hex, topics: [TOPICS.v4Swap, v4.map((p) => p.id as Hex)] }],
        }),
      );
    }
    if (legacy.length > 0) {
      requests.push(
        this.client.request({
          method: 'eth_getLogs',
          params: [{ ...range, address: legacy.map((p) => p.id as Hex), topics: [[TOPICS.v3Swap, TOPICS.v2Swap]] }],
        }),
      );
    }
    if (curves.length > 0) {
      requests.push(
        this.client.request({
          method: 'eth_getLogs',
          params: [{ ...range, address: curves.map((p) => p.id as Hex), topics: [[PONS_TOPICS.curveBuy, PONS_TOPICS.curveSell]] }],
        }),
      );
    }
    const logs = (await Promise.all(requests)).flat() as RpcLog[];
    const swaps: RawSwap[] = [];
    for (const log of logs) {
      const key = log.topics[0] === TOPICS.v4Swap ? (log.topics[1] ?? '').toLowerCase() : log.address.toLowerCase();
      const pool = this.byId.get(key);
      if (!pool) continue;
      const swap = pool.kind === 'pons' ? decodeCurveTrade(log, pool) : decodeSwap(log, pool);
      if (swap) swaps.push(swap);
    }
    swaps.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
    return swaps;
  }
}
