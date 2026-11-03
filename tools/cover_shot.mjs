// A cover image for Aura (800x600): only the hero's main visual, the centre guitar on its plinth in the
// halo, on the room's own background. The page's words, the header and the other six guitars are hidden,
// and the camera's picture is panned (not moved) so the guitar and plinth sit in the middle.
//   node tools/cover_shot.mjs [out.png] [guitar index, 0 = Floe]
import { openChrome, openKveld } from './chrome.mjs';
import { execFileSync } from 'child_process';
const out = process.argv[2] || 'media/aura-cover-800x600.png', pick = +(process.argv[3] || 0);
const W = 1200, H = 900, DPR = 2, ZOOM_OUT = 1.1;           // 4:3, drawn at 2400x1800 and scaled down
const { browser, close } = await openChrome({ timeout: 200000 });
const page = await openKveld(browser, { w: W, h: H, dpr: DPR });
await page.addStyleTag({ content: '.site-head, .room__ui, .cursor, .veil, .walk { visibility: hidden !important; }' });
const at = await page.evaluate(async ([pick, W, H, k]) => {
  const r = window.__room;
  if (r.index !== pick) { r.select?.(pick); await new Promise((d) => setTimeout(d, 2500)); }
  r.items.forEach((it, i) => { if (i !== r.index) Object.defineProperty(it.group, 'visible', { get: () => false, set() {}, configurable: true }); });
  // the centre guitar turns slowly while the room is idle: hold it at its resting angle, facing us
  const held = r.items[r.index];
  for (const k of ['spin', 'spinV']) Object.defineProperty(held, k, { get: () => 0, set() {}, configurable: true });
  r.pointer?.set?.(0, 0);
  r.wake();
  await new Promise((d) => setTimeout(d, 1200));
  // where the guitar and its plinth land on screen
  const B = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  const it = r.items[r.index];
  it.group.updateWorldMatrix(true, true);
  const v = it.group.position.clone();
  it.group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible || o.material?.visible === false) return;     // not the click box
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    for (let n = 0; n < 8; n++) {
      v.set(n & 1 ? bb.max.x : bb.min.x, n & 2 ? bb.max.y : bb.min.y, n & 4 ? bb.max.z : bb.min.z).applyMatrix4(o.matrixWorld).project(r.camera);
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      B.x0 = Math.min(B.x0, x); B.x1 = Math.max(B.x1, x); B.y0 = Math.min(B.y0, y); B.y1 = Math.max(B.y1, y);
    }
  });
  const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
  r.camera.setViewOffset(W / k, H / k, cx / k - W / 2, cy / k - H / 2, W, H);
  r.camera.updateProjectionMatrix();
  window.__keepView = () => { if (!r.camera.view) r.camera.setViewOffset(W / k, H / k, cx / k - W / 2, cy / k - H / 2, W, H); r.camera.updateProjectionMatrix(); };
  window.gsap.ticker.add(window.__keepView);
  r.wake();
  await new Promise((d) => setTimeout(d, 1500));
  return { name: it.info.name, before: B, centre: [cx, cy], share: +((B.y1 - B.y0) / H / k).toFixed(2) };
}, [pick, W, H, ZOOM_OUT]);
const big = out.replace(/\.png$/, '@2400.png');
await page.screenshot({ path: big });
console.log(at.name, '| before', JSON.stringify(at.before), '| moved to the middle, it fills', at.share, 'of the height | errors:', page.problems.join(' | ') || 'none');
close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', big, '-vf', 'scale=800:600:flags=lanczos', out]);
console.log('wrote', out);
process.exit(0);
