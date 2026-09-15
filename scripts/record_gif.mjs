// record_gif.mjs <page.html> <outbase> <seconds> [square=1080] [out=480] [fps=12]
// Records a looping square animation and writes <outbase>.gif + <outbase>.mp4.
//
// Chromium's recorded frame is ~86px shorter than the viewport in this environment (the missing strip
// comes back as grey padding at the bottom), so the viewport is asked for CHROME_PAD extra pixels and the
// frame is cropped back to the square from the top. The page itself is laid out at the plain square size.
import { chromium } from '/tmp/claude-0/-home-user-flora/6786263e-f3e7-5abe-ae49-5b613c1f7ca8/scratchpad/pw/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PAD = 86;
const [html, outbase, secs, square = '1080', out = '480', fps = '12'] = process.argv.slice(2);
const side = +square;
const dir = fs.mkdtempSync('/tmp/gif-');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required'],
});
const t0 = Date.now();
const size = { width: side, height: side + CHROME_PAD };
const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text()));
await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
const start = await page.evaluate(() => {
  window.startShow?.();
  return performance.timeOrigin + performance.now();
});
const preroll = Math.max(0, (start - t0) / 1000);
await page.waitForTimeout(+secs * 1000 + 400);
await ctx.close();
await browser.close();

const webm = path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('.webm')));
const chain = `crop=${side}:${side}:0:0,fps=${fps},scale=${out}:${out}:flags=lanczos`;
const ff = (args) => execFileSync('/usr/bin/ffmpeg', ['-y', '-v', 'error', ...args]);
ff(['-ss', preroll.toFixed(3), '-i', webm, '-t', secs, '-vf', `${chain},palettegen=max_colors=192:stats_mode=diff`, `${outbase}-pal.png`]);
ff(['-ss', preroll.toFixed(3), '-i', webm, '-i', `${outbase}-pal.png`, '-t', secs, '-lavfi', `${chain}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=3`, '-loop', '0', `${outbase}.gif`]);
ff(['-ss', preroll.toFixed(3), '-i', webm, '-t', secs, '-vf', `crop=${side}:${side}:0:0,fps=25`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${outbase}.mp4`]);
fs.unlinkSync(`${outbase}-pal.png`);
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(2) + ' MB';
console.log(`${path.basename(outbase)}: gif ${mb(outbase + '.gif')}, mp4 ${mb(outbase + '.mp4')} (pre-roll ${preroll.toFixed(2)}s)`);
