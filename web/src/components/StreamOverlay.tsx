import { useEffect, useState } from 'react';
import { fmtAge, fmtCap, fmtInt, fmtUsd } from '../lib/format';
import { SITE_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';

interface Props {
  shrine: ShrineData;
  prelaunch: boolean;
}

/** 1920x1080 broadcast frame: the creature, the live numbers, the prophecy and a QR to the site. */
export function StreamOverlay({ shrine, prelaunch }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const s = shrine.state;
  const p = shrine.price;
  const symbol = shrine.token?.symbol || 'PITBULL';
  const live = shrine.ready && !prelaunch;
  const reached = live ? (s?.prophecy ?? -1) : -1;
  const next = shrine.milestones.find((m) => m.index === reached + 1) ?? null;
  const host = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <div className="pb-frame">
      <div className="pb-frame-art">
        <img src="/assets/pitbull.jpg" alt="" onError={(e) => ((e.target as HTMLImageElement).src = '/assets/pitbull-placeholder.svg')} />
      </div>
      <div className="pb-frame-side">
        <div className="pb-frame-head">
          <span className={`pb-pill ${live ? 'pb-pill-live' : ''}`}>{live ? 'LIVE' : 'LAUNCHING SOON'}</span>
          <h1>${symbol}</h1>
          <p>The mythical creature that brings wealth · Robinhood Chain</p>
        </div>
        <div className="pb-frame-stats">
          <div>
            <span>Market cap</span>
            <strong>{live ? fmtUsd(p?.marketCapUsd, { compact: true }) : '—'}</strong>
          </div>
          <div>
            <span>Believers</span>
            <strong>{live ? fmtInt(s?.holders) : '—'}</strong>
          </div>
          <div>
            <span>All-time high</span>
            <strong>{live ? fmtUsd(s?.athMcapUsd, { compact: true }) : '—'}</strong>
          </div>
          <div>
            <span>Since the summoning</span>
            <strong>{live ? fmtAge(s?.launchedAt, now) : '—'}</strong>
          </div>
        </div>
        <div className="pb-frame-prophecy">
          <span className="pb-frame-label">The Prophecy</span>
          <ul>
            {shrine.milestones.map((m) => (
              <li key={m.index} className={m.index <= reached ? 'done' : m.index === reached + 1 ? 'next' : ''}>
                <span>{fmtCap(m.mcapUsd)}</span> {m.name}
              </li>
            ))}
          </ul>
          {next && live && <p>next: {next.name}</p>}
        </div>
        <div className="pb-frame-foot">
          <img className="pb-frame-qr" src="/assets/qr-site.png" alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          <div>
            <strong>{host}</strong>
            <span>hold · believe · dale</span>
          </div>
        </div>
      </div>
      {shrine.toast && (
        <div className="pb-frame-toast">
          <span>Prophecy fulfilled</span>
          <strong>{shrine.toast.name}</strong>
        </div>
      )}
    </div>
  );
}
