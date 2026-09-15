import { useState } from 'react';
import { fmtInt, shortAddress } from '../lib/format';
import { dexscreenerUrl, explorerTokenUrl, PONS_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';

export function Footer({ shrine }: { shrine: ShrineData }) {
  const [copied, setCopied] = useState(false);
  const t = shrine.token;
  const symbol = t?.symbol || 'PITBULL';
  const visitors = 1337 + (shrine.state?.trades ?? 0);
  const copy = async () => {
    if (!t?.address) return;
    try {
      await navigator.clipboard.writeText(t.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is still selectable */
    }
  };
  return (
    <footer className="foot">
      <div className="links">
        <a href={X_URL} target="_blank" rel="noreferrer">
          𝕏 Community
        </a>
        <a href={PONS_URL} target="_blank" rel="noreferrer">
          Pons
        </a>
        {t?.address && (
          <>
            <a href={dexscreenerUrl(t.dexChain, t.address)} target="_blank" rel="noreferrer">
              Dexscreener
            </a>
            <a href={explorerTokenUrl(t.explorerUrl, t.address)} target="_blank" rel="noreferrer">
              Blockscout
            </a>
          </>
        )}
        <a href="#shrine">The Shrine</a>
        <a href="#legend">The Legend</a>
      </div>

      {t?.address && (
        <div className="ca" onClick={copy} title="Copy the contract address">
          <b>CA:</b> <code>{shortAddress(t.address)}</code> <span>{copied ? '(copied!)' : '(click to copy)'}</span>
        </div>
      )}

      <p className="meta">
        You are visitor N°{' '}
        <span className="counter">
          {String(visitors)
            .padStart(7, '0')
            .split('')
            .map((d, i) => (
              <b key={i}>{d}</b>
            ))}
        </span>{' '}
        &nbsp;·&nbsp; {fmtInt(shrine.state?.holders)} believers &nbsp;·&nbsp; best viewed in Netscape Navigator 4.0 at 800×600
      </p>

      <div className="webring">
        ← &nbsp;<a href={X_URL} target="_blank" rel="noreferrer">prev</a>&nbsp; | &nbsp;THE MYTHICAL CREATURE WEBRING&nbsp; | &nbsp;
        <a href={X_URL} target="_blank" rel="noreferrer">next</a>&nbsp; →
      </div>

      <p className="disclaimer">
        ${symbol} is a meme coin on Robinhood Chain with no intrinsic value, no utility and no expectation of financial return. The Pitbull is a
        fictional creature; this project is not affiliated with, endorsed by or connected to any artist, person, brand or exchange. Nothing here is
        financial advice. Only spend what you can afford to lose. This page has no wallet connect and will never ask for a seed phrase.
      </p>
    </footer>
  );
}
