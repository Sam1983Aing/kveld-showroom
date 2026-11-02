// A wide still of the room with all seven guitars lit, for the footer.
//   node tools/room_still.mjs [guitar index in front] -> site/assets/shots/room-wide.png (convert to jpg with ffmpeg)
//   FLOOR=0.6 sets how strongly the glass floor mirrors the room (the live room uses 1.25; the
//   footer's still is taken at 0.6, Sam asked for a quieter reflection there on 2026-10-07)
// Needs the site on :8013 (or BASE=...). Chrome closes on every way out (chrome.mjs).
import { openChrome, openKveld } from './chrome.mjs';
const out = decodeURIComponent(new URL('../site/assets/shots/room-wide.png', import.meta.url).pathname);
const { browser, close } = await openChrome({ timeout: 180000 });
const page = await openKveld(browser, { w: 2400, h: 1100, url: process.env.BASE || 'http://localhost:8013/' });
await page.addStyleTag({ content: '.room__ui, .site-head, .nv, .walk, .closeup { display: none !important; }' });
await page.evaluate(([g, floor]) => {
  const r = window.__room;
  if (g) { r.u = r.lastU = g; }
  // pulled back and low, the way a turn of the ring shows it, with every guitar awake
  r.camBase = { pos: r.camWide.pos.clone().setZ(6.3).setY(0.46), target: r.camWide.target.clone().setY(0.56), fov: 27 };
  r.parallax.set(0, 0);
  r.breathe = () => { r.breath = 1.5; };      // all seven: the room hides far guitars at rest, and shows them while it breathes on a turn
  r.floor.material.uniforms.uStrength.value = floor;
  setInterval(() => { r.wake(); r.items.forEach((it) => { it.spinV = 0; }); }, 8);
}, [+(process.argv[2] || 3), +(process.env.FLOOR || 0.6)]);
await page.waitForTimeout(4000);
await page.screenshot({ path: out });
close(); process.exit(0);
console.log(out);
