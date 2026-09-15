/* Shared chaos helpers for the Geocities-style pages: seeded so a render is reproducible. */
function geoRng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/** Scatters dollar signs (and fat gold coins) across a container. */
/** True when (x, y) in percent falls inside one of the keep-clear rectangles. */
function geoBlocked(x, y, avoid) {
  return (avoid || []).some((a) => x > a.x0 && x < a.x1 && y > a.y0 && y < a.y1);
}

function geoRain(sel, count, seed, opts = {}) {
  const host = document.querySelector(sel);
  if (!host) return;
  const r = geoRng(seed);
  const min = opts.min || 34;
  const max = opts.max || 96;
  const coins = opts.coins === undefined ? 0.25 : opts.coins;
  let placed = 0;
  for (let guard = 0; placed < count && guard < count * 40; guard++) {
    const size = min + r() * (max - min);
    const x = (opts.x0 || 0) + r() * ((opts.x1 || 100) - (opts.x0 || 0));
    const y = (opts.y0 || 0) + r() * ((opts.y1 || 100) - (opts.y0 || 0));
    if (geoBlocked(x, y, opts.avoid)) continue;
    placed++;
    const el = document.createElement('span');
    el.className = r() < coins ? 'coin' : 'dollar';
    el.textContent = '$';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.fontSize = size + 'px';
    const rot = (r() * 60 - 30).toFixed(1) + 'deg';
    if (opts.fall) {
      // falling layer: the animation owns the transform, so the rotation goes into a custom property
      el.classList.add('falling');
      el.style.setProperty('--r', rot);
      el.style.setProperty('--d', (opts.dMin || 2.6) + r() * ((opts.dMax || 6) - (opts.dMin || 2.6)) + 's');
      el.style.setProperty('--dl', (opts.delay || 0) + r() * (opts.spread === undefined ? 4 : opts.spread) + 's');
      el.style.top = '-12%';
    } else {
      el.style.transform = `rotate(${rot})`;
    }
    if (el.classList.contains('coin')) {
      el.style.width = el.style.height = size * 1.25 + 'px';
      el.style.fontSize = size * 0.8 + 'px';
    }
    host.appendChild(el);
  }
}

/** Four-point sparkles, the kind every 1998 homepage had. */
function geoSparkles(sel, count, seed, opts = {}) {
  const host = document.querySelector(sel);
  if (!host) return;
  const r = geoRng(seed);
  let placed = 0;
  for (let guard = 0; placed < count && guard < count * 40; guard++) {
    const x = r() * 100, y = r() * 100;
    if (geoBlocked(x, y, opts.avoid)) continue;
    placed++;
    const el = document.createElement('i');
    el.className = 'sparkle' + (r() < 0.5 ? ' s' : '');
    el.style.left = x + '%';
    el.style.top = y + '%';
    host.appendChild(el);
  }
}

/** MS Paint style candle chart that only goes up. */
function geoChart(sel, seed = 3) {
  const svg = document.querySelector(sel);
  if (!svg) return;
  const W = +svg.dataset.w, H = +svg.dataset.h;
  const r = geoRng(seed);
  const NS = 'http://www.w3.org/2000/svg';
  const add = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    svg.appendChild(n);
    return n;
  };
  add('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' });
  for (let i = 1; i < 10; i++) add('line', { x1: 0, y1: (H / 10) * i, x2: W, y2: (H / 10) * i, stroke: '#c8c8c8', 'stroke-width': 2 });
  for (let i = 1; i < 14; i++) add('line', { x1: (W / 14) * i, y1: 0, x2: (W / 14) * i, y2: H, stroke: '#e0e0e0', 'stroke-width': 2 });
  const n = 22;
  const step = W / (n + 1);
  const top = H * 0.07, bottom = H * 0.92;
  // an exponential climb from bottom-left to top-right, with the odd red candle for flavour
  const path = (i) => bottom - (bottom - top) * Math.pow(i / (n - 1), 2.1);
  let price = bottom;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const drop = r() < 0.2 && i > 1 && i < n - 1;
    const open = price;
    price = path(i) + (drop ? (H * 0.03) * r() : -(H * 0.012) * r());
    const x = step * (i + 1);
    const top = Math.min(open, price), bot = Math.max(open, price);
    add('line', { x1: x, y1: top - 14 * r(), x2: x, y2: bot + 14 * r(), stroke: '#000', 'stroke-width': 3 });
    add('rect', { x: x - step * 0.3, y: top, width: step * 0.6, height: Math.max(6, bot - top), fill: drop ? '#ff0000' : '#00b800', stroke: '#000', 'stroke-width': 3 });
    pts.push(`${x},${price}`);
  }
  add('polyline', { points: pts.join(' '), fill: 'none', stroke: '#0000ff', 'stroke-width': 6, 'stroke-linejoin': 'round' });
  return pts[pts.length - 1].split(',').map(Number);
}

/** Everything flies out of the middle: the money explosion on a milestone or a beat drop. */
function geoBurst(sel, count, seed, opts = {}) {
  const host = document.querySelector(sel);
  if (!host) return;
  const r = geoRng(seed);
  for (let i = 0; i < count; i++) {
    const size = (opts.min || 40) + r() * ((opts.max || 120) - (opts.min || 40));
    const el = document.createElement('span');
    el.className = (r() < (opts.coins === undefined ? 0.4 : opts.coins) ? 'coin' : 'dollar') + ' bursting';
    el.textContent = '$';
    const ang = (i / count) * Math.PI * 2 + r() * 0.5;
    const dist = (opts.dist || 620) * (0.45 + r() * 0.75);
    el.style.left = (opts.cx === undefined ? 50 : opts.cx) + '%';
    el.style.top = (opts.cy === undefined ? 50 : opts.cy) + '%';
    el.style.fontSize = size + 'px';
    el.style.setProperty('--tx', Math.cos(ang) * dist * 1.5 + 'px');
    el.style.setProperty('--ty', Math.sin(ang) * dist + 'px');
    el.style.setProperty('--rr', (r() * 720 - 360).toFixed(0) + 'deg');
    el.style.setProperty('--bd', (opts.delay || 0) + r() * 0.12 + 's');
    if (el.classList.contains('coin')) {
      el.style.width = el.style.height = size * 1.25 + 'px';
      el.style.fontSize = size * 0.8 + 'px';
    }
    host.appendChild(el);
  }
}

/** A heap of gold coins along the bottom of a container: the fortune the Pitbull brings. */
function geoPile(sel, count, seed, opts = {}) {
  const host = document.querySelector(sel);
  if (!host) return;
  const r = geoRng(seed);
  const rows = opts.rows || 4;
  for (let row = 0; row < rows; row++) {
    const inRow = Math.max(1, Math.round((count / rows) * (1 - row / (rows + 1))));
    for (let i = 0; i < inRow; i++) {
      const size = (opts.min || 54) + r() * ((opts.max || 96) - (opts.min || 54));
      const el = document.createElement('span');
      el.className = 'coin';
      el.textContent = '$';
      const spread = 50 - row * 6;
      el.style.left = 50 - spread / 2 + r() * spread + '%';
      el.style.bottom = (opts.bottom || 0) + row * (opts.step || 42) + r() * 14 + 'px';
      el.style.width = el.style.height = size + 'px';
      el.style.fontSize = size * 0.62 + 'px';
      el.style.transform = `rotate(${(r() * 40 - 20).toFixed(1)}deg)`;
      host.appendChild(el);
    }
  }
}
