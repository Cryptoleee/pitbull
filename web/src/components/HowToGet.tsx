import { BUY_URL, PONS_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';

interface Props {
  shrine: ShrineData;
  prelaunch: boolean;
}

export function HowToGet({ shrine, prelaunch }: Props) {
  const symbol = shrine.token?.symbol || 'PITBULL';
  const steps = [
    { title: 'A wallet on Robinhood Chain', text: 'Phantom or any EVM wallet. Add Robinhood Chain (chain id 4663) if it is not there yet.' },
    { title: 'ETH on Robinhood Chain', text: 'Send ETH to the wallet and swap or bridge it to Robinhood Chain. Gas is tiny.' },
    { title: `Get $${symbol} on Pons`, text: prelaunch ? 'The token page goes live at launch. Follow on X so you do not miss it.' : 'Buy on the Pons page. After graduation it trades on Uniswap on Robinhood Chain.' },
    { title: 'Hold', text: 'That is the whole strategy. The Pitbull does the rest.' },
  ];
  return (
    <section className="pb-section pb-how" aria-label="how to get the token">
      <div className="pb-section-head">
        <h2>Get chosen</h2>
        <p>Four steps. No wallet connect on this site, ever.</p>
      </div>
      <ol className="pb-how-steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="pb-how-n">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="pb-actions">
        {prelaunch ? (
          <a className="pb-btn pb-btn-primary" href={X_URL} target="_blank" rel="noreferrer">
            𝕏 Follow for the launch
          </a>
        ) : (
          <a className="pb-btn pb-btn-primary" href={BUY_URL} target="_blank" rel="noreferrer">
            Get ${symbol} on Pons
          </a>
        )}
        <a className="pb-btn" href={PONS_URL} target="_blank" rel="noreferrer">
          What is Pons?
        </a>
      </div>
    </section>
  );
}
