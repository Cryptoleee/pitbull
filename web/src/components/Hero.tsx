import { useState } from 'react';
import { shortAddress } from '../lib/format';
import { BUY_URL, X_URL } from '../lib/links';
import type { ShrineData } from '../lib/useShrine';
import { Countdown } from './Countdown';

interface Props {
  shrine: ShrineData;
  prelaunch: boolean;
}

export function Hero({ shrine, prelaunch }: Props) {
  const [copied, setCopied] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const address = shrine.token?.address || '';
  const symbol = shrine.token?.symbol || 'PITBULL';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is still selectable */
    }
  };

  return (
    <header className="pb-hero">
      <div className="pb-hero-art">
        <img
          src={imgOk ? '/assets/pitbull.jpg' : '/assets/pitbull-placeholder.svg'}
          alt="The Pitbull: a horned bull-dog creature with aviator sunglasses flexing on a desert road"
          onError={() => setImgOk(false)}
          draggable={false}
        />
        <div className="pb-hero-fade" />
      </div>
      <div className="pb-hero-copy">
        <p className="pb-eyebrow">
          <span className="pb-dot" /> {prelaunch ? 'Launching soon' : 'Live'} · Robinhood Chain · via Pons
        </p>
        <h1 className="pb-title">${symbol}</h1>
        <p className="pb-tagline">The mythical creature that brings wealth.</p>
        <p className="pb-lede">
          Half bull. Half dog. All man. He doesn&apos;t watch the chart. <em>The chart watches him.</em>
        </p>
        {prelaunch && shrine.launchAt && <Countdown to={shrine.launchAt} />}
        <div className="pb-actions">
          {prelaunch ? (
            <a className="pb-btn pb-btn-primary" href={X_URL} target="_blank" rel="noreferrer">
              𝕏 Follow for the launch
            </a>
          ) : (
            <a className="pb-btn pb-btn-primary" href={BUY_URL} target="_blank" rel="noreferrer">
              Get ${symbol}
            </a>
          )}
          <a className="pb-btn" href={X_URL} target="_blank" rel="noreferrer">
            𝕏 Community
          </a>
          <a className="pb-btn pb-btn-ghost" href="#legend">
            Read the legend
          </a>
        </div>
        {!prelaunch && address && (
          <button className={`pb-contract ${copied ? 'is-copied' : ''}`} onClick={copy} title="Copy the contract address">
            <span className="pb-contract-label">CA</span>
            <code>{shortAddress(address)}</code>
            <span className="pb-contract-copy">{copied ? 'copied' : 'copy'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
