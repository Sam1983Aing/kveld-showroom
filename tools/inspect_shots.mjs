// Close-up stills from the inspect viewer in headless Chrome (real WebGL).
//
//   node tools/inspect_shots.mjs <out_dir> <guitar id> '<shots json>'
//   shots: [[name, part, [fx, fy, fz], [dx, dy, dz], dist], ...]
//
// Each shot aims at a point inside the box of the meshes whose name starts with
// `part` (fractions: x across, y up the neck, z back to front) and looks from
// direction d, `dist` metres away. PORT picks another served copy (a frozen
// version). Needs the site on :8013 and playwright-core from the cupola project.
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
const require = createRequire('/Users/sam/Projects/Claude Code/Random Demos/cupola/node_modules/');
const { chromium } = require('playwright-core');
const OUT = process.argv[2], G = process.argv[3], shots = JSON.parse(process.argv[4]);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:' + (process.env.PORT || 8013) + '/inspect.html?g=' + G + '&t=' + Date.now());
await page.waitForFunction(() => window.__inspect?.guitar?.children?.length > 0, null, { timeout: 60000 });
await page.waitForTimeout(4000);
for (const [name, part, aim, dir, dist] of shots) {
  await page.evaluate(([part, aim, dir, dist]) => {
    const { camera, controls, guitar } = window.__inspect; const V = camera.position.constructor;
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; guitar.updateMatrixWorld(true);
    guitar.traverse((o) => { if (o.isMesh && o.name.startsWith(part)) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      lo = lo.map((v, k) => Math.min(v, b.min.getComponent(k))); hi = hi.map((v, k) => Math.max(v, b.max.getComponent(k))); } });
    const c = new V(...aim.map((f, k) => lo[k] + f * (hi[k] - lo[k])));
    controls.target.copy(c); camera.position.copy(c).add(new V(...dir).normalize().multiplyScalar(dist)); controls.update();
  }, [part, aim, dir, dist]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
console.log('errors', errs); await browser.close();
