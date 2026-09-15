import { BUY_URL, PONS_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';

export function GetChosen({ shrine, prelaunch }: { shrine: ShrineData; prelaunch: boolean }) {
  const symbol = shrine.token?.symbol || 'PITBULL';
  const steps = [
    { title: 'A wallet on Robinhood Chain', text: 'Phantom or any EVM wallet. Add Robinhood Chain (chain id 4663) if it is not in the list yet.' },
    { title: 'ETH on Robinhood Chain', text: 'Send ETH to the wallet and swap or bridge it to Robinhood Chain. Gas is tiny.' },
    { title: `Get $${symbol} on Pons`, text: prelaunch ? 'The token page opens at launch. Follow on 𝕏 so you do not miss it.' : 'Buy on the Pons page. After graduation it trades on Uniswap on Robinhood Chain.' },
    { title: 'Hold', text: 'That is the whole strategy. The Pitbull does the rest.' },
  ];
  return (
    <section className="win section" id="getchosen">
      <div className="bar">
        <span>HOWTO.HTM - 4 steps</span>
        <span className="btns">
          <i>_</i>
          <i>[]</i>
          <i>X</i>
        </span>
      </div>
      <div className="body">
        <div className="hgroup">
          <div className="wordart">
            <span className="ext">Get Chosen</span>
            <span className="fill">Get Chosen</span>
          </div>
          <p>Four steps. This site never asks you to connect a wallet.</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={s.title}>
              <span className="n">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="getrow">
          <a className="btn95 big gold" href={prelaunch ? X_URL : BUY_URL} target="_blank" rel="noreferrer">
            {prelaunch ? '𝕏 FOLLOW FOR THE LAUNCH' : `► GET $${symbol} ON PONS ◄`}
          </a>
          <a className="btn95" href={PONS_URL} target="_blank" rel="noreferrer">
            WHAT IS PONS?
          </a>
          <span className="tag blink">DALE !!!</span>
        </div>
      </div>
    </section>
  );
}
