// Stills of the page in headless Chrome (real WebGL), at points of the walk.
//
//   node tools/stills.mjs [WxH] [label] [ats...]   -> media/checks/<label>-<at>.png
//   GUITAR=6 node tools/stills.mjs 1000x575 heath 0 2.5 4.3
//
// `at` is the scroll position in screen heights (0 is the room at rest). With
// GUITAR the ring turns to that guitar first. Prints the walk state and any
// console errors. Needs the site served on :8013 and playwright-core from the
// cupola project (see the headless-webgl-checks note).
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire('/Users/sam/Projects/Claude Code/Random Demos/cupola/node_modules/');
const { chromium } = require('playwright-core');
const OUT = decodeURIComponent(new URL('../media/checks/', import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });
const [size = '1000x575', label = 'd', ...rest] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const phone = w < 600;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: false, hasTouch: phone });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
await page.goto('http://localhost:8013/' + (process.env.Q || ''));
await page.waitForFunction(() => window.__room?.items?.length === 7 && !document.querySelector('.loader'), null, { timeout: 60000 });
// every real guitar swapped in
await page.waitForFunction(() => window.__room.items.every((it) => !it.info.real || it.ready), null, { timeout: 90000 });
await page.waitForTimeout(2500);
if (process.env.GUITAR) { await page.evaluate((g) => window.__room.goTo(+g), process.env.GUITAR); await page.waitForTimeout(3500); }
// PRE: JS run with S = STOPS before shooting, to try a stop's numbers without editing stops.js
if (process.env.PRE) await page.evaluate(`(async () => { const S = (await import('/src/stops.js')).STOPS; ${process.env.PRE}; window.__room.walk.plans.clear(); })()`);
const ats = rest.length ? rest.map(Number) : [0, 0.6, 1.2, 2.5, 4.3, 6.1, 7.9, 9.7, 11.5, 13.3, 15.5];
for (const at of ats) {
  await page.evaluate((at) => { window.__lenis?.scrollTo(Math.round(at * innerHeight), { immediate: true, force: true }); }, at);
  await page.waitForTimeout(250);
  await page.evaluate(() => { const r = window.__room; r.walkAt = r.walkTo; });
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => { const r = window.__room, W = r.walkState; return { to: r.walkTo.toFixed(2), stop: W?.stop, copy: W?.copy?.toFixed(2) }; });
  console.log(at, JSON.stringify(info));
  await page.screenshot({ path: `${OUT}${label}-${String(at).replace('.', '_')}.png` });
}
console.log(errs.slice(0, 10).join('\n').slice(0, 3000));
await browser.close();
