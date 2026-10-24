// The workshop gallery's pictures (V7 demo, ?shop=gallery), rendered from the bench scene (?shop=bench)
// at five points of the build with a close camera each. Writes site/assets/shop/<guitar>-<stage>.png
// (convert to jpg after). Needs the site on :8013 and playwright-core in tools/node_modules.
//   node tools/shop_pictures.mjs [guitar index, default 0]
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const OUT = decodeURIComponent(new URL('../site/assets/shop/', import.meta.url).pathname);
mkdirSync(OUT, { recursive: true });
const G = +(process.argv[2] || 0);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:8013/?shop=bench');
await page.waitForFunction(() => window.__room?.items?.every((it) => it.ready) && !document.querySelector('.loader') && window.__shop?.G, null, { timeout: 90000 });
if (G) { await page.evaluate((g) => window.__room.goTo(g), G); await page.waitForFunction((g) => window.__shop.G.info === window.__room.items[g].info, G, { timeout: 30000 }); }
await page.waitForTimeout(1500);
// [stage, build point, aim along the guitar from the tail (m), aim height, camera offset from the aim]
const SHOTS = [
  ['wood', 0.08, 0.2, 0.03, [-0.26, 0.11, 0.3]],
  ['carve', 0.235, 'saw', 0.03, [-0.14, 0.26, 0.26]],
  ['frets', 0.5, 0.6, 0.03, [0.14, 0.07, 0.2]],
  ['finish', 0.595, 'sweep', 0.04, [-0.12, 0.2, 0.26]],
  ['setup', 1, 0.1, 0.05, [-0.12, 0.11, 0.17]],
];
const id = await page.evaluate(() => window.__shop.G.info.id);
for (const [stage, p, along, y, off] of SHOTS) {
  const url = await page.evaluate(([p, along, y, off]) => {
    const S = window.__shop, G = S.G, cam = S.camera, r = S.renderer;
    S.frame(p);
    const at = along === 'saw' ? G.saw.position.z * -1 : along === 'sweep' ? S.sweep() : G.tail + along;
    cam.clearViewOffset();
    r.setSize(1500, 1000, false); cam.aspect = 1.5; cam.fov = 30;
    cam.up.set(0, 1, 0);
    cam.position.set(at + off[0], y + off[1], off[2]);
    cam.lookAt(at, y, 0);
    cam.updateProjectionMatrix();
    r.render(S.scene, cam);
    return r.domElement.toDataURL('image/png');
  }, [p, along, y, off]);
  writeFileSync(`${OUT}${id}-${stage}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', `${id}-${stage}.png`);
}
await browser.close();
