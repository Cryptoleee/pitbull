import { fmtCap, fmtUsd } from '../lib/format';
import type { ShrineData } from '../lib/useShrine';

/** PROPHECY.EXE: seven signs in a table, unlocked by the highest market cap ever reached. */
export function Prophecy({ shrine, prelaunch }: { shrine: ShrineData; prelaunch: boolean }) {
  const reached = prelaunch ? -1 : shrine.state?.prophecy ?? -1;
  const ath = prelaunch ? 0 : shrine.state?.athMcapUsd ?? 0;
  const next = shrine.milestones.find((m) => m.index === reached + 1) ?? null;
  const prevCap = reached >= 0 ? shrine.milestones[reached].mcapUsd : 0;
  const progress = next ? Math.max(0, Math.min(1, (ath - prevCap) / (next.mcapUsd - prevCap))) : 1;
  return (
    <section className="win section" id="prophecy">
      <div className="bar">
        <span>PROPHECY.EXE - 7 signs, written on a road nobody drives</span>
        <span className="btns">
          <i>_</i>
          <i>[]</i>
          <i>X</i>
        </span>
      </div>
      <div className="body">
        <div className="hgroup">
          <div className="wordart">
            <span className="ext">The Prophecy</span>
            <span className="fill">The Prophecy</span>
          </div>
          <p>Each sign unlocks at an all-time-high market cap and is never lost again. Even if the chart dips, the sign stays.</p>
        </div>
        <table className="prophecy">
          <thead>
            <tr>
              <th>Cap</th>
              <th>Sign</th>
              <th>What the legend says</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {shrine.milestones.map((m) => {
              const state = m.index <= reached ? 'done' : m.index === reached + 1 ? 'next' : 'locked';
              return (
                <tr key={m.index} className={state}>
                  <td className="cap">{fmtCap(m.mcapUsd)}</td>
                  <td className="nm">{m.name}</td>
                  <td className="ln">{state === 'locked' ? '' : m.line}</td>
                  <td className="st">
                    {state === 'done' && <span className="unlocked">✓ UNLOCKED</span>}
                    {state === 'next' && (
                      <>
                        <div className="pbar">
                          <i style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{Math.round(progress * 100)}% there</span>
                      </>
                    )}
                    {state === 'locked' && <span style={{ color: '#808080' }}>locked</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!prelaunch && next && shrine.ready && (
          <p className="prophecy-foot">
            All-time high <b>{fmtUsd(ath, { compact: true })}</b> &nbsp;·&nbsp; next sign: <b>{next.name}</b> at {fmtCap(next.mcapUsd)}
          </p>
        )}
      </div>
    </section>
  );
}
