// The arch and the motes through the page: stills of the loader, hero, View guitar, Hear them and footer at a
// size, frame times with a turn at 2x. node tools/halo_check.mjs <out dir> [WxH] [dpr] [reduced]
import { openChrome, openKveld, marks, goto } from './chrome.mjs';
const [out, size = '1725x990', dpr = '1', rm] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number), phone = w < 600, tag = `${w}${rm ? '-rm' : ''}`;
const { browser, close } = await openChrome({ timeout: 300000 });
const ctx0 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +dpr, reducedMotion: rm ? 'reduce' : 'no-preference' });
const p0 = await ctx0.newPage();
await p0.goto('http://localhost:8013/', { waitUntil: 'commit' });
await p0.waitForFunction(() => +document.querySelector('[data-count]')?.textContent > 55, null, { timeout: 30000 }).catch(() => {});
await p0.screenshot({ path: `${out}/${tag}-loader.png` });
await ctx0.close();
const page = await openKveld(browser, { w, h, dpr: +dpr, phone, reduced: !!rm });
const M = await marks(page);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/${tag}-hero.png` });
if (!rm && !phone) {
  const r = await page.evaluate(() => new Promise((ok) => { const ts = []; let raf; const tick = (t) => { ts.push(t); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
    setTimeout(() => document.querySelector('[data-next]').click(), 800);
    setTimeout(() => { cancelAnimationFrame(raf); const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b); ok({ fps: Math.round(d.length / 5), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), worst: +d[d.length - 1].toFixed(1) }); }, 5000); }));
  console.log('a turn:', JSON.stringify(r));
}
await page.click('[data-view]', { force: true }); await page.waitForTimeout(rm ? 800 : 3500);
await page.screenshot({ path: `${out}/${tag}-view.png` });
await page.keyboard.press('Escape'); await page.waitForTimeout(rm ? 800 : 2500);
await goto(page, M.hear, 1800);
await page.screenshot({ path: `${out}/${tag}-hear.png` });
await goto(page, M.max, 2500);
await page.screenshot({ path: `${out}/${tag}-foot.png` });
console.log(tag, 'errors:', page.problems.join(' | ') || 'none');
close(); process.exit(0);
