import { useEffect } from 'react';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { HowToGet } from './components/HowToGet';
import { Legend } from './components/Legend';
import { Prophecy } from './components/Prophecy';
import { Stats } from './components/Stats';
import { StreamOverlay } from './components/StreamOverlay';
import { FORCE_PRELAUNCH } from './lib/links';
import { useShrine } from './lib/useShrine';

/** Stream mode (?stream=1): a 16:9 broadcast frame with no controls, for OBS or the headless streamer. */
const params = new URLSearchParams(window.location.search);
const STREAM = params.get('stream') === '1';

export function App() {
  const shrine = useShrine();
  const prelaunch = shrine.prelaunch || FORCE_PRELAUNCH || (!shrine.ready && shrine.status === 'offline');

  useEffect(() => {
    const symbol = shrine.token?.symbol || 'PITBULL';
    document.title = prelaunch ? `$${symbol} — launching soon on Robinhood Chain` : `$${symbol} — the mythical creature that brings wealth`;
  }, [prelaunch, shrine.token?.symbol]);

  if (STREAM) {
    return (
      <div className="pb-stream">
        <StreamOverlay shrine={shrine} prelaunch={prelaunch} />
      </div>
    );
  }

  return (
    <div className={`pb-app ${shrine.ready ? 'is-ready' : ''} ${prelaunch ? 'is-prelaunch' : ''}`}>
      <Hero shrine={shrine} prelaunch={prelaunch} />
      <main>
        <Stats shrine={shrine} prelaunch={prelaunch} />
        <Prophecy shrine={shrine} prelaunch={prelaunch} />
        <Legend />
        <HowToGet shrine={shrine} prelaunch={prelaunch} />
      </main>
      <Footer shrine={shrine} />
      {shrine.toast && (
        <div className="pb-toast" role="status">
          <span className="pb-toast-kicker">Prophecy fulfilled</span>
          <strong>{shrine.toast.name}</strong>
          <span className="pb-toast-line">{shrine.toast.line}</span>
        </div>
      )}
    </div>
  );
}
