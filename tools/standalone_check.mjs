// The standalone file as Sam opens it: from file://, then with the CDN cut off, then a walk through the page.
//   node tools/standalone_check.mjs <out dir> [url]
import { openChrome } from './chrome.mjs';
import { resolve } from 'path';
const [out, url = 'file://' + resolve('standalone/kveld.html')] = process.argv.slice(2);
const { browser, close } = await openChrome({ timeout: 300000 });
const open = async (block, { w = 1725, h = 990, dpr = 1, phone = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: phone });
  const page = await ctx.newPage();
  page.errs = []; page.fails = []; page.reqs = [];
  page.on('pageerror', (e) => page.errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text().slice(0, 160)); });
  page.on('requestfailed', (r) => page.fails.push(r.url().slice(-50)));
  page.on('request', (r) => page.reqs.push(r.url()));
  if (block) await page.route('**/cdn.jsdelivr.net/**', (r) => r.abort());
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction(() => document.documentElement.classList.contains('no-cdn') || (!document.querySelector('.loader') && window.__room), null, { timeout: 120000 });
  page.entry = Date.now() - t0;
  return page;
};
const page = await open(false);
await page.waitForFunction(() => window.__room.items.every((it) => it.ready), null, { timeout: 120000 });
await page.waitForTimeout(3000);
console.log('from', url.slice(0, 60), '| in the room', (page.entry / 1000).toFixed(1), 's | all seven in | fonts', await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight).join(', ')));
console.log('sound and bundle:', await page.evaluate(() => ({ type: document.querySelector('script[type=module]') ? 'module' : 'classic', nodes: document.querySelectorAll('.slip__line').length, quality: window.__quality?.ratio })));
const hosts = [...new Set(page.reqs.map((u) => { try { return new URL(u).host || 'file'; } catch { return 'other'; } }))];
console.log('asks only:', hosts.join(', '));
const shots = { hero: 0, draw: ['room', 1.9, 'vh'], tour: ['room', 0.5], shop: ['workshop', 0.62], order: ['order', 0.7] };
for (const [name, at] of Object.entries(shots)) {
  await page.evaluate((at) => { let y = 0; if (at) { const st = window.ScrollTrigger.getAll().find((s) => s.pin && s.trigger.id === at[0]); y = at[2] ? st.start + at[1] * innerHeight : st.start + at[1] * (st.end - st.start); } window.__lenis.scrollTo(Math.round(y), { immediate: true, force: true }); }, at);
  await page.waitForTimeout(250); await page.evaluate(() => { const r = window.__room; r.walkAt = r.walkTo; }); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
}
for (const [name, sel] of [['hear', '#guitars'], ['foot', '#visit']]) {
  await page.evaluate((sel) => window.__lenis.scrollTo(Math.round(document.querySelector(sel).getBoundingClientRect().top + scrollY), { immediate: true, force: true }), sel);
  await page.waitForTimeout(2200); await page.screenshot({ path: `${out}/${name}.png` });
}
console.log('walk errors:', page.errs.join(' | ') || 'none', '| failed requests:', page.fails.join(' | ') || 'none');
await page.context().close();
const off = await open(true);
await off.waitForTimeout(3000);
await off.screenshot({ path: `${out}/offline.png` });
console.log('CDN cut off: the loader goes away after', (off.entry / 1000).toFixed(1), 's, headline shows:', await off.evaluate(() => getComputedStyle(document.querySelector('.room__h1')).fontFamily.split(',')[0] + ' / ' + document.querySelector('.room__h1').textContent.trim()), '| page errors:', off.errs.filter((e) => !/Failed to load|net::|Failed to fetch|fetch/i.test(e)).slice(0, 3).join(' | ') || 'none');
await off.evaluate(() => window.__lenis?.scrollTo(document.documentElement.scrollHeight, { immediate: true, force: true })); await off.waitForTimeout(1500);
await off.screenshot({ path: `${out}/offline-foot.png` });
await off.context().close();
close(); process.exit(0);
