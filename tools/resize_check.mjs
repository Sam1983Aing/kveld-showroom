// The hero's picture after the window changes size: the canvas's drawing has to keep the shape of its box,
// or the room stretches. Aura's preview resizes its frame after the page has loaded, which is how this showed.
//   node tools/resize_check.mjs [url]
import { openChrome, openKveld } from './chrome.mjs';
const url = process.argv[2] || 'http://localhost:8013/';
const { browser, close } = await openChrome({ timeout: 200000 });
const page = await openKveld(browser, { w: 1725, h: 990, url });
const shape = () => page.evaluate(() => {
  const c = document.querySelector('.room__gl'), r = window.__room;
  const box = c.clientWidth / c.clientHeight, drawn = c.width / c.height;
  return { win: `${innerWidth}x${innerHeight}`, box: `${c.clientWidth}x${c.clientHeight}`, buffer: `${c.width}x${c.height}`, camera: +r.camera.aspect.toFixed(3), stretch: +(box / drawn).toFixed(3) };
});
console.log('loaded   ', JSON.stringify(await shape()));
let bad = 0;
for (const [w, h] of [[1725, 700], [1300, 990], [1725, 1200], [1000, 560], [1725, 990]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(1500);
  const s = await shape();
  if (Math.abs(s.stretch - 1) > 0.01 || Math.abs(s.camera - s.stretch * 0 - eval(s.box.replace('x', '/'))) > 0.01) bad++;
  console.log(`${w}x${h}`.padEnd(9), JSON.stringify(s));
}
console.log(bad ? `STRETCHED in ${bad} of 5` : 'every size keeps its shape', '| errors:', page.problems.join(' | ') || 'none');
close(); process.exit(bad ? 1 : 0);
