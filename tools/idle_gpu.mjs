// What the hero costs left alone, in a real window at 2x, from the GPU's own counter. Real windows only: opens on
// screen for about a minute. The motes moving, then the room at rest after 45 s untouched.  node tools/idle_gpu.mjs
import { execSync } from 'child_process';
import { openChrome, openKveld } from './chrome.mjs';
const { browser, close } = await openChrome({ timeout: 180000, headful: true });
const page = await openKveld(browser, { w: 1725, h: 990, dpr: 2 });
const busy = () => +execSync(`ioreg -r -d 1 -w 0 -c IOAccelerator | grep -o '"Device Utilization %"=[0-9]*' | head -1 | cut -d= -f2`).toString();
const avg = async (n) => { let s = 0; for (let i = 0; i < n; i++) { s += busy(); await new Promise((r) => setTimeout(r, 1000)); } return Math.round(s / n); };
await page.waitForTimeout(13000);
console.log('hero left alone, motes moving (10 to 30 s):', await avg(15), '%');
await page.waitForTimeout(20000);
console.log('hero left alone past 45 s, room at rest:', await avg(10), '%');
close(); process.exit(0);
