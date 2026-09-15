import { useEffect, useState } from 'react';
import { countdown } from '../lib/format';

/** LED countdown to the launch moment, in the style of a 1998 "site opens in" counter. */
export function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const c = countdown(to, now);
  if (c.done) return <p className="tag blink">THE ROAD IS OPEN — ANY MOMENT NOW</p>;
  const cell = (v: number, label: string) => (
    <div key={label}>
      <b>{String(v).padStart(2, '0')}</b>
      <span>{label}</span>
    </div>
  );
  return (
    <div className="cd" aria-label="countdown to launch">
      {cell(c.days, 'DAYS')}
      {cell(c.hours, 'HOURS')}
      {cell(c.minutes, 'MIN')}
      {cell(c.seconds, 'SEC')}
    </div>
  );
}
