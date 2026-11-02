// How the page loads: entry time on several connections, and the frames while the four late guitars arrive.
//   node tools/load_check.mjs [url]        default the site on :8013
import { openChrome } from './chrome.mjs';
const URL_ = process.argv[2] || 'http://localhost:8013/';
const { browser, close } = await openChrome({ timeout: 500000 });
async function run(name, net, { w = 1725, h = 990, dpr = 2, cpu = 0, phone = false, click = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: phone });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const c = await ctx.newCDPSession(page); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (net) await c.send('Network.emulateNetworkConditions', { offline: false, latency: net[1], downloadThroughput: net[0] * 125000, uploadThroughput: 1.5e6 });
  if (cpu) await c.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  let bytes = 0, atEntry = 0; c.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  await page.addInitScript(() => { window.__gaps = []; let l = 0; const f = (t) => { if (l) window.__gaps.push([Math.round(t), Math.round(t - l)]); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const t0 = Date.now();
  await page.goto(URL_, { waitUntil: 'commit' });
  await page.waitForFunction(() => !document.querySelector('.loader') && window.__room, null, { timeout: 240000 });
  const entry = Date.now() - t0; atEntry = bytes;
  const tEntry = await page.evaluate(() => performance.now());
  await page.waitForFunction(() => window.__room.items.every((it) => it.ready), null, { timeout: 240000 });
  const allAt = Date.now() - t0;
  await page.waitForTimeout(1500);
  const after = await page.evaluate((t) => window.__gaps.filter(([at]) => at > t).map(([, g]) => g).sort((a, b) => b - a).slice(0, 4), tEntry);
  console.log(name.padEnd(30), `in the room ${(entry / 1000).toFixed(1)} s (${(atEntry / 1048576).toFixed(1)} MB), all seven ${(allAt / 1000).toFixed(1)} s (${(bytes / 1048576).toFixed(1)} MB), worst frames after entry ${after.join(' ')} ms`, errs.join(' | '));
  await ctx.close();
}
await run('fast wifi 100 Mbps', [100, 10]);
await run('average 25 Mbps', [25, 30]);
await run('4G 9 Mbps', [9, 60]);
await run('phone: 4G, CPU 4x slower', [9, 60], { w: 390, h: 844, cpu: 4, phone: true });
await run('slow 3 Mbps', [3, 120]);
close(); process.exit(0);
