// Transparent product stills of the seven guitars, for the index and footer sections.
//   node tools/product_shots.mjs [ids]      -> site/assets/shots/<id>-{hero,front,body}.webp
// Needs the project root served on :8030 (launch.json: kveld-root) and playwright-core in
// tools/node_modules (see the headless-webgl-checks note).
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const OUT = decodeURIComponent(new URL('../site/assets/shots/', import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });
const ids = (process.argv[2] || 'floe,sedge,scree,moss,fjord,rowan,heath').split(',');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
await page.goto('http://localhost:8030/tools/shot.html');
await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
const VIEWS = [
  ['hero', { view: 'hero', w: 900, h: 1900 }],
  ['front', { view: 'front', w: 620, h: 1520, ppm: 1420 }],
  ['body', { view: 'body', w: 1200, h: 1000, yaw: -18 }],
];
for (const id of ids) for (const [name, o] of VIEWS) {
  const url = await page.evaluate((a) => window.__shot(a), { id, ...o });
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(`${OUT}${id}-${name}.webp`, buf);
  console.log(`${id}-${name}.webp`, Math.round(buf.length / 1024), 'KB');
}
const frames = {};
for (const id of ['floe', 'sedge', 'scree', 'moss', 'fjord', 'rowan', 'heath']) {
  await page.evaluate((a) => window.__shot(a), { id, view: 'front', w: 56, h: 152, ppm: 142 });   // make sure it is loaded
  frames[id] = await page.evaluate((id) => window.__frame(id, { w: 620, h: 1520, ppm: 1420 }), id);
}
writeFileSync(`${OUT}frames.json`, JSON.stringify(frames));
await browser.close();
