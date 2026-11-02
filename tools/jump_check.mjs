// A jump home leaves nothing behind. Goes to each part of the page, clicks the logo, and reads back what is
// still showing over the hero: the tour's card, the header and pointer in their paper colours, the guitar's
// pose, a section still sunk under another. Also with the page left idle first, and from the hero's View guitar.
//   node tools/jump_check.mjs [screenshot folder]
import { openChrome, openKveld, marks, goto } from './chrome.mjs';
const { browser, close } = await openChrome({ timeout: 400000 });
const page = await openKveld(browser, { w: 1725, h: 990, dpr: 1 });
const OUT = process.argv[2];
const M = await marks(page);
const state = () => page.evaluate(() => {
  const card = document.querySelector('.wo__copy'), cs = card ? getComputedStyle(card) : null, r = window.__room;
  const q = (s) => document.querySelector(s);
  return {
    y: Math.round(scrollY),
    cardShows: !!cs && cs.visibility === 'visible' && +cs.opacity > 0.01 && +getComputedStyle(card.parentElement).opacity > 0.01,
    headerPaper: q('.nv').classList.contains('is-paper'),
    pointerPaper: !!q('.cursor')?.classList.contains('on-paper'),
    walkAt: +r.walkAt.toFixed(3), walkState: !!r.walkState,
    roomUI: q('.room__ui').style.opacity, under: [...document.querySelectorAll('.is-under')].map((e) => e.id || e.className),
    sink: q('#room').style.getPropertyValue('--sink') || '0',
    ring: document.activeElement?.matches?.('.nv a, .nv button') ?? false,
  };
});
// the part of the page, as a scroll position in the room's own pin or at a section
const [r0, r1] = M.room, span = r1 - r0, vh = M.vh;
const parts = {
  'drawing, on paper': () => r0 + 1.9 * vh, 'drawing, off the page': () => r0 + 3.6 * vh,
  'tour, neck': () => r0 + 0.5 * span, 'tour, last stop': () => r0 + 0.88 * span, 'tour, outro': () => r1 - 0.7 * vh,
  workshop: () => M.shop[0] + 0.5 * (M.shop[1] - M.shop[0]), 'hear them': () => M.hear,
  order: () => M.order[0] + 0.5 * (M.order[1] - M.order[0]), footer: () => M.max,
};
const bad = [];
const check = (name, s) => {
  const wrong = [];
  if (s.y !== 0) wrong.push(`y ${s.y}`);
  if (s.cardShows) wrong.push('the tour card shows');
  if (s.headerPaper) wrong.push('header in paper colours');
  if (s.pointerPaper) wrong.push('pointer in paper colours');
  if (s.walkState || s.walkAt !== 0) wrong.push(`walk not home (${s.walkAt})`);
  if (s.roomUI !== '1' && s.roomUI !== '') wrong.push(`hero chrome at ${s.roomUI}`);
  if (s.under.length) wrong.push(`still under: ${s.under.join(', ')}`);
  if (s.ring) wrong.push('the logo keeps the focus');
  if (s.sink !== '0' && s.sink !== '0.000') wrong.push(`room sunk ${s.sink}`);
  console.log((wrong.length ? 'WRONG ' : 'ok    ') + name.padEnd(34) + (wrong.join(' | ')));
  if (wrong.length) bad.push(name);
};
for (const idle of [0, 12000]) {
  for (const [name, y] of Object.entries(parts)) {
    await goto(page, Math.round(y()), 1500);
    if (idle) await page.waitForTimeout(idle);
    await page.mouse.move(40, 40);
    await page.click('.nv__brand');
    await page.waitForTimeout(3000);
    await page.mouse.move(900, 500); await page.mouse.move(905, 505); await page.waitForTimeout(250);
    const label = `${name}${idle ? ', left idle' : ''}`;
    check(label, await state());
    if (OUT) await page.screenshot({ path: `${OUT}/${label.replace(/[^a-z]+/g, '-')}.png` });
  }
}
console.log(bad.length ? `${bad.length} wrong` : 'all clean', '| errors:', page.problems.length ? page.problems.join(' | ') : 'none');
close(); process.exit(bad.length ? 1 : 0);
