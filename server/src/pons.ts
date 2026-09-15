import { decodeEventLog, parseAbi, toEventSelector, type Hex } from 'viem';
import type { PoolInfo } from './market.js';

/**
 * Pons launchpad (Robinhood Chain). A launch starts on a bonding-curve contract
 * that emits CurveBuy / CurveSell, and graduates into a Uniswap v4 pool (with
 * the Pons meme hook) once the threshold is reached. Event signatures were
 * verified against live logs on chain 4663.
 */
export const PONS = {
  factory: '0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e',
  router: '0xe33e9e479df8802cb0866d5d05258bec4cf62948',
  hook: '0xe5e702641ea86f4ae6cc3cdaed2b886f976be044',
} as const;

export const NATIVE = '0x0000000000000000000000000000000000000000';

export const PONS_ABI = parseAbi([
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
  'event CurveBuy(address indexed buyer, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 tax)',
  'event CurveSell(address indexed seller, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 tax)',
  'event PoolGraduated(address indexed token, uint256 a, uint256 b, uint256 c)',
  'event LaunchSwept(address indexed token, uint256 quote, uint256 tokens)',
]);

export const V4_INIT_ABI = parseAbi([
  'event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)',
]);

export const PONS_TOPICS = {
  tokenLaunched: toEventSelector('TokenLaunched(address,address,address,address,uint256,uint256)'),
  curveBuy: toEventSelector('CurveBuy(address,address,uint256,uint256,uint256,uint256)'),
  curveSell: toEventSelector('CurveSell(address,address,uint256,uint256,uint256,uint256)'),
  poolGraduated: toEventSelector('PoolGraduated(address,uint256,uint256,uint256)'),
  launchSwept: toEventSelector('LaunchSwept(address,uint256,uint256)'),
  v4Initialize: toEventSelector('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)'),
} as const;

export const pad32 = (address: string): Hex => `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}` as Hex;

export interface LogLike {
  address: Hex;
  topics: [Hex, ...Hex[]];
  data: Hex;
  blockNumber: Hex | bigint;
  transactionHash: Hex;
  logIndex: Hex | bigint;
}

const blockOf = (l: LogLike) => Number(BigInt(l.blockNumber));
const indexOf = (l: LogLike) => Number(BigInt(l.logIndex));

export interface PonsLaunch {
  token: string;
  curve: string;
  deployer: string;
  /** quote asset of the curve; NATIVE for ETH */
  pairToken: string;
  graduationThreshold: bigint;
  block: number;
  txHash: string;
}

export function decodeLaunch(log: LogLike): PonsLaunch | null {
  if (log.topics[0] !== PONS_TOPICS.tokenLaunched) return null;
  try {
    const { args } = decodeEventLog({ abi: PONS_ABI, eventName: 'TokenLaunched', data: log.data, topics: log.topics });
    return {
      token: args.token.toLowerCase(),
      curve: args.curve.toLowerCase(),
      deployer: args.deployer.toLowerCase(),
      pairToken: args.pairToken.toLowerCase(),
      graduationThreshold: args.graduationThreshold,
      block: blockOf(log),
      txHash: log.transactionHash,
    };
  } catch {
    return null;
  }
}

export interface CurveTrade {
  pool: PoolInfo;
  /** token delta from the trader's perspective (> 0 buy) */
  tokenDelta: bigint;
  /** quote delta from the trader's perspective (< 0 on a buy) */
  quoteDelta: bigint;
  sender: string;
  txHash: string;
  block: number;
  logIndex: number;
}

/** Decodes a CurveBuy / CurveSell log emitted by the bonding curve into a trader-perspective trade. */
export function decodeCurveTrade(log: LogLike, pool: PoolInfo): CurveTrade | null {
  const topic = log.topics[0];
  try {
    if (topic === PONS_TOPICS.curveBuy) {
      const { args } = decodeEventLog({ abi: PONS_ABI, eventName: 'CurveBuy', data: log.data, topics: log.topics });
      if (args.tokensOut === 0n) return null;
      return { pool, tokenDelta: args.tokensOut, quoteDelta: -args.quoteIn, sender: args.recipient.toLowerCase(), txHash: log.transactionHash, block: blockOf(log), logIndex: indexOf(log) };
    }
    if (topic === PONS_TOPICS.curveSell) {
      const { args } = decodeEventLog({ abi: PONS_ABI, eventName: 'CurveSell', data: log.data, topics: log.topics });
      if (args.tokensIn === 0n) return null;
      return { pool, tokenDelta: -args.tokensIn, quoteDelta: args.quoteOut, sender: args.recipient.toLowerCase(), txHash: log.transactionHash, block: blockOf(log), logIndex: indexOf(log) };
    }
  } catch (err) {
    console.warn('[pons] failed to decode curve log', log.transactionHash, (err as Error).message);
  }
  return null;
}

export interface V4Pool {
  id: string;
  currency0: string;
  currency1: string;
  hooks: string;
  block: number;
}

/** Decodes a Uniswap v4 PoolManager Initialize log; returns null unless it involves `token`. */
export function decodeInitialize(log: LogLike, token: string): V4Pool | null {
  if (log.topics[0] !== PONS_TOPICS.v4Initialize) return null;
  try {
    const { args } = decodeEventLog({ abi: V4_INIT_ABI, data: log.data, topics: log.topics });
    const c0 = args.currency0.toLowerCase();
    const c1 = args.currency1.toLowerCase();
    if (c0 !== token && c1 !== token) return null;
    return { id: (args.id as string).toLowerCase(), currency0: c0, currency1: c1, hooks: args.hooks.toLowerCase(), block: blockOf(log) };
  } catch {
    return null;
  }
}

export function curvePool(launch: PonsLaunch, quoteSymbol: string): PoolInfo {
  return {
    id: launch.curve,
    kind: 'pons',
    quoteSymbol,
    quoteAddress: launch.pairToken,
    tokenIsCurrency0: false,
    liquidityUsd: 0,
    volume24hUsd: 0,
  };
}

export interface LogClient {
  request(args: { method: 'eth_getLogs'; params: [Record<string, unknown>] }): Promise<unknown>;
}

/**
 * Finds the Pons launch of `token` by scanning the factory's TokenLaunched logs.
 * With `fromBlock` it scans forward from there; otherwise backwards from `head`
 * over at most `lookback` blocks.
 */
export async function findLaunch(client: LogClient, token: string, opts: { head: number; fromBlock?: number; lookback: number; chunk: number; factory?: string }): Promise<PonsLaunch | null> {
  const factory = (opts.factory ?? PONS.factory) as Hex;
  const topics = [PONS_TOPICS.tokenLaunched, pad32(token)];
  const query = async (from: number, to: number) => {
    const logs = (await client.request({ method: 'eth_getLogs', params: [{ address: factory, topics, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }] })) as LogLike[];
    for (const l of logs) {
      const launch = decodeLaunch(l);
      if (launch && launch.token === token) return launch;
    }
    return null;
  };
  if (opts.fromBlock !== undefined) {
    for (let from = opts.fromBlock; from <= opts.head; from += opts.chunk) {
      const found = await query(from, Math.min(opts.head, from + opts.chunk - 1));
      if (found) return found;
    }
    return null;
  }
  const floor = Math.max(0, opts.head - opts.lookback);
  for (let to = opts.head; to >= floor; to -= opts.chunk) {
    const found = await query(Math.max(floor, to - opts.chunk + 1), to);
    if (found) return found;
  }
  return null;
}
