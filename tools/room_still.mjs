// A wide still of the room with all seven guitars lit, for the footer.
//   node tools/room_still.mjs [guitar index in front] -> site/assets/shots/room-wide.png (convert to jpg with ffmpeg)
// Needs the site on :8013 (or BASE=...) and playwright-core from the cupola project.
import { createRequire } from 'module';
const require = createRequire('/Users/sam/Projects/Claude Code/Random Demos/cupola/node_modules/');
const { chromium } = require('playwright-core');
const out = decodeURIComponent(new URL('../site/assets/shots/room-wide.png', import.meta.url).pathname);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 2400, height: 1100 } })).newPage();
await page.goto(process.env.BASE || 'http://localhost:8013/');
await page.waitForFunction(() => window.__room?.items?.length === 7 && window.__room.items.every((it) => it.ready) && !document.querySelector('.loader'), null, { timeout: 90000 });
await page.addStyleTag({ content: '.room__ui, .site-head, .walk, .closeup { display: none !important; }' });
await page.evaluate((g) => {
  const r = window.__room;
  if (g) { r.u = r.lastU = g; }
  // pulled back and low, the way a turn of the ring shows it, with every guitar awake
  r.camBase = { pos: r.camWide.pos.clone().setZ(6.3).setY(0.46), target: r.camWide.target.clone().setY(0.56), fov: 27 };
  r.parallax.set(0, 0);
  setInterval(() => { r.wake = 1; r.items.forEach((it) => { it.spinV = 0; }); }, 8);
}, +(process.argv[2] || 3));
await page.waitForTimeout(4000);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
