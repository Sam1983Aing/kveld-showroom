// Every button and link at rest, hovered, and with keyboard focus, as one sheet. Also a resize in the middle of a section.
//   node tools/hover_check.mjs <out.png-prefix>
import { mkdirSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { openChrome, openKveld, marks, goto } from './chrome.mjs';
const [out = 'demo/qa/hover'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { browser, close } = await openChrome({ timeout: 240000 });
const page = await openKveld(browser, { w: 1380, h: 792, dpr: 2 });
const M = await marks(page), vh = M.vh;
let n = 0;
const clip = async (sel, name, pad = 26) => {
  const b = await page.$(sel); if (!b) { console.log('missing', sel); return; }
  const r = await b.boundingBox(), c = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2 };
  await page.mouse.move(5, vh - 5); await page.waitForTimeout(700);
  const k = String(n++).padStart(2, '0');
  await page.screenshot({ path: `${out}/${k}-${name}-a.png`, clip: c });
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 4 }); await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${k}-${name}-b.png`, clip: c });
  await page.mouse.move(5, vh - 5);
  await b.focus(); await page.keyboard.press('Shift'); await page.waitForTimeout(500);
  const outline = await b.evaluate((e) => { const c = getComputedStyle(e); return c.outlineStyle + ' ' + c.outlineWidth; });
  await page.screenshot({ path: `${out}/${k}-${name}-c.png`, clip: c });
  await page.evaluate(() => document.activeElement?.blur());
  console.log(name, 'focus:', outline);
};
await goto(page, 0, 1200);
for (const [s, nm] of [['.nv__brand', 'brand'], ['.nv__board button:nth-of-type(3)', 'fret'], ['.nv__sound', 'sound'], ['.nv__book', 'book'], ['[data-view]', 'view'], ['.room__arrow--halo[data-next]', 'arrow'], ['.room__scroll', 'scroll']]) await clip(s, nm);
await page.click('[data-view]'); await page.waitForTimeout(3400);
for (const [s, nm] of [['.closeup__back', 'back'], ['.closeup__book', 'cu-book'], ['.closeup__names li:nth-child(3) button', 'cu-name'], ['[data-cu-next]', 'cu-arrow']]) await clip(s, nm);
await page.keyboard.press('Escape'); await page.waitForTimeout(2200);
await goto(page, M.hear, 1800);
for (const [s, nm] of [['.spot__names li:nth-child(3) button', 'hear-name'], ['.spot__sound', 'hear-sound'], ['.spot__go', 'hear-go'], ['.spot__room', 'hear-room']]) await clip(s, nm);
await goto(page, M.order[0] + 1.6 * vh, 1200);
for (const [s, nm] of [['.order__row[data-g="2"]', 'order-row'], ['.order__book', 'order-book']]) await clip(s, nm);
await goto(page, M.max, 2500);
for (const [s, nm] of [['.ft__cta', 'ft-cta'], ['.ftl__info a', 'ft-link'], ['[data-to-room]', 'ft-up']]) await clip(s, nm);
// a footer link with no address yet says so
await page.click('[data-soon]'); await page.waitForTimeout(500); console.log('soon:', await page.$eval('[data-soon] .ftl__soon', (e) => [e.textContent, getComputedStyle(e).opacity]));
// resize in the middle of sections
const rep = [];
for (const [k, y] of [['tour', 12 * vh], ['bench', M.shop[0] + 2 * vh], ['order', M.order[0] + 1.2 * vh]]) {
  await goto(page, y, 600);
  await page.setViewportSize({ width: 1000, height: 575 }); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/resize-${k}-small.jpg`, type: 'jpeg', quality: 80 });
  await page.setViewportSize({ width: 1875, height: 990 }); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/resize-${k}-wide.jpg`, type: 'jpeg', quality: 80 });
  await page.setViewportSize({ width: 1380, height: 792 }); await page.waitForTimeout(800);
  rep.push(k);
}
console.log('errors:', page.problems.length ? page.problems.slice(0, 6).join(' | ') : 'none');
close(); process.exit(0);
