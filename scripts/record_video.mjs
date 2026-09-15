// record_video.mjs <page.html> <out.mp4> <seconds> [audio.mp4] [width] [height]
//
// Chromium's recorded frame is ~86px shorter than the viewport here (the rest arrives as grey padding at
// the bottom), so the viewport is asked for CHROME_PAD extra pixels and the frame is cropped back.
// Records an HTML animation with Chromium and transcodes it to H.264 for X. The page must expose
// window.startShow() (it unpauses every animation and plays its <video>); the recording starts a beat
// earlier, so the measured pre-roll is trimmed off and the optional audio track lines up with frame 0.
import { chromium } from '/tmp/claude-0/-home-user-flora/6786263e-f3e7-5abe-ae49-5b613c1f7ca8/scratchpad/pw/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PAD = 86;
const [html, out, secs, audio, w = '1920', h = '1080'] = process.argv.slice(2);
const dir = fs.mkdtempSync('/tmp/rec-');
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required'],
});
const t0 = Date.now();
const size = { width: +w, height: +h + CHROME_PAD };
const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text()));
await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const v = document.querySelector('video');
  if (!v) return;
  return v.readyState >= 3 ? null : new Promise((res) => v.addEventListener('canplaythrough', res, { once: true }));
});
const start = await page.evaluate(() => {
  window.startShow();
  return performance.timeOrigin + performance.now();
});
const preroll = Math.max(0, (start - t0) / 1000);
await page.waitForTimeout(+secs * 1000 + 400);
await ctx.close();
await browser.close();

const webm = path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('.webm')));
const args = ['-y', '-v', 'error', '-ss', preroll.toFixed(3), '-i', webm];
if (audio) args.push('-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k');
args.push('-t', String(secs), '-vf', `crop=${w}:${h}:0:0`, '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
execFileSync('/usr/bin/ffmpeg', args);
console.log(`recorded ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, pre-roll trimmed ${preroll.toFixed(2)}s)`);
