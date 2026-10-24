// Performance of the KVELD page: what loads and when, long tasks while the models land, the cost of
// one frame, and frame times in each part of the page. Needs the site on :8013.
//
//   COMPACT=1 node tools/perf.mjs 1725x990 2        Sam's window on his Retina screen (the one that matters)
//   COMPACT=1 HEADFUL=1 node tools/perf.mjs ...     the same in a real Chrome window (opens on screen)
//
// Frame times are requestAnimationFrame ticks: once the room rests (nothing moving, see idleTime in
// showroom.js) it stops drawing and the ticks say 60 whatever the cost. For heat and the fan, read the
// GPU's own counter with tools/gpu_busy.sh while the page is open.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const [size = '1725x990', dprArg = '2'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number), dpr = +dprArg;
const browser = await chromium.launch({ headless: !process.env.HEADFUL, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.addInitScript(() => {
  window.__long = []; window.__marks = {};
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
});
const t0 = Date.now();
await page.goto('http://localhost:8013/');
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 120000 });
const firstShown = await page.evaluate(() => Math.round(performance.now()));
await page.waitForFunction(() => window.__room?.items?.length === 7 && window.__room.items.every((it) => it.ready), null, { timeout: 120000 });
const allReady = await page.evaluate(() => Math.round(performance.now()));
await page.waitForTimeout(1500);
const load = await page.evaluate(({ firstShown }) => {
  const rs = performance.getEntriesByType('resource');
  const sum = (f) => rs.filter(f).reduce((a, r) => a + (r.encodedBodySize || r.transferSize || 0), 0);
  const before = sum((r) => r.responseEnd <= firstShown);
  const glb = rs.filter((r) => r.name.endsWith('.glb')).map((r) => [r.name.split('/').pop(), Math.round(r.responseEnd)]);
  return { requests: rs.length, totalMB: +(sum(() => true) / 1e6).toFixed(1), beforeFirstGuitarMB: +(before / 1e6).toFixed(1), glbDone: glb };
}, { firstShown });
const longs = await page.evaluate(() => window.__long.filter(([s]) => s < 40000));
const info = await page.evaluate(() => { const R = window.__room, r = R.renderer; r.info.autoReset = false; r.info.reset(); R.composer.render(0.016); const out = { canvas: `${r.domElement.width}x${r.domElement.height}`, calls: r.info.render.calls, triangles: r.info.render.triangles, geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length }; r.info.autoReset = true; return out; });
// frame times while something runs
const frames = (ms, run) => page.evaluate(async ({ ms, run }) => {
  const d = []; let last = performance.now(); const t0 = last; let go = true;
  (function f(now) { d.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(f); else go = false; })(last);
  if (run) eval(run);
  while (go) await new Promise((r) => setTimeout(r, 50));
  d.shift(); const s = d.slice().sort((a, b) => a - b);
  return { fps: +(1000 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(0), p95: +s[Math.floor(s.length * 0.95)].toFixed(0), worst: +s[s.length - 1].toFixed(0), over50: d.filter((x) => x > 50).length };
}, { ms, run });
const at = (sh) => page.evaluate((sh) => window.__lenis.scrollTo(Math.round(sh * innerHeight), { immediate: true, force: true }), sh);
const res = {};
res['hero at rest'] = await frames(3000);
res['hero, ring turning'] = await frames(2400, 'window.__room.step(1)');
res['drawing (scrolling 0 to 5.5 screens)'] = await frames(4500, 'window.__lenis.scrollTo(Math.round(5.5*innerHeight), { duration: 4.2, easing: (t) => t })');
res['close-up tour (scrolling 5.5 to 19.6)'] = await frames(7000, 'window.__lenis.scrollTo(Math.round(19.6*innerHeight), { duration: 6.6, easing: (t) => t })');
await at(0); await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('[data-view]').click());
res['View guitar opening'] = await frames(2400);
res['View guitar at rest'] = await frames(3000);
res['View guitar, changing guitar'] = await frames(2400, "document.querySelector('[data-cu-next]').click()");
await page.evaluate(() => document.querySelector('[data-back]').click()); await page.waitForTimeout(2200);
await page.evaluate(() => { const y = document.querySelector('#guitars').getBoundingClientRect().top + scrollY; window.__lenis.scrollTo(y, { immediate: true, force: true }); }); await page.waitForTimeout(1500);
res['section 02'] = await frames(2500, "document.querySelectorAll('.spot__names li button')[4].dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}))");
await page.evaluate(() => window.__lenis.scrollTo('#visit', { immediate: true, force: true })); await page.waitForTimeout(2000);
res['footer'] = await frames(3000);
const mem = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null);
if (process.env.COMPACT) { const f = Object.entries(res).map(([k, v]) => `    ${k.padEnd(40)} ${String(v.fps).padStart(3)} fps   p95 ${String(v.p95).padStart(3)} ms   worst ${String(v.worst).padStart(3)} ms   frames over 50 ms: ${v.over50}`).join('\n'); console.log(`== ${process.env.HEADFUL ? 'real window' : 'headless'} ${size} @${dpr}x, canvas ${info.canvas}\n  first guitar on screen ${firstShown} ms, all seven ready ${allReady} ms, ${load.totalMB} MB in ${load.requests} requests (${load.beforeFirstGuitarMB} MB before the first guitar)\n  models done (ms): ${load.glbDone.map(([n, t]) => n.replace('.glb', '') + ' ' + t).join(', ')}\n  long tasks over 200 ms in the first 40 s: ${longs.filter(([, d]) => d > 200).map(([s, d]) => d + ' ms at ' + (s / 1000).toFixed(1) + ' s').join(', ')}\n  one frame: ${info.calls} draw calls, ${(info.triangles / 1e6).toFixed(2)} M triangles, ${info.geometries} geometries, ${info.textures} textures, ${info.programs} shader programs, JS heap ${mem} MB\n${f}\n  errors: ${errs.length ? errs.join(' | ') : 'none'}`); await browser.close(); process.exit(0); }
console.log(JSON.stringify({ mode: `${process.env.HEADFUL ? 'real window' : 'headless'} ${size} @${dpr}x`, firstGuitarShownMs: firstShown, allSevenReadyMs: allReady, load, longTasksFirst40s: longs, info, jsHeapMB: mem, frames: res, errors: errs.slice(0, 3) }, null, 1));
await browser.close();
