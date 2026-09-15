// find_pons_token.mjs [lookbackBlocks] - list recent Pons launches on Robinhood Chain with their curve
// trade counts, and recent graduations, so a build can be rehearsed against a token with real order flow.
// Run from a directory where `viem` is installed (e.g. the server package): node find_pons_token.mjs 6000
import { createPublicClient, fallback, http, toHex, decodeEventLog, parseAbi, toEventSelector } from 'viem';
// the official RPC rate-limits log queries from cloud IPs: always use the public fallback list
const RPCS = ['https://rpc.mainnet.chain.robinhood.com', 'https://robinhood-chain.gateway.tenderly.co', 'https://robinhood-mainnet-rpc.blockreq.com/v1/rpc/public', 'https://rpc-robinhood.blockmachine.io'];
const client = createPublicClient({ transport: fallback(RPCS.map((u) => http(u, { timeout: 15000, retryCount: 1 })), { rank: false }) });
const FACTORY = '0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e';
const ABI = parseAbi([
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)',
  'event CurveBuy(address indexed buyer, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 tax)',
  'event CurveSell(address indexed seller, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 tax)',
  'event PoolGraduated(address indexed token, uint256 a, uint256 b, uint256 c)',
]);
const T = { launch: toEventSelector(ABI[0]), buy: toEventSelector(ABI[1]), sell: toEventSelector(ABI[2]), grad: toEventSelector(ABI[3]) };
const head = Number(await client.getBlockNumber());
const back = Number(process.argv[2] ?? 6000);
const logs = [];
for (let from = head - back; from <= head; from += 2000) {
  logs.push(...(await client.request({ method: 'eth_getLogs', params: [{ fromBlock: toHex(from), toBlock: toHex(Math.min(head, from + 1999)), address: FACTORY, topics: [T.launch] }] })));
}
const launches = logs.map((l) => ({ block: Number(BigInt(l.blockNumber)), ...decodeEventLog({ abi: ABI, data: l.data, topics: l.topics }).args }));
console.log(`head ${head}: ${launches.length} launches in the last ${back} blocks (~${Math.round(back / 36000 * 60)} min)`);
const rows = [];
for (const l of launches.slice(-40)) {
  const tl = await client.request({ method: 'eth_getLogs', params: [{ fromBlock: toHex(l.block), toBlock: toHex(Math.min(head, l.block + 1999)), address: l.curve, topics: [[T.buy, T.sell]] }] });
  rows.push({ ...l, trades: tl.length });
}
rows.sort((a, b) => b.trades - a.trades);
for (const r of rows.slice(0, 10)) console.log(`${r.trades} trades  token ${r.token}  curve ${r.curve}  pair ${r.pairToken === '0x0000000000000000000000000000000000000000' ? 'ETH' : r.pairToken}  block ${r.block}`);
const g = await client.request({ method: 'eth_getLogs', params: [{ fromBlock: toHex(head - 20000), toBlock: toHex(head), address: FACTORY, topics: [T.grad] }] });
console.log(`graduations in the last 20000 blocks: ${g.length}`, g.slice(-3).map((x) => `0x${x.topics[1].slice(26)}@${Number(BigInt(x.blockNumber))}`).join(' '));
