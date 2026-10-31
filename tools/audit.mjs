// The QA pass: stills of every part of the page at one window size, into a folder.
//   node tools/audit.mjs <label> [WxH] [dpr] [phone] [reduced]     -> demo/qa/<label>/<size>/NN-name.jpg
import { mkdirSync } from 'fs';
import { openChrome, openKveld, marks, goto } from './chrome.mjs';
const [label = 'now', size = '1725x990', dpr = '1', ...flags] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number), phone = flags.includes('phone'), reduced = flags.includes('reduced');
const OUT = decodeURIComponent(new URL(`../demo/qa/${label}/${size}${reduced ? '-reduced' : ''}/`, import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });
const { browser, close } = await openChrome({ timeout: 300000 });
const page = await openKveld(browser, { w, h, dpr: +dpr, phone, reduced });
const M = await marks(page), vh = M.vh;
let n = 0;
const shot = async (name) => { await page.screenshot({ path: `${OUT}${String(n++).padStart(2, '0')}-${name}.jpg`, type: 'jpeg', quality: 86 }); console.log(name); };
const at = async (y, name, wait) => { await goto(page, y, wait); await shot(name); };
console.log(JSON.stringify(M));
const rs = M.room ? M.room[0] : 0;
await at(0, 'hero', 1500);
for (const s of [0.6, 1.4, 2.2, 3.0, 3.5, 4.1, 4.8]) await at(rs + s * vh, `drawing-${s}`);
for (let i = 0; i < 7; i++) await at(rs + (5.5 + 0.8 + 0.4 + i * 1.8) * vh, `tour-${i + 1}`);
if (M.shop) {
  await at(M.shop[0] - 1.0 * vh, 'rise-start'); await at(M.shop[0] - 0.5 * vh, 'rise-mid'); await at(M.shop[0] - 0.1 * vh, 'rise-end');
  for (const p of [0.05, 0.25, 0.42, 0.6, 0.8, 0.97]) await at(M.shop[0] + p * (M.shop[1] - M.shop[0]), `bench-${p}`, 1400);
}
await at(M.hear - 0.5 * vh, 'hear-enter', 1500);
await at(M.hear, 'hear', 1800);
await at(M.orderTop - 0.5 * vh, 'order-enter');
if (M.order) for (const p of [0, 0.35, 0.7, 1]) await at(M.order[0] + p * (M.order[1] - M.order[0]), `order-${p}`, 1200);
else for (const p of [0, 0.4, 0.8]) await at(M.orderTop + p * (M.visit - M.orderTop - vh * 0.5), `order-${p}`, 1200);
const M2 = await marks(page);
await at(M2.visit - 0.6 * vh, 'footer-enter', 1500);
await at(M2.max, 'footer', 2500);
await at(0, 'hero-back', 1500);
if (!reduced) {
  await page.click('[data-view]'); await page.waitForTimeout(3600); await shot('view-guitar');
  await page.waitForTimeout(800); await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
}
console.log('errors:', page.problems.length ? page.problems.slice(0, 8).join(' | ') : 'none');
close(); process.exit(0);
