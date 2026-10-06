// 02 · The room, as a place to choose a guitar ("Spotlight", picked 2026-10-06).
//
// Seven names on the left; on the right the one in the light: its still, its
// outline drawn behind it, a short sheet, a price and the way to it in the
// room. The section is several screens tall and its content sticks to the
// screen (CSS), so scrolling walks the light down the list and it works
// without a pointer. With a mouse, pointing at a name previews it and leaving
// the list goes back to where the scroll is.
//
// The hold is plain `position: sticky` and the progress is read from the
// section's own box, not a ScrollTrigger pin: with reduced motion (no Lenis)
// ScrollTrigger placed anything below the pinned room a whole walk too early.
//
// Stills: assets/shots/<id>-hero.webp (tools/product_shots.mjs). The outline
// is plotted from assets/data/<id>.json with frames.json, which says where a
// front still sits in the guitar's own frame. Words and prices: specs.js.
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';

const { gsap } = window;
const IN = 0.0254;
const N = LINEUP.length;
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** The body and neck outline in a front still's own pixels. */
function planPath(D, F) {
  const tail = Math.min(...D.body_outline.map((p) => p[0])), tip = Math.max(...D.neck.map((p) => p[0])), nut = D.nut[0];
  const fold = Math.min((F.top - (nut - tail) * IN) / ((tip - nut) * IN), 1);   // a head that leans back is shorter seen from the front
  const X = (y) => (-y * IN) * F.ppm + F.w / 2;
  const Y = (x) => (F.base + F.h / F.ppm - ((x > nut ? nut + (x - nut) * fold : x) - tail) * IN) * F.ppm;
  const d = (pts) => `M${pts.map((p) => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}Z`;
  return d(D.body_outline) + d(D.neck);
}

/**
 * Build the section. `sheet(id)` resolves a guitar's drawing data, `pick(i)`
 * takes the ring to that guitar, `scrollToY(px)` scrolls the page.
 */
export async function buildSpotlight(section, { sheet, pick, scrollToY, reduced }) {
  const [sheets, frames] = await Promise.all([Promise.all(LINEUP.map((g) => sheet(g.id))), fetch('assets/shots/frames.json').then((r) => r.json())]);
  const list = LINEUP.map((info, i) => ({ info, S: SPECS[info.id] || {}, D: sheets[i], scale: `${+sheets[i].scale.toFixed(2)} in` }));
  const F0 = frames[LINEUP[0].id];

  section.innerHTML = `
    <div class="spot__pin">
      <div class="spot__left">
        <p class="eyebrow">02 · The room</p>
        <h2 class="spot__h2">The room holds seven. Find the one that <em>fits</em>.</h2>
        <ol class="spot__names">${list.map(({ info }, i) => `
          <li style="--own: ${info.colour}; --i: ${i}"><button type="button" data-i="${i}" aria-label="${info.name}, ${info.pattern}. See it in the room"><span class="spot__no">${info.no}</span><span class="spot__t">${info.name}</span><span class="spot__k">${info.pattern}</span></button></li>`).join('')}
        </ol>
        <ol class="spot__dots">${list.map(({ info }, i) => `<li><button type="button" data-step="${i}" style="--own: ${info.colour}" aria-label="${info.name}"></button></li>`).join('')}</ol>
      </div>
      <div class="spot__stage">
        <i class="spot__halo"></i>
        <span class="spot__num" data-num aria-hidden="true">01</span>
        <svg class="spot__plan" viewBox="0 0 ${F0.w} ${F0.h}" aria-hidden="true"><path pathLength="1" data-plan/></svg>
        <div class="spot__imgs">${list.map(({ info, S }, i) => `<img src="assets/shots/${info.id}-hero.webp" alt="${info.name}, ${S.finish}" data-pick="${i}" decoding="async" fetchpriority="low">`).join('')}</div>
        <div class="spot__sheet">
          <div data-swap>
            <p class="spot__after" data-after></p>
            <p class="spot__claim" data-claim></p>
            <dl class="spot__facts" data-facts></dl>
          </div>
          <div class="spot__buy"><p class="spot__price" data-price></p><button class="spot__go" type="button" data-go><span>In the room</span>${ARROW}</button></div>
        </div>
      </div>
    </div>`;

  const names = $('.spot__names', section);
  const rows = $$('li', names), imgs = $$('.spot__imgs img', section), dots = $$('.spot__dots button', section);
  const el = { num: $('[data-num]', section), plan: $('[data-plan]', section), after: $('[data-after]', section), claim: $('[data-claim]', section),
    facts: $('[data-facts]', section), price: $('[data-price]', section), swap: $('[data-swap]', section) };

  let on = -1;
  function show(i) {
    if (i === on) return;
    const { info, S, D, scale } = list[i], first = on < 0;
    imgs.forEach((im, k) => { im.classList.toggle('is-out', k === on); im.classList.toggle('is-on', k === i); });
    rows.forEach((r, k) => { r.classList.toggle('is-on', k === i); r.firstElementChild.setAttribute('aria-current', String(k === i)); });
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    on = i;
    section.style.setProperty('--own', info.colour);
    el.plan.setAttribute('d', planPath(D, frames[info.id]));
    const fill = () => {
      el.num.textContent = info.no;
      el.after.textContent = `After ${S.after}`;
      el.claim.innerHTML = S.claim;
      el.facts.innerHTML = `<dt>Scale</dt><dd>${scale}</dd><dt>Pickups</dt><dd>${S.short}</dd><dt>Finish</dt><dd>${S.finish}</dd>`;
      el.price.innerHTML = `From ${S.price}<span>To order · ${S.weeks} weeks</span>`;
    };
    if (first || reduced) { fill(); return; }
    // the outline redraws behind the guitar, the words step out and back in
    gsap.fromTo(el.plan, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'expo.out', overwrite: true });
    gsap.timeline({ overwrite: true }).to([el.swap, el.num, el.price], { opacity: 0, y: -8, duration: 0.22, ease: 'power2.in' }).add(fill)
      .fromTo([el.num, el.swap, el.price], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
  }

  // where the scroll says the light is, and where a pointer has put it for the moment
  let scrolled = 0, pointed = -1, near = false;
  const settle = () => show(pointed >= 0 ? pointed : scrolled);
  settle();
  const run = () => Math.max(section.offsetHeight - innerHeight, 1);          // how far the page scrolls while the section holds
  gsap.ticker.add(() => {
    if (!near) return;
    const i = Math.min(Math.floor(Math.min(Math.max(-section.getBoundingClientRect().top / run(), 0), 1) * N), N - 1);
    if (i !== scrolled) { scrolled = i; pointed = -1; settle(); }
  });
  new IntersectionObserver(([e]) => { near = e.isIntersecting; }).observe(section);
  const arrive = new IntersectionObserver(([e]) => { if (e.isIntersecting) { section.classList.add('is-in'); arrive.disconnect(); } }, { rootMargin: '0px 0px -28% 0px' });
  arrive.observe(section);

  rows.forEach((r, i) => {
    const b = r.firstElementChild;
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { pointed = i; settle(); } });
    b.addEventListener('focus', () => { pointed = i; settle(); });
    b.addEventListener('click', () => pick(i));
  });
  names.addEventListener('pointerleave', () => { pointed = -1; settle(); });
  // phones show one name at a time: the dots say where you are in the seven and jump to any of them
  dots.forEach((d, i) => d.addEventListener('click', () => scrollToY(Math.round(section.getBoundingClientRect().top + scrollY + (i + 0.5) / N * run()))));
  $('[data-go]', section).addEventListener('click', () => pick(on));
  $('.spot__imgs', section).addEventListener('click', () => pick(on));
}
