// Find, for each stop of a guitar's walk, the guitar's `turn` that keeps the
// chrome and brass from blowing out under the key light.
//
//   GUITAR=6 node tools/tune_turns.mjs heath [stop ...]
//
// For every stop it tries the turn in stops.js and a fan of others around it,
// renders the hold, and counts near-white pixels on the guitar's side of the
// frame (the copy column is left out). Prints the counts and the best turn.
// It changes nothing: copy the numbers into stops.js.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const [id, ...only] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 575 } })).newPage();
await page.goto('http://localhost:8013/');
await page.waitForFunction(() => window.__room?.items?.length === 7 && !document.querySelector('.loader'), null, { timeout: 60000 });
await page.waitForFunction(() => window.__room.items.every((it) => !it.info.real || it.ready), null, { timeout: 90000 });
await page.evaluate((g) => window.__room.goTo(+g), process.env.GUITAR);
await page.waitForTimeout(3500);
const stops = await page.evaluate(async (id) => (await import('/src/stops.js')).STOPS[id].map((s) => ({ id: s.id, turn: s.turn })), id);
const B = { lift: 1.2, travel: 0.8, hold: 1.0 };
const fan = [-40, -25, -15, -8, 0, 8, 15, 25, 40];
for (const [k, s] of stops.entries()) {
  if (only.length && !only.includes(s.id)) continue;
  const at = B.lift + k * (B.travel + B.hold) + B.travel + B.hold * 0.5;
  const res = [];
  for (const d of fan) {
    const turn = s.turn + d;
    const n = await page.evaluate(async ({ id, k, turn, at }) => {
      const S = (await import('/src/stops.js')).STOPS;
      S[id][k].turn = turn;
      const r = window.__room;
      r.walk.plans.clear();
      window.__lenis?.scrollTo(Math.round(at * innerHeight), { immediate: true, force: true });
      await new Promise((ok) => setTimeout(ok, 300));
      r.walkAt = r.walkTo;
      await new Promise((ok) => setTimeout(ok, 500));
      const c = r.renderer.domElement;
      const off = new OffscreenCanvas(c.width, c.height), g = off.getContext('2d');
      r.render(); g.drawImage(c, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let hot = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = Math.floor(c.width * 0.4); x < c.width; x += 2) {
        const i = (y * c.width + x) * 4;
        if (Math.min(px[i], px[i + 1], px[i + 2]) > 232) hot++;
      }
      return hot;
    }, { id, k, turn, at });
    res.push([turn, n]);
  }
  // fewest hot pixels; ties go to the turn nearest the current one
  const best = res.slice().sort((a, b) => a[1] - b[1] || Math.abs(a[0] - s.turn) - Math.abs(b[0] - s.turn))[0];
  console.log(`${s.id.padEnd(10)} now ${String(s.turn).padStart(4)}  best ${String(best[0]).padStart(4)}  ` + res.map(([t, n]) => `${t}:${n}`).join(' '));
  // put it back before the next stop
  await page.evaluate(async ({ id, k, turn }) => { (await import('/src/stops.js')).STOPS[id][k].turn = turn; }, { id, k, turn: s.turn });
}
await browser.close();
