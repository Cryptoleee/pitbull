import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Hex } from 'viem';
import { curvePool, decodeCurveTrade, decodeInitialize, decodeLaunch, findLaunch, NATIVE, pad32, PONS, PONS_TOPICS } from './pons.js';

// real logs captured from Robinhood Chain (block 63007224 area)
const TOKEN = '0xe11c785097aff8e75a8256ce59823a871de5693d';
const CURVE = '0xbcb4c89380f5d1f2759cd290d516d9a28915af57';
const USER = '0xcc4946130a7dfac8e2c57d24a5b47747cc1765ea';
const launchLog = {
  address: PONS.factory as Hex,
  topics: [PONS_TOPICS.tokenLaunched, pad32(TOKEN), pad32(CURVE), pad32(USER)] as [Hex, ...Hex[]],
  data: ('0x' + '0'.repeat(64) + '0'.repeat(64) + '3a4965bf58a40000'.padStart(64, '0')) as Hex,
  blockNumber: '0x3c169e8' as Hex,
  transactionHash: '0xf25bbb5cfb435d8ab7e25584815c31a70dab22cc07e0aa330a7d9339f866f2e4' as Hex,
  logIndex: '0x3' as Hex,
};
const buyLog = {
  address: CURVE as Hex,
  topics: [PONS_TOPICS.curveBuy, pad32(PONS.router), pad32(USER)] as [Hex, ...Hex[]],
  data: '0x000000000000000000000000000000000000000000000000000e35fa931a000000000000000000000000000000000000000000000001e7ef0d3188058a5a48090000000000000000000000000000000000000000000000000000246139ca8000000000000000000000000000000000000000000000000000000048c273950000' as Hex,
  blockNumber: '0x3c169e9' as Hex,
  transactionHash: '0x' + 'b'.repeat(64) as Hex,
  logIndex: '0x5' as Hex,
};

test('event selectors match the hashes observed on chain', () => {
  assert.equal(PONS_TOPICS.tokenLaunched, '0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607');
  assert.equal(PONS_TOPICS.curveBuy, '0xec36bf571f136799e8dc0b0b8bea4b04d8bd3d43de838aab0d5fc21d4cbfc455');
  assert.equal(PONS_TOPICS.curveSell, '0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df');
  assert.equal(PONS_TOPICS.poolGraduated, '0x0a44ef75df69c534f43cd6c1aa3ef8983065fe5fe79ef9e79f6494e6f258c259');
  assert.equal(PONS_TOPICS.v4Initialize, '0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438');
});

test('decodes a TokenLaunched log (native ETH pair)', () => {
  const l = decodeLaunch(launchLog);
  assert.ok(l);
  assert.equal(l.token, TOKEN);
  assert.equal(l.curve, CURVE);
  assert.equal(l.pairToken, NATIVE);
  assert.equal(l.graduationThreshold, 4_200_000_000_000_000_000n);
  assert.equal(l.block, 63007208);
  const pool = curvePool(l, 'ETH');
  assert.equal(pool.kind, 'pons');
  assert.equal(pool.id, CURVE);
});

test('decodes a CurveBuy log from the trader perspective', () => {
  const pool = curvePool(decodeLaunch(launchLog)!, 'ETH');
  const t = decodeCurveTrade(buyLog, pool);
  assert.ok(t);
  assert.equal(t.tokenDelta, 0x1e7ef0d3188058a5a4809n);
  assert.equal(t.quoteDelta, -0x0e35fa931a0000n);
  assert.equal(t.sender, USER);
  assert.equal(t.block, 63007209);
});

test('decodes a CurveSell log with the signs flipped', () => {
  const pool = curvePool(decodeLaunch(launchLog)!, 'ETH');
  const sellLog = { ...buyLog, topics: [PONS_TOPICS.curveSell, pad32(PONS.router), pad32(USER)] as [Hex, ...Hex[]] };
  const t = decodeCurveTrade(sellLog, pool);
  assert.ok(t);
  assert.equal(t.tokenDelta, -0x0e35fa931a0000n); // tokensIn is the first word
  assert.equal(t.quoteDelta, 0x1e7ef0d3188058a5a4809n);
});

test('recognises a v4 Initialize for the token and ignores others', () => {
  const id = '0x' + 'ab'.repeat(32);
  const data = ('0x' + '2710'.padStart(64, '0') + '3c'.padStart(64, '0') + PONS.hook.slice(2).padStart(64, '0') + '1'.padStart(64, '0') + '0'.repeat(64)) as Hex;
  const mk = (c0: string, c1: string) => ({ address: '0x8366a39cc670b4001a1121b8f6a443a643e40951' as Hex, topics: [PONS_TOPICS.v4Initialize, id as Hex, pad32(c0), pad32(c1)] as [Hex, ...Hex[]], data, blockNumber: '0x10' as Hex, transactionHash: ('0x' + 'c'.repeat(64)) as Hex, logIndex: '0x0' as Hex });
  const p = decodeInitialize(mk(NATIVE, TOKEN), TOKEN);
  assert.ok(p);
  assert.equal(p.id, id);
  assert.equal(p.currency0, NATIVE);
  assert.equal(p.hooks, PONS.hook);
  assert.equal(decodeInitialize(mk(NATIVE, USER), TOKEN), null);
});

test('findLaunch scans backwards in chunks and forwards from a start block', async () => {
  const calls: [number, number][] = [];
  const client = {
    async request({ params }: { method: 'eth_getLogs'; params: [Record<string, unknown>] }) {
      const from = Number(params[0].fromBlock as string);
      const to = Number(params[0].toBlock as string);
      calls.push([from, to]);
      return from <= 63007208 && 63007208 <= to ? [launchLog] : [];
    },
  };
  const found = await findLaunch(client, TOKEN, { head: 63010000, lookback: 10000, chunk: 2000 });
  assert.equal(found?.curve, CURVE);
  assert.equal(calls.length, 2);
  calls.length = 0;
  const fwd = await findLaunch(client, TOKEN, { head: 63010000, fromBlock: 63007000, lookback: 0, chunk: 2000 });
  assert.equal(fwd?.curve, CURVE);
  assert.equal(calls.length, 1);
  assert.equal(await findLaunch(client, USER, { head: 63010000, lookback: 4000, chunk: 2000 }), null);
});
