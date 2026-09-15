// render_poster.mjs <page.html> <out.png|jpg> <width> <height>
// Renders a poster HTML file (fonts from Google Fonts, images relative to the HTML) with Chromium at 1x.
import { chromium } from '/tmp/claude-0/-home-user-flora/6786263e-f3e7-5abe-ae49-5b613c1f7ca8/scratchpad/pw/node_modules/playwright-core/index.mjs';
import path from 'node:path';
const [html, out, w, h] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png', quality: out.endsWith('.jpg') ? 92 : undefined });
await browser.close();
console.log('rendered', out);
