import { useEffect, useState } from 'react';
import { fmtAge, fmtInt, fmtPrice, fmtUsd } from '../lib/format';
import type { ShrineData } from '../lib/useShrine';

interface Props {
  shrine: ShrineData;
  prelaunch: boolean;
}

/** The shrine: six live numbers, refreshed over the WebSocket. No trade feed, no candles. */
export function Stats({ shrine, prelaunch }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const s = shrine.state;
  const p = shrine.price;
  const live = shrine.ready && !prelaunch;
  const tiles: { label: string; value: string; hint?: string; big?: boolean }[] = [
    { label: 'Market cap', value: live ? fmtUsd(p?.marketCapUsd, { compact: true }) : '—', hint: p?.derived ? 'from the bonding curve' : undefined, big: true },
    { label: 'Believers', value: live ? fmtInt(s?.holders) : '—', hint: live && s && s.peakHolders > s.holders ? `peak ${fmtInt(s.peakHolders)}` : 'holders on chain', big: true },
    { label: 'All-time high', value: live ? fmtUsd(s?.athMcapUsd, { compact: true }) : '—', hint: 'market cap' },
    { label: '24h volume', value: live ? fmtUsd(p?.volume24hUsd, { compact: true }) : '—' },
    { label: 'Price', value: live ? fmtPrice(p?.usd) : '—' },
    { label: 'Since the summoning', value: live ? fmtAge(s?.launchedAt, now) : '—', hint: s?.launchedAt ? new Date(s.launchedAt).toUTCString().replace(':00 GMT', ' UTC') : undefined },
  ];
  return (
    <section className="pb-section pb-stats" aria-label="live stats">
      <div className="pb-section-head">
        <h2>The Shrine</h2>
        <p>
          {prelaunch ? 'The numbers appear the moment he is summoned.' : 'Read straight from Robinhood Chain.'}{' '}
          <span className={`pb-status pb-status-${shrine.status}`}>{shrine.demo ? 'demo' : shrine.status}</span>
        </p>
      </div>
      <div className="pb-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`pb-tile ${t.big ? 'pb-tile-big' : ''}`}>
            <span className="pb-tile-label">{t.label}</span>
            <span className="pb-tile-value">{t.value}</span>
            {t.hint && <span className="pb-tile-hint">{t.hint}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
