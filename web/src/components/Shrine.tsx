import { useEffect, useState } from 'react';
import { fmtAge, fmtInt, fmtPrice, fmtUsd } from '../lib/format';
import type { ShrineData } from '../lib/useShrine';

/** SHRINE.EXE: the live numbers, on little LED panels. No trade feed, no candles. */
export function Shrine({ shrine, prelaunch }: { shrine: ShrineData; prelaunch: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const s = shrine.state;
  const p = shrine.price;
  const live = shrine.ready && !prelaunch;
  const idle = 'SOON';
  const tile = (k: string, v: string, h?: string, wide = false) => (
    <div className={`stat${wide ? ' wide' : ''}`} key={k}>
      <span className="k">{k}</span>
      <div className="v">{v}</div>
      <span className="h">{h ?? ''}</span>
    </div>
  );
  return (
    <section className="win section" id="shrine">
      <div className="bar">
        <span>
          <span className="live-badge">{live ? 'LIVE' : 'IDLE'}</span>SHRINE.EXE - read straight from Robinhood Chain
        </span>
        <span className="btns">
          <i>_</i>
          <i>[]</i>
          <i>X</i>
        </span>
      </div>
      <div className="body">
        <div className="hgroup">
          <div className="wordart">
            <span className="ext">The Shrine</span>
            <span className="fill">The Shrine</span>
          </div>
          <p>{prelaunch ? 'The numbers appear the moment he is summoned.' : 'Every number below comes from the chain, not from a press release.'}</p>
        </div>
        <div className="stats">
          {tile('Market cap', live ? fmtUsd(p?.marketCapUsd, { compact: true }) : idle, live ? (p?.derived ? 'from the bonding curve' : 'via Dexscreener') : 'the moment he is summoned', true)}
          {tile('Believers (holders)', live ? fmtInt(s?.holders) : idle, live && s && s.peakHolders > s.holders ? `peak ${fmtInt(s.peakHolders)}` : 'wallets holding on chain')}
          {tile('All-time high', live ? fmtUsd(s?.athMcapUsd, { compact: true }) : idle, 'market cap')}
          {tile('Price', live ? fmtPrice(p?.usd) : idle, 'USD')}
          {tile('24h volume', live ? fmtUsd(p?.volume24hUsd, { compact: true }) : idle)}
          {tile('Trades since launch', live ? fmtInt(s?.trades) : idle, live && s ? `${fmtInt(s.buys)} buys / ${fmtInt(s.sells)} sells` : undefined)}
          {tile('Since the summoning', live ? fmtAge(s?.launchedAt, now) : idle, s?.launchedAt ? new Date(s.launchedAt).toUTCString().replace(':00 GMT', ' UTC') : undefined)}
        </div>
        <div className="statusline">
          <span className={`pill${shrine.status === 'online' ? '' : ' off'}`}>
            <span className="dot" /> {shrine.demo ? 'DEMO FEED' : shrine.status.toUpperCase()}
          </span>
          <span>chain: Robinhood Chain (4663)</span>
          <span>launchpad: Pons</span>
          <span className="tag blink">UPDATES BY THEMSELVES</span>
        </div>
      </div>
    </section>
  );
}
