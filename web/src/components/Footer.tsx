import { dexscreenerUrl, explorerTokenUrl, PONS_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';

export function Footer({ shrine }: { shrine: ShrineData }) {
  const t = shrine.token;
  const symbol = t?.symbol || 'PITBULL';
  return (
    <footer className="pb-footer">
      <nav className="pb-footer-links" aria-label="links">
        <a href={X_URL} target="_blank" rel="noreferrer">
          X
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
              Explorer
            </a>
          </>
        )}
      </nav>
      {t?.address && <code className="pb-footer-ca">{t.address}</code>}
      <p className="pb-disclaimer">
        ${symbol} is a meme coin on Robinhood Chain with no intrinsic value, no utility and no expectation of financial return. The Pitbull is a fictional
        creature; this project is not affiliated with, endorsed by or connected to any artist, person, brand or exchange. Nothing here is financial
        advice. Only spend what you can afford to lose.
      </p>
    </footer>
  );
}
