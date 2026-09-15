import { toEventSelector, type Hex } from 'viem';

/** ERC-20 Transfer(address indexed from, address indexed to, uint256 value) */
export const TRANSFER_TOPIC = toEventSelector('Transfer(address,address,uint256)');
export const ZERO = '0x0000000000000000000000000000000000000000';

export interface Transfer {
  from: string;
  to: string;
  value: bigint;
  block: number;
  logIndex: number;
  txHash: string;
}

export interface TransferLog {
  address: Hex;
  topics: [Hex, ...Hex[]];
  data: Hex;
  blockNumber: Hex | bigint;
  transactionHash: Hex;
  logIndex: Hex | bigint;
}

const topicAddress = (t: Hex | undefined): string | null => (t && t.length === 66 ? `0x${t.slice(26)}`.toLowerCase() : null);

/** Decodes a Transfer log; null for anything else (approvals, malformed logs). */
export function decodeTransfer(log: TransferLog): Transfer | null {
  if (log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) return null;
  const from = topicAddress(log.topics[1]);
  const to = topicAddress(log.topics[2]);
  if (!from || !to) return null;
  let value: bigint;
  try {
    value = log.data && log.data !== '0x' ? BigInt(log.data) : 0n;
  } catch {
    return null;
  }
  return { from, to, value, block: Number(BigInt(log.blockNumber)), logIndex: Number(BigInt(log.logIndex)), txHash: log.transactionHash };
}

export interface HoldersOptions {
  /** addresses that never count (contracts, burn address) */
  ignore?: Iterable<string>;
  /** minimum balance (in base units) to count as a holder */
  minBalance?: bigint;
}

/**
 * Tracks token balances from Transfer logs and counts holders. Balances can go
 * negative when a replay starts after some transfers (a wallet sells tokens we
 * never saw it receive); those wallets simply do not count until they are
 * positive again, so the count is a floor, never an overstatement.
 */
export class Holders {
  readonly balances = new Map<string, bigint>();
  private readonly ignore: Set<string>;
  private readonly minBalance: bigint;
  private holderCount = 0;

  constructor(opts: HoldersOptions = {}, persisted?: Record<string, string>) {
    this.ignore = new Set([ZERO, ...[...(opts.ignore ?? [])].map((a) => a.toLowerCase())]);
    this.minBalance = opts.minBalance ?? 1n;
    if (persisted) {
      for (const [address, raw] of Object.entries(persisted)) {
        try {
          this.balances.set(address.toLowerCase(), BigInt(raw));
        } catch {
          /* skip a corrupt entry */
        }
      }
      this.recount();
    }
  }

  /** Marks an address as a contract / non-holder (e.g. a pool discovered after start). */
  exclude(address: string) {
    const a = address.toLowerCase();
    if (this.ignore.has(a)) return;
    this.ignore.add(a);
    if (this.isHolder(a, this.balances.get(a) ?? 0n, true)) this.holderCount--;
  }

  get count(): number {
    return this.holderCount;
  }

  get tracked(): number {
    return this.balances.size;
  }

  private isHolder(address: string, balance: bigint, ignoreExcluded = false) {
    return balance >= this.minBalance && (ignoreExcluded || !this.ignore.has(address));
  }

  private adjust(address: string, delta: bigint) {
    const before = this.balances.get(address) ?? 0n;
    const after = before + delta;
    if (after === 0n) this.balances.delete(address);
    else this.balances.set(address, after);
    if (this.ignore.has(address)) return;
    const was = this.isHolder(address, before);
    const is = this.isHolder(address, after);
    if (!was && is) this.holderCount++;
    else if (was && !is) this.holderCount--;
  }

  apply(t: Transfer): boolean {
    if (t.value === 0n || t.from === t.to) return false;
    const before = this.holderCount;
    this.adjust(t.from, -t.value);
    this.adjust(t.to, t.value);
    return this.holderCount !== before;
  }

  private recount() {
    this.holderCount = 0;
    for (const [address, balance] of this.balances) if (this.isHolder(address, balance)) this.holderCount++;
  }

  /** Top holders by balance (contracts excluded), for the API. */
  top(limit: number): { address: string; balance: bigint }[] {
    return [...this.balances.entries()]
      .filter(([address, balance]) => this.isHolder(address, balance))
      .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
      .slice(0, limit)
      .map(([address, balance]) => ({ address, balance }));
  }

  toJSON(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [address, balance] of this.balances) out[address] = balance.toString();
    return out;
  }
}
