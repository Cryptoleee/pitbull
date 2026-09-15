import { useMemo } from 'react';

/** Seeded so every render of the page drops the money in the same places. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

interface Props {
  /** falling dollars and coins */
  count?: number;
  sparkles?: number;
  seed?: number;
}

/** The animated-gif layer: money falls past the page forever, sparkles twinkle. Purely decorative. */
export function Chaos({ count = 26, sparkles = 10, seed = 7 }: Props) {
  const items = useMemo(() => {
    const r = rng(seed);
    const rain = Array.from({ length: count }, () => {
      const size = 34 + r() * 74;
      return {
        coin: r() < 0.28,
        left: r() * 100,
        size,
        dur: 5 + r() * 9,
        delay: -r() * 12,
        rot: r() * 60 - 30,
      };
    });
    const twinkles = Array.from({ length: sparkles }, () => ({ left: r() * 100, top: r() * 100, delay: -r() * 2 }));
    return { rain, twinkles };
  }, [count, sparkles, seed]);

  return (
    <div className="chaos" aria-hidden="true">
      {items.rain.map((d, i) => (
        <span
          key={i}
          className={d.coin ? 'coin' : 'dollar'}
          style={{
            left: `${d.left}%`,
            fontSize: d.coin ? `${d.size * 0.72}px` : `${d.size}px`,
            width: d.coin ? `${d.size * 1.15}px` : undefined,
            height: d.coin ? `${d.size * 1.15}px` : undefined,
            ['--d' as string]: `${d.dur}s`,
            ['--dl' as string]: `${d.delay}s`,
            ['--r' as string]: `${d.rot}deg`,
          }}
        >
          $
        </span>
      ))}
      {items.twinkles.map((s, i) => (
        <i key={i} className="sparkle" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  );
}
