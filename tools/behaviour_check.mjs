// What the page does when used, read back from the page: the sound switch and the duck, every header tab,
// the way back from the footer, View guitar's sway after 10 s untouched.
//   node tools/behaviour_check.mjs
import { openChrome, openKveld, marks, goto } from './chrome.mjs';
const { browser, close } = await openChrome({ timeout: 240000 });
const page = await openKveld(browser, { w: 1725, h: 990, dpr: 2 });
const long = () => page.evaluate(() => { const r = window.__lt || []; window.__lt = []; return r; });
await page.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask' }); });
const ctxState = () => page.evaluate(() => ({ on: window.__sound.on, state: window.__sound.ctx().state, duck: +window.__ambience.bed?.duck.gain.value.toFixed(3), master: +window.__ambience.bed?.master.gain.value.toFixed(3) }));
console.log('before the switch: bed built', await page.evaluate(() => window.__ambience.built), ', context made', await page.evaluate(() => { try { return window.__sound.on; } catch { return null; } }));
await page.click('.nv__sound'); await page.waitForTimeout(2500);
console.log('switch on:', await ctxState(), 'long tasks on the click (ms):', await long());
console.log('words:', await page.$$eval('[data-sound-word], [data-sound-label]', (e) => e.map((x) => x.textContent)));
const M = await marks(page);
await goto(page, M.hear, 1500);
await page.click('.spot__names li:nth-child(1) button'); await page.waitForTimeout(1200);
console.log('a phrase playing:', await page.evaluate(() => window.__voices.playing), await ctxState());
await page.waitForTimeout(7000);
console.log('after it:', await page.evaluate(() => window.__voices.playing), await ctxState());
await page.click('.spot__sound'); await page.waitForTimeout(1500);
console.log('off from Hear them:', await ctxState(), await page.$eval('.nv__sound', (b) => b.getAttribute('aria-pressed')));
for (const key of ['room', 'drawing', 'closeup', 'workshop', 'hear', 'order', 'visit']) {
  await goto(page, key === 'room' ? M.max : 0, 400);
  await page.click(`.nv__board [data-nav="${key}"]`); await page.waitForTimeout(3200);
  console.log('tab', key.padEnd(9), '-> y', await page.evaluate(() => Math.round(scrollY)), 'lit:', await page.$eval('.nv__board button.is-on', (b) => b.dataset.nav));
}
await goto(page, M.max, 800);
await page.click('[data-to-room]'); await page.waitForTimeout(2400);
console.log('Back to the room -> y', await page.evaluate(() => Math.round(scrollY)));
await page.click('[data-view]'); await page.waitForTimeout(3000);
const sway = () => page.evaluate(() => [+window.__room.swayT.toFixed(2), +window.__room.idleTime.toFixed(1), window.__room.settledFrames]);
const a = await sway(); await page.waitForTimeout(13000); const b = await sway(); await page.waitForTimeout(3000); const c = await sway();
console.log('View guitar sway seconds, idle:', a, b, c);
await page.keyboard.press('Escape'); await page.waitForTimeout(2000);
await goto(page, 0, 300);
console.log('errors:', page.problems.length ? page.problems.join(' | ') : 'none');
close(); process.exit(0);
