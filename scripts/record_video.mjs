// record_video.mjs <page.html> <out.mp4> <seconds> [trim=0.9] — records an HTML animation with Chromium (webm) and
// transcodes it to H.264 MP4 (yuv420p, 30 fps) for X.
import { chromium } from '/tmp/claude-0/-home-user-flora/6786263e-f3e7-5abe-ae49-5b613c1f7ca8/scratchpad/pw/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [html, out, secs, trim = '0.9'] = process.argv.slice(2); // trim: seconds of blank Chromium frames before the page painted
const dir = fs.mkdtempSync('/tmp/rec-');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir, size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage();
// Freeze animations until the page (fonts, image) is ready so the timeline starts at t=0 of the recording.
await page.addInitScript(() => { document.documentElement.style.setProperty('--paused', 'paused'); });
await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: '* { animation-play-state: running !important; }' });
await page.waitForTimeout((+secs) * 1000 + 300);
await ctx.close();
await browser.close();
const webm = fs.readdirSync(dir).find((f) => f.endsWith('.webm'));
execFileSync('/usr/bin/ffmpeg', ['-y', '-v', 'error', '-ss', String(trim), '-i', path.join(dir, webm), '-t', String(+secs - +trim), '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
console.log('recorded', out, fs.statSync(out).size);
