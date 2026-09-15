import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Hex } from 'viem';
import { decodeTransfer, Holders, TRANSFER_TOPIC, ZERO } from './holders.js';

const pad = (a: string): Hex => `0x${a.replace(/^0x/, '').padStart(64, '0')}` as Hex;
const A = '0x00000000000000000000000000000000000000aa';
const B = '0x00000000000000000000000000000000000000bb';
const CURVE = '0x00000000000000000000000000000000000000cc';
const log = (from: string, to: string, value: bigint, idx = 0) => ({
  address: '0x0000000000000000000000000000000000000001' as Hex,
  topics: [TRANSFER_TOPIC, pad(from), pad(to)] as [Hex, ...Hex[]],
  data: `0x${value.toString(16).padStart(64, '0')}` as Hex,
  blockNumber: '0x10' as Hex,
  transactionHash: '0xabc' as Hex,
  logIndex: `0x${idx.toString(16)}` as Hex,
});

test('the Transfer selector is the well-known ERC-20 hash', () => {
  assert.equal(TRANSFER_TOPIC, '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
});

test('decodes a Transfer log and rejects other logs', () => {
  const t = decodeTransfer(log(A, B, 123n, 4));
  assert.ok(t);
  assert.equal(t.from, A);
  assert.equal(t.to, B);
  assert.equal(t.value, 123n);
  assert.equal(t.block, 16);
  assert.equal(t.logIndex, 4);
  assert.equal(decodeTransfer({ ...log(A, B, 1n), topics: ['0x' + '1'.repeat(64) as Hex, pad(A), pad(B)] }), null);
});

test('counts holders, excluding the zero address and contracts', () => {
  const h = new Holders({ ignore: [CURVE], minBalance: 10n });
  h.apply(decodeTransfer(log(ZERO, CURVE, 1_000n))!); // mint to the curve
  assert.equal(h.count, 0);
  h.apply(decodeTransfer(log(CURVE, A, 100n))!);
  h.apply(decodeTransfer(log(CURVE, B, 5n))!); // dust, below the minimum
  assert.equal(h.count, 1);
  h.apply(decodeTransfer(log(A, B, 50n))!);
  assert.equal(h.count, 2);
  h.apply(decodeTransfer(log(A, CURVE, 50n))!); // A sells everything
  assert.equal(h.count, 1);
  assert.equal(h.balances.has(A), false);
  assert.deepEqual(h.top(5), [{ address: B, balance: 55n }]);
});

test('a pool excluded after the fact stops counting', () => {
  const h = new Holders({ minBalance: 1n });
  const POOL = '0x00000000000000000000000000000000000000dd';
  h.apply(decodeTransfer(log(ZERO, POOL, 500n))!);
  h.apply(decodeTransfer(log(POOL, A, 10n))!);
  assert.equal(h.count, 2);
  h.exclude(POOL);
  assert.equal(h.count, 1);
  h.exclude(POOL);
  assert.equal(h.count, 1);
});

test('round-trips through JSON', () => {
  const h = new Holders({ minBalance: 1n });
  h.apply(decodeTransfer(log(ZERO, A, 7n))!);
  const again = new Holders({ minBalance: 1n }, h.toJSON());
  assert.equal(again.count, 1);
  assert.equal(again.balances.get(A), 7n);
});
