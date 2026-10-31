// What the bench and the sound cost: the GPU's counter while the bench is scrolled, and Chrome's CPU with the
// sound off and on, at rest in the hero. Run alone, nothing else on the GPU.   node tools/cost_check.mjs
import { execSync } from 'child_process';
import { openChrome, openKveld, marks, goto } from './chrome.mjs';
const { browser, close } = await openChrome({ timeout: 200000 });
const page = await openKveld(browser, { w: 1725, h: 990, dpr: 2 });
const gpu = (s) => new Promise((ok) => { const v = []; let i = 0; const t = setInterval(() => { const m = execSync("ioreg -r -d 1 -w 0 -c IOAccelerator 2>/dev/null | grep -o '\"Device Utilization %\"=[0-9]*' | head -1 | cut -d= -f2").toString().trim(); v.push(+m); if (++i >= s) { clearInterval(t); ok(Math.round(v.reduce((a, b) => a + b, 0) / v.length)); } }, 1000); });
const cpu = async () => { const v = []; for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 1000)); v.push(+execSync("ps -Ao pcpu,command | grep '[k]veld-chrome' | awk '{s+=$1} END {print s}'").toString().trim()); } return Math.round(v.slice(1).reduce((a, b) => a + b, 0) / 5); };
const M = await marks(page);
await goto(page, M.shop[0], 800);
await page.evaluate(([a, b]) => { window.__swing = true; const t0 = performance.now(); (function f(n) { if (!window.__swing) return; const u = (Math.sin((n - t0) / 2200) + 1) / 2; window.scrollTo({ top: a + (b - a) * u, behavior: 'instant' }); requestAnimationFrame(f); })(t0); }, [M.shop[0], M.shop[0] + 5 * M.vh]);
console.log('GPU busy, the bench scrolling:', await gpu(15), '%');
await page.evaluate(() => { window.__swing = false; });
await goto(page, M.hear + 0, 600);
await page.waitForTimeout(3000);
console.log('GPU busy, Hear them at rest:', await gpu(8), '%');
await goto(page, 0, 12000);
console.log('Chrome CPU at rest in the hero, sound off:', await cpu(), '% of a core');
await page.click('.nv__sound'); await page.waitForTimeout(3000);
console.log('Chrome CPU at rest in the hero, sound on:', await cpu(), '% of a core');
console.log('errors:', page.problems.length ? page.problems.join(' | ') : 'none');
close(); process.exit(0);
