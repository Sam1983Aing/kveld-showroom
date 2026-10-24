// 02 · Hear them, recorded with its sound (V7, 2026-10-23). The demo recorder mutes audio and cannot
// click, and a browser only lets sound start from a real click, so this one drives the page with
// Playwright (real clicks and hovers), logs when each phrase starts (window.__plays), and lays the
// rendered phrases (tools/voices_render.mjs) under the video at those moments.
//   node demo/v7/record-hear.mjs desktop|phone      -> demo/v7/hear-<which>.mp4
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
const require = createRequire(new URL('../../tools/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const HERE = decodeURIComponent(new URL('.', import.meta.url).pathname), TMP = `${HERE}clips/hear-tmp/`;
mkdirSync(TMP, { recursive: true });
const which = process.argv[2] || 'desktop', phone = which === 'phone';
const size = phone ? { width: 390, height: 844 } : { width: 1380, height: 792 };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone });
const page = await ctx.newPage();
await page.goto('http://localhost:8013/');
await page.waitForFunction(() => window.__room?.items?.every((it) => it.ready) && !document.querySelector('.loader') && document.querySelector('.spot__names li') && document.querySelector('#workshop')?.dataset.ready, null, { timeout: 120000 });
await page.waitForTimeout(2000);                            // the page's last ScrollTrigger refresh moves 02 down by the bench's pin
await page.evaluate(() => { const y = document.querySelector('#guitars').getBoundingClientRect().top + scrollY; window.__lenis.scrollTo(y - innerHeight * 0.9, { immediate: true, force: true }); });
await page.waitForTimeout(1500);
// frames from Chrome's screencast, each with its wall-clock time (the same clock as Date.now())
const cdp = await ctx.newCDPSession(page), frames = [];
cdp.on('Page.screencastFrame', (f) => { frames.push([f.metadata.timestamp, Buffer.from(f.data, 'base64')]); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: size.width * (phone ? 2 : 1), maxHeight: size.height * (phone ? 2 : 1), everyNthFrame: 1 });
const v0 = Date.now();
await page.evaluate(() => new Promise((ok) => { const y = document.querySelector('#guitars').getBoundingClientRect().top + scrollY; window.__lenis.scrollTo(y, { duration: 2.2, onComplete: ok }); }));
await page.waitForTimeout(1500);
const hover = async (n) => { const b = await page.$(`.spot__names li:nth-child(${n}) button`), r = await b.boundingBox(); await page.mouse.move(r.x + 60, r.y + r.height / 2, { steps: 8 }); };
if (!phone) {
  await page.click('.spot__names li:nth-child(1) button'); await page.waitForTimeout(4600);    // Floe, a click turns the sound on
  await hover(5); await page.waitForTimeout(4600);                                              // Fjord, by pointing
  await hover(6); await page.waitForTimeout(4600);                                              // Rowan
  await hover(2); await page.waitForTimeout(4200);                                              // Sedge
} else {
  await page.tap('[data-play]'); await page.waitForTimeout(4600);                               // Hear Floe
  await page.tap('.spot__dots li:nth-child(5) button'); await page.waitForTimeout(4600);       // Fjord
  await page.tap('.spot__dots li:nth-child(6) button'); await page.waitForTimeout(4600);       // Rowan
  await page.tap('.spot__dots li:nth-child(2) button'); await page.waitForTimeout(4200);       // Sedge
}
const plays = await page.evaluate(() => window.__plays || []);
const tEnd = Date.now() / 1000;
await cdp.send('Page.stopScreencast');
await page.close(); await ctx.close(); await browser.close();
// a screencast only sends a frame when the picture changes: hold each until the next
const t0 = frames[0][0], dir = `${TMP}${which}/`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
let list = 'ffconcat version 1.0\n';
frames.forEach(([t, jpg], k) => { const f = `${String(k).padStart(5, '0')}.jpg`; writeFileSync(dir + f, jpg); list += `file ${f}\nduration ${(((frames[k + 1]?.[0] ?? tEnd) - t)).toFixed(4)}\n`; });
list += `file ${String(frames.length - 1).padStart(5, '0')}.jpg\n`;
writeFileSync(dir + 'list.txt', list);
const cut = 0, end = tEnd - t0;
const cues = plays.map(([id, t]) => [id, t / 1000 - t0]);
console.log('frames', frames.length, 'cues', JSON.stringify(cues), 'length', end.toFixed(1));
// the soundtrack: each phrase from its cue until the next one starts (a short fade), mixed in Python
execFileSync('python3', [`${HERE}hear-mix.py`, `${TMP}${which}.wav`, end.toFixed(2), JSON.stringify(cues)], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-i', dir + 'list.txt', '-i', `${TMP}${which}.wav`, '-map', '0:v', '-map', '1:a', '-vf', `scale=${size.width * (phone ? 2 : 1)}:-2`,
  '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', `${HERE}hear-${which}.mp4`]);
console.log('wrote', `demo/v7/hear-${which}.mp4`);
