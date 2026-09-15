export function fmtUsd(v: number | undefined | null, opts: { compact?: boolean } = {}): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  if (opts.compact) {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 10_000) return `$${(v / 1000).toFixed(1)}K`;
  }
  if (v >= 1000) return `$${Math.round(v).toLocaleString('en-US')}`;
  return `$${v.toFixed(2)}`;
}

/** Prices for micro-cap tokens need more precision than cents. */
export function fmtPrice(v: number | undefined | null): string {
  if (v === undefined || v === null || !Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  const digits = Math.min(12, -Math.floor(Math.log10(v)) + 3);
  return `$${v.toFixed(digits)}`;
}

export function fmtInt(v: number | undefined | null): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return Math.round(v).toLocaleString('en-US');
}

/** Short milestone caps: $50K, $1M, $1B. */
export function fmtCap(v: number): string {
  if (v >= 1_000_000_000) return `$${v / 1_000_000_000}B`;
  if (v >= 1_000_000) return `$${v / 1_000_000}M`;
  return `$${Math.round(v / 1000)}K`;
}

/** "3d 14h" since a timestamp, "—" when unknown. */
export function fmtAge(since: number | null | undefined, now = Date.now()): string {
  if (!since) return '—';
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Countdown parts to a moment; all zero once passed. */
export function countdown(to: number, now = Date.now()) {
  const s = Math.max(0, Math.floor((to - now) / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: s === 0 };
}

export function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
