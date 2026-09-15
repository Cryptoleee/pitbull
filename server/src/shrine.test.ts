import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Trade } from './protocol.js';
import { MILESTONES, milestoneFor, Shrine } from './shrine.js';

const trade = (side: 'buy' | 'sell', usd: number, ts = 1000): Trade => ({
  id: `${ts}`,
  side,
  tokenAmount: usd / 0.001,
  usd,
  priceUsd: 0.001,
  pool: 'p',
  poolKind: 'pons',
  quote: 'ETH',
  txHash: '0x',
  block: 1,
  ts,
});

test('milestones are ordered and milestoneFor picks the highest reached', () => {
  for (let i = 1; i < MILESTONES.length; i++) assert.ok(MILESTONES[i].mcapUsd > MILESTONES[i - 1].mcapUsd);
  assert.equal(milestoneFor(0), -1);
  assert.equal(milestoneFor(49_999), -1);
  assert.equal(milestoneFor(50_000), 0);
  assert.equal(milestoneFor(999_999), 1);
  assert.equal(milestoneFor(5_000_000_000), 6);
});

test('trades accumulate counters, volume and launch time', () => {
  const s = new Shrine();
  s.applyTrade(trade('buy', 100, 5000));
  s.applyTrade(trade('sell', 40, 6000));
  assert.equal(s.state.trades, 2);
  assert.equal(s.state.buys, 1);
  assert.equal(s.state.sells, 1);
  assert.equal(s.state.volumeUsd, 140);
  assert.equal(s.state.launchedAt, 5000);
  assert.equal(s.state.lastTradeAt, 6000);
});

test('ATH and prophecy only move up, and every skipped milestone is announced', () => {
  const s = new Shrine();
  assert.deepEqual(s.applyPrice({ usd: 0.001, updatedAt: 1, marketCapUsd: 40_000 }, 10), []);
  assert.equal(s.state.athMcapUsd, 40_000);
  assert.equal(s.state.prophecy, -1);
  const reached = s.applyPrice({ usd: 0.02, updatedAt: 2, marketCapUsd: 1_200_000 }, 20);
  assert.deepEqual(
    reached.map((m) => m.name),
    ['The Sighting', 'The Awakening', 'The Flex'],
  );
  assert.equal(s.state.prophecy, 2);
  assert.equal(s.state.athAt, 20);
  // a dip does not lower anything
  assert.deepEqual(s.applyPrice({ usd: 0.005, updatedAt: 3, marketCapUsd: 300_000 }, 30), []);
  assert.equal(s.state.athMcapUsd, 1_200_000);
  assert.equal(s.state.athPriceUsd, 0.02);
  assert.equal(s.state.prophecy, 2);
});

test('holders track the peak and report whether the count changed', () => {
  const s = new Shrine();
  assert.equal(s.setHolders(10), true);
  assert.equal(s.setHolders(10), false);
  assert.equal(s.setHolders(7), true);
  assert.equal(s.state.holders, 7);
  assert.equal(s.state.peakHolders, 10);
});

test('resumes from a partial persisted state', () => {
  const s = new Shrine({ trades: 3 } as never);
  assert.equal(s.state.trades, 3);
  assert.equal(s.state.holders, 0);
  assert.equal(s.state.prophecy, -1);
});
