import { useEffect, useState } from 'react';
import { fmtAge, fmtCap, fmtInt, fmtUsd } from '../lib/format';
import { SITE_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';
import { Chaos } from './Chaos';

/** 1920×1080 broadcast frame for OBS / the headless streamer: same 1998 furniture, bigger LEDs. */
export function StreamFrame({ shrine, prelaunch }: { shrine: ShrineData; prelaunch: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const s = shrine.state;
  const p = shrine.price;
  const live = shrine.ready && !prelaunch;
  const idle = 'SOON';
  const symbol = shrine.token?.symbol || 'PITBULL';
  const reached = live ? s?.prophecy ?? -1 : -1;
  const host = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ticker = `*** $${symbol} *** THE MYTHICAL CREATURE THAT BRINGS WEALTH *** HALF BULL - HALF PITBULL - ALL STAR *** ${host} *** DALE ***`;
  const tile = (k: string, v: string, wide = false) => (
    <div className={`stat${wide ? ' wide' : ''}`} key={k}>
      <span className="k">{k}</span>
      <div className="v">{v}</div>
    </div>
  );
  return (
    <div className="streamwrap">
      <Chaos count={18} sparkles={8} seed={21} />
      <div className="construction" />
      <div className="maincol">
        <section className="win hero">
          <div className="bar">
            <span>
              <span className="live-badge blink">{live ? 'LIVE' : 'SOON'}</span>PITBULL-CAM.AVI - [a road nobody drives]
            </span>
            <span className="btns">
              <i>_</i>
              <i>[]</i>
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <img src="/assets/pitbull.jpg" alt="" />
          </div>
        </section>
      </div>
      <div className="sidecol">
        <div style={{ textAlign: 'center' }}>
          <div className="wordart title">
            <span className="ext">${symbol}</span>
            <span className="fill">${symbol}</span>
          </div>
        </div>
        <section className="win" style={{ marginTop: 14 }}>
          <div className="bar">
            <span>SHRINE.EXE</span>
            <span className="btns">
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <div className="stats">
              {tile('Market cap', live ? fmtUsd(p?.marketCapUsd, { compact: true }) : idle, true)}
              {tile('Believers', live ? fmtInt(s?.holders) : idle)}
              {tile('All-time high', live ? fmtUsd(s?.athMcapUsd, { compact: true }) : idle)}
              {tile('Trades', live ? fmtInt(s?.trades) : idle, true)}
            </div>
          </div>
        </section>
        <section className="win" style={{ marginTop: 14 }}>
          <div className="bar">
            <span>PROPHECY.EXE</span>
            <span className="btns">
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <table className="prophecy">
              <tbody>
                {shrine.milestones.map((m) => (
                  <tr key={m.index} className={m.index <= reached ? 'done' : m.index === reached + 1 ? 'next' : 'locked'}>
                    <td className="cap">{fmtCap(m.mcapUsd)}</td>
                    <td className="nm">{m.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="marquee" style={{ ['--ms' as string]: '18s' }}>
        <span>
          <i>{ticker}</i>
          <i>{ticker}</i>
        </span>
      </div>
      <div className="bottombar">
        <span className="btn95" style={{ padding: '6px 14px' }}>
          Start
        </span>
        <span>{host}</span>
        <span className="grow" />
        <span className="tag blink">HOLD · BELIEVE · DALE</span>
        <span>{live ? `LIVE FROM ROBINHOOD CHAIN · UP ${fmtAge(s?.launchedAt, now)}` : 'LAUNCHING SOON ON ROBINHOOD CHAIN'}</span>
      </div>
      {shrine.toast && (
        <div className="win toast">
          <div className="bar">
            <span>PROPHECY FULFILLED</span>
            <span className="btns">
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <p className="nm">{shrine.toast.name}</p>
            <p className="ln">{shrine.toast.line}</p>
          </div>
        </div>
      )}
    </div>
  );
}
