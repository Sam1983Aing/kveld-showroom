// The page recorded with its real sound: what the page's own audio graph plays, taken off the bus with a
// MediaStreamDestination while Chrome stays muted, so nothing comes out of the Mac's speakers. Real clicks
// and hovers, since a browser only lets sound start from a gesture.
//   node tools/record_sound.mjs <out-without-ext> [desktop|phone] [full|hear|bench|order|hover]
// Writes <out>.mp4, <out>.wav, and prints peak, RMS per section. Needs the site on :8013.
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { dirname } from 'path';
import { openChrome, openKveld, marks } from './chrome.mjs';
const [out = 'demo/qa/sound', which = 'desktop', plan = 'full'] = process.argv.slice(2);
const phone = which === 'phone', size = phone ? { width: 390, height: 844 } : { width: 1380, height: 792 };
mkdirSync(dirname(out), { recursive: true });
const { browser, close } = await openChrome({ timeout: 400000 });
const page = await openKveld(browser, { w: size.width, h: size.height, dpr: phone ? 2 : 1, phone });
const M = await marks(page), vh = M.vh;
const S = { room: M.room, shop: M.shop, order: M.order };
const scroll = (keys) => page.evaluate((P) => { window.__scrollDone = false; const t0 = performance.now(); const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  (function f(now) { const t = (now - t0) / 1000; let v = P[P.length - 1][1]; for (let k = 1; k < P.length; k++) if (t < P[k][0]) { v = P[k - 1][1] + (P[k][1] - P[k - 1][1]) * ease((t - P[k - 1][0]) / (P[k][0] - P[k - 1][0])); break; }
    window.scrollTo({ top: v, left: 0, behavior: 'instant' }); if (t < P[P.length - 1][0] + 0.1) requestAnimationFrame(f); else window.__scrollDone = true; })(t0); }, keys);
const jumpTo = async (y) => { await page.evaluate((y) => window.__lenis.scrollTo(Math.round(y), { immediate: true, force: true }), y); await page.waitForTimeout(1200); await page.evaluate(() => { const r = window.__room; r.walkAt = r.walkTo; }); };
const start = plan === 'full' || plan === 'hover' ? 0 : plan === 'hear' ? M.hear - 0.9 * vh : plan === 'bench' ? (S.shop[0] - 0.9 * vh) : (S.order ? S.order[0] - 0.9 * vh : M.orderTop - 0.7 * vh);
await jumpTo(start);
// the sound is taken from here on
const cdp = await page.context().newCDPSession(page), frames = [];
cdp.on('Page.screencastFrame', (f) => { frames.push([f.metadata.timestamp, Buffer.from(f.data, 'base64')]); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 86, maxWidth: size.width * (phone ? 2 : 1), maxHeight: size.height * (phone ? 2 : 1), everyNthFrame: 1 });
await page.waitForTimeout(600);
const sw = phone ? '.nv__sound' : '.nv__sound';
await page.click(sw);
await page.evaluate(() => {
  const c = window.__sound.ctx(), d = c.createMediaStreamDestination(); window.__sound.bus().connect(d);
  const rec = new MediaRecorder(d.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 }), chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  window.__rec = { rec, chunks, at: Date.now() / 1000, marks: [] };
  rec.start(500);
  window.__recTimer = setInterval(() => window.__rec.marks.push([Date.now() / 1000, document.querySelector('.nv__board button.is-on')?.dataset.nav || '', document.querySelector('.nv__sound')?.getAttribute('aria-pressed')]), 100);
});
const go = async (keys) => { await scroll(keys); await page.waitForFunction(() => window.__scrollDone, null, { timeout: 200000 }); };
const hover = async (n) => { const b = await page.$(`.spot__names li:nth-child(${n}) button`), r = await b.boundingBox(); await page.mouse.move(r.x + 60, r.y + r.height / 2, { steps: 8 }); };
const y0 = start;
if (plan === 'full') {
  await page.waitForTimeout(4000);
  const end = S.shop[1], d = S.order ? [S.order[0], S.order[1]] : [M.orderTop, M.visit];
  await go([[0, 0], [14, 5.5 * vh], [36, 18 * vh], [41, S.shop[0]], [58, S.shop[0] + 5 * vh], [63, M.hear]]);
  await page.waitForTimeout(500);
  if (!phone) { await page.click('.spot__names li:nth-child(1) button'); await page.waitForTimeout(3200); await hover(6); await page.waitForTimeout(3200); }
  else { await page.tap('[data-play]'); await page.waitForTimeout(3600); }
  const M2 = await marks(page), oS = M2.order ? M2.order[0] : M2.orderTop, oE = M2.order ? M2.order[0] + 2.4 * vh : M2.visit - 0.4 * vh;
  await go([[0, M2.hear], [5, oS], [17, oE], [22, M2.max]]);
  await page.waitForTimeout(6500);
} else if (plan === 'bench') {
  await page.waitForTimeout(2000);
  await go([[0, y0], [4, S.shop[0]], [24, S.shop[0] + 5 * vh], [27, S.shop[0] + 5 * vh]]);
} else if (plan === 'order') {
  await page.waitForTimeout(1500);
  const oS = S.order ? S.order[0] : M.orderTop, oE = S.order ? S.order[0] + 2.4 * vh : M.visit - 0.4 * vh;
  await go([[0, y0], [3, oS], [16, oE], [20, oE]]);
  if (!phone) { for (const n of [2, 6, 5, 1]) { const b = await page.$(`.order__row[data-g="${n}"]`), r = await b.boundingBox(); await page.mouse.move(r.x + 100, r.y + r.height / 2, { steps: 10 }); await page.waitForTimeout(1100); } }
  const M2 = await marks(page);
  await go([[0, oE], [5, M2.max]]);
  await page.waitForTimeout(3000);
} else if (plan === 'hear') {
  await go([[0, y0], [2.5, M.hear]]);
  await page.waitForTimeout(1000);
  if (!phone) { await page.click('.spot__names li:nth-child(1) button'); await page.waitForTimeout(4400); await hover(5); await page.waitForTimeout(4400); await hover(6); await page.waitForTimeout(4400); }
  else { await page.tap('[data-play]'); await page.waitForTimeout(4400); await page.tap('.spot__dots li:nth-child(5) button'); await page.waitForTimeout(4400); }
} else if (plan === 'hover') {
  await page.waitForTimeout(2500);
  for (const sel of ['[data-view]', '.room__arrow--halo[data-next]', '.nv__book', '.nv__board button:nth-of-type(3)', '.nv__brand', '.room__scroll']) { const b = await page.$(sel), r = await b.boundingBox(); await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 14 }); await page.waitForTimeout(1200); }
}
const res = await page.evaluate(() => new Promise((ok) => { clearInterval(window.__recTimer); const { rec, chunks, at, marks } = window.__rec; rec.onstop = async () => { const b = new Blob(chunks), u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); ok({ b64: btoa(s), at, marks }); }; rec.stop(); }));
const tEnd = Date.now() / 1000;
await cdp.send('Page.stopScreencast').catch(() => {});
const errs = page.problems.slice();
close();
const dir = `${out}.tmp/`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
writeFileSync(`${out}.webm`, Buffer.from(res.b64, 'base64'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${out}.webm`, '-ar', '44100', '-ac', '2', `${out}.wav`]);
let list = 'ffconcat version 1.0\n';
frames.forEach(([t, jpg], k) => { const f = `${String(k).padStart(5, '0')}.jpg`; writeFileSync(dir + f, jpg); list += `file ${f}\nduration ${(((frames[k + 1]?.[0] ?? tEnd) - t)).toFixed(4)}\n`; });
list += `file ${String(frames.length - 1).padStart(5, '0')}.jpg\n`;
writeFileSync(`${dir}list.txt`, list);
const offset = Math.max(0, res.at - frames[0][0]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-i', `${dir}list.txt`, '-itsoffset', offset.toFixed(3), '-i', `${out}.wav`, '-map', '0:v', '-map', '1:a', '-af', `apad`, '-vf', `fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2`, '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', `${out}.mp4`]);
rmSync(dir, { recursive: true, force: true }); rmSync(`${out}.webm`, { force: true });
writeFileSync(`${out}.marks.json`, JSON.stringify({ at: res.at, marks: res.marks }));
console.log('frames', frames.length, 'seconds', (tEnd - frames[0][0]).toFixed(1), 'errors', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
execFileSync('python3', [decodeURIComponent(new URL('sound_stats.py', import.meta.url).pathname), `${out}.wav`, `${out}.marks.json`], { stdio: 'inherit' });
process.exit(0);
