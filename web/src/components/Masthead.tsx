import { BUY_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';
import { Countdown } from './Countdown';

const MARQUEE =
  "*** $PITBULL *** THE MYTHICAL CREATURE THAT BRINGS WEALTH *** HALF BULL - HALF PITBULL - ALL STAR *** HE DOES NOT WATCH THE CHART, THE CHART WATCHES HIM *** ROBINHOOD CHAIN via PONS *** DALE ***";

export function Masthead({ shrine, prelaunch }: { shrine: ShrineData; prelaunch: boolean }) {
  const symbol = shrine.token?.symbol || 'PITBULL';
  return (
    <header className="masthead">
      <div className="newburst">NEW!</div>
      <div className="spincoin">$</div>
      <p className="welcome">~*~ Welcome to the Official Homepage of ~*~</p>
      <div className="wordart title">
        <span className="ext">${symbol}</span>
        <span className="fill">${symbol}</span>
      </div>
      <p className="tagline">The Mythical Creature That Brings Wealth</p>
      <div className="rainbow" style={{ margin: '12px 40px 0' }} />
      <p className="subline">
        Half Bull &bull; Half Pitbull &bull; All Star &nbsp;|&nbsp; <span className="red">{prelaunch ? 'LAUNCHING SOON ON ROBINHOOD CHAIN via PONS' : 'LIVE ON ROBINHOOD CHAIN via PONS'}</span>
      </p>

      <div className="hero-row">
        <div className="hero-frame">
          <img src="/assets/pitbull.jpg" alt="The Pitbull: a horned bull-dog creature with aviator sunglasses, flexing on a desert road" draggable={false} />
        </div>
        <div className="hero-cta">
          {prelaunch ? (
            <a className="btn95 big gold" href={X_URL} target="_blank" rel="noreferrer">
              𝕏 FOLLOW FOR THE LAUNCH
            </a>
          ) : (
            <a className="btn95 big gold" href={BUY_URL} target="_blank" rel="noreferrer">
              ► GET ${symbol} NOW ◄
            </a>
          )}
          <a className="btn95" href="#shrine">
            📊 SEE THE LIVE NUMBERS
          </a>
          <a className="btn95" href="#legend">
            📜 READ THE LEGEND
          </a>
          <span className="tag blink">NO WALLET CONNECT, EVER</span>
        </div>
      </div>

      {prelaunch && (
        <div className="win section" style={{ marginTop: 18 }}>
          <div className="bar">
            <span>LAUNCH.EXE</span>
            <span className="btns">
              <i>_</i>
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <div className="soon">
              <p className="head">LAUNCHING SOON</p>
              {shrine.launchAt ? <Countdown to={shrine.launchAt} /> : <p className="tag blink">DATE TO BE ANNOUNCED ON 𝕏</p>}
              <div className="lines">
                <p>
                  He is not on the chain yet, mi gente. <b>Half bull. Half pitbull. All star.</b>
                </p>
                <p style={{ marginTop: 8 }}>
                  The legend is short: those who hold the Pitbull get rich. Not because of a chart. Because of him.
                </p>
                <p style={{ marginTop: 8 }}>
                  The shrine below — market cap, believers, all-time high, the seven signs — wakes up the second he is summoned on Pons and reads
                  straight from Robinhood Chain from then on. No wallet connect, ever.
                </p>
              </div>
              <div className="cta">
                <a className="btn95 gold" href={X_URL} target="_blank" rel="noreferrer">
                  𝕏 FOLLOW FOR THE LAUNCH
                </a>
                <a className="btn95" href="#legend">
                  📜 READ THE LEGEND
                </a>
                <span className="tag blink">DALE !!!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="nav">
        <a className="btn95" href="#shrine">
          THE SHRINE
        </a>
        <a className="btn95" href="#prophecy">
          THE PROPHECY
        </a>
        <a className="btn95" href="#legend">
          THE LEGEND
        </a>
        <a className="btn95" href="#getchosen">
          GET CHOSEN
        </a>
        <a className="btn95" href={X_URL} target="_blank" rel="noreferrer">
          𝕏 COMMUNITY
        </a>
      </nav>

      <div className="topmarquee marquee" style={{ ['--ms' as string]: '26s' }}>
        <span>{MARQUEE}</span>
      </div>
    </header>
  );
}
