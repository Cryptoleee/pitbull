// trim_alpha.mjs <in.png> <out.png> [padding] — crops a transparent PNG to its alpha bounding box.
import { chromium } from '/tmp/claude-0/-home-user-flora/6786263e-f3e7-5abe-ae49-5b613c1f7ca8/scratchpad/pw/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const [inp, out, pad = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
const url = await page.evaluate(async ([data, pad]) => {
  const img = new Image();
  img.src = data;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const { data: px } = g.getImageData(0, 0, c.width, c.height);
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (px[(y * c.width + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const p = +pad;
  x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p);
  x1 = Math.min(c.width - 1, x1 + p); y1 = Math.min(c.height - 1, y1 + p);
  const o = document.createElement('canvas');
  o.width = x1 - x0 + 1;
  o.height = y1 - y0 + 1;
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return [o.toDataURL('image/png'), o.width, o.height];
}, [`data:image/png;base64,${fs.readFileSync(inp).toString('base64')}`, pad]);
fs.writeFileSync(out, Buffer.from(url[0].split(',')[1], 'base64'));
await browser.close();
console.log('trimmed', out, url[1] + 'x' + url[2]);
