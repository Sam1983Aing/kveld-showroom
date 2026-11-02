// Automatic quality, tested: a fast machine must stay put, and a page made slow on purpose must step down.
//   node tools/quality_check.mjs [url]
import { openChrome, openKveld } from './chrome.mjs';
const url = process.argv[2] || 'http://localhost:8013/';
const { browser, close } = await openChrome({ timeout: 200000 });
const page = await openKveld(browser, { w: 1725, h: 990, dpr: 2, url });
const read = () => page.evaluate(() => ({ ratio: window.__quality?.ratio, steps: window.__quality?.steps, canvas: document.querySelector('.room__gl').width }));
await page.waitForTimeout(10000);
console.log('left to run for 10 s, stays:', JSON.stringify(await read()));
await page.evaluate(() => { const wake = () => window.__room.wake(); window.gsap.ticker.add(() => { const t = performance.now(); while (performance.now() - t < 34); wake(); }); });
for (const s of [6, 8, 8, 8]) { await page.waitForTimeout(s * 1000); console.log('slowed to about 25 fps:', JSON.stringify(await read())); }
console.log('errors:', page.problems.join(' | ') || 'none');
close(); process.exit(0);
