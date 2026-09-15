import { useEffect } from 'react';
import { Chaos } from './components/Chaos';
import { Divider } from './components/Divider';
import { Footer } from './components/Footer';
import { GetChosen } from './components/GetChosen';
import { Legend } from './components/Legend';
import { Masthead } from './components/Masthead';
import { PitbullCam } from './components/PitbullCam';
import { Prophecy } from './components/Prophecy';
import { Shrine } from './components/Shrine';
import { StreamFrame } from './components/StreamFrame';
import { FORCE_PRELAUNCH } from './lib/links';
import { useShrine } from './lib/useShrine';

/** Stream mode (?stream=1): the 16:9 broadcast frame, no page chrome. */
const params = new URLSearchParams(window.location.search);
const STREAM = params.get('stream') === '1';

export function App() {
  const shrine = useShrine();
  const prelaunch = shrine.prelaunch || FORCE_PRELAUNCH || (!shrine.ready && shrine.status === 'offline');

  useEffect(() => {
    const symbol = shrine.token?.symbol || 'PITBULL';
    document.title = prelaunch
      ? `$${symbol} - launching soon on Robinhood Chain`
      : `$${symbol} - the mythical creature that brings wealth`;
  }, [prelaunch, shrine.token?.symbol]);

  if (STREAM) return <StreamFrame shrine={shrine} prelaunch={prelaunch} />;

  return (
    <>
      <Chaos count={26} sparkles={10} seed={7} />
      <div className="construction" />
      <div className="page">
        <Masthead shrine={shrine} prelaunch={prelaunch} />
        <Shrine shrine={shrine} prelaunch={prelaunch} />
        <Divider label="LIVE ON CHAIN" text="*** the numbers above update by themselves *** no refresh needed *** no wallet connect *** DALE ***" />
        <PitbullCam shrine={shrine} prelaunch={prelaunch} />
        <Divider label="7 SIGNS" text="*** each sign unlocks at an all-time-high market cap and is never lost again *** DALE ***" />
        <Prophecy shrine={shrine} prelaunch={prelaunch} />
        <Divider label="THE LORE" />
        <Legend />
        <Divider label="HOW TO" text="*** horns. aviators. bag. *** he doesn't watch the chart, the chart watches him *** DALE ***" />
        <GetChosen shrine={shrine} prelaunch={prelaunch} />
        <Footer shrine={shrine} />
      </div>
      <div className="construction" />
      {shrine.toast && (
        <div className="win toast">
          <div className="bar">
            <span>PROPHECY FULFILLED !!!</span>
            <span className="btns">
              <i>X</i>
            </span>
          </div>
          <div className="body">
            <p className="nm">{shrine.toast.name}</p>
            <p className="ln">{shrine.toast.line}</p>
          </div>
        </div>
      )}
    </>
  );
}
