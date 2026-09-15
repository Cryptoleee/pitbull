import { fmtCap, fmtUsd } from '../lib/format';
import type { ShrineData } from '../lib/useShrine';

interface Props {
  shrine: ShrineData;
  prelaunch: boolean;
}

/** Seven milestones tied to the all-time-high market cap. Reached once, kept forever. */
export function Prophecy({ shrine, prelaunch }: Props) {
  const reached = prelaunch ? -1 : (shrine.state?.prophecy ?? -1);
  const ath = prelaunch ? 0 : (shrine.state?.athMcapUsd ?? 0);
  const next = shrine.milestones.find((m) => m.index === reached + 1) ?? null;
  const prevCap = reached >= 0 ? shrine.milestones[reached].mcapUsd : 0;
  const progress = next ? Math.max(0, Math.min(1, (ath - prevCap) / (next.mcapUsd - prevCap))) : 1;
  return (
    <section className="pb-section pb-prophecy" aria-label="the prophecy">
      <div className="pb-section-head">
        <h2>The Prophecy</h2>
        <p>Seven signs, written on a road nobody drives. Each one is unlocked by the highest market cap ever reached, and never lost again.</p>
      </div>
      <ol className="pb-steps">
        {shrine.milestones.map((m) => {
          const state = m.index <= reached ? 'done' : m.index === reached + 1 ? 'next' : 'locked';
          return (
            <li key={m.index} className={`pb-step pb-step-${state}`}>
              <span className="pb-step-cap">{fmtCap(m.mcapUsd)}</span>
              <span className="pb-step-name">{m.name}</span>
              <span className="pb-step-line">{state === 'locked' ? '· · ·' : m.line}</span>
              {state === 'next' && (
                <span className="pb-step-bar" aria-label={`progress to ${m.name}`}>
                  <span style={{ width: `${Math.round(progress * 100)}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!prelaunch && next && shrine.ready && (
        <p className="pb-prophecy-foot">
          ATH {fmtUsd(ath, { compact: true })} · {Math.round(progress * 100)}% of the way to <strong>{next.name}</strong>
        </p>
      )}
    </section>
  );
}
