import { BUY_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';

/** PITBULL CAM: the creature on a loop in a little media window, with the manifest next to it. */
export function PitbullCam({ shrine, prelaunch }: { shrine: ShrineData; prelaunch: boolean }) {
  const symbol = shrine.token?.symbol || 'PITBULL';
  return (
    <div className="camrow section">
      <section className="win cam">
        <div className="bar">
          <span>
            <span className="live-badge blink">LIVE</span>PITBULL-CAM.AVI - [a road nobody drives]
          </span>
          <span className="btns">
            <i>_</i>
            <i>[]</i>
            <i>X</i>
          </span>
        </div>
        <div className="body">
          <video autoPlay muted loop playsInline poster="/assets/pitbull.jpg">
            <source src="/assets/hype.webm" type="video/webm" />
            <source src="/assets/hype.mp4" type="video/mp4" />
          </video>
        </div>
      </section>
      <div className="camside">
        <section className="win">
          <div className="bar">
            <span>MANIFEST.TXT</span>
            <span className="btns">
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <p className="big">He doesn&apos;t watch the chart.</p>
            <p className="big">The chart watches him.</p>
            <p style={{ marginTop: 10 }}>
              Half Pitbull. Half pitbull. Half bull. All star. Found on a gravel road between the last gas station and the moon. The legend is short: those who hold
              the Pitbull get rich. Not because of a chart. Because of him.
            </p>
          </div>
        </section>
        <section className="win">
          <div className="bar">
            <span>BUY.EXE</span>
            <span className="btns">
              <i>X</i>
            </span>
          </div>
          <div className="body" style={{ textAlign: 'center' }}>
            <a className="btn95 big gold" href={prelaunch ? X_URL : BUY_URL} target="_blank" rel="noreferrer">
              {prelaunch ? '𝕏 FOLLOW FOR THE LAUNCH' : `► GET $${symbol} ◄`}
            </a>
            <p style={{ marginTop: 10 }}>Bought on Pons. Traded on Uniswap after graduation. This site never asks for your wallet.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
