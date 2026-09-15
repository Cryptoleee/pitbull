import { useEffect, useState } from 'react';
import { countdown } from '../lib/format';

export function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const c = countdown(to, now);
  if (c.done) {
    return <p className="pb-countdown-done">The road is open. Any moment now.</p>;
  }
  const cell = (v: number, label: string) => (
    <div className="pb-cd-cell">
      <span className="pb-cd-num">{String(v).padStart(2, '0')}</span>
      <span className="pb-cd-label">{label}</span>
    </div>
  );
  return (
    <div className="pb-countdown" aria-label="countdown to launch">
      {cell(c.days, 'days')}
      {cell(c.hours, 'hours')}
      {cell(c.minutes, 'min')}
      {cell(c.seconds, 'sec')}
    </div>
  );
}
