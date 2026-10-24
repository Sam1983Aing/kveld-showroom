// 03 · How to order (V7, 2026-10-24). Between Hear them and the footer: the buyer's side of the weeks the
// workshop shows. A light chapter, on the same paper as the drawing, because ordering one starts on paper
// too. The four steps are an order slip that fills in as you scroll, line by line, each ticked as it is
// done, then signed and stamped "Bench reserved" (Sam picked the Order Slip on 2026-10-24 from three:
// Two by Two and Card Deck are under the tag alt/v7-options, behind ?order=). With reduced motion it is
// simply filled in. After it, the seven with
// their weeks and prices, and Book a visit, which takes you down to the footer. Styles: "03 · how to
// order" in styles.css.
// The terms (deposit, delivery, the Friday pictures) are invented, like the maker.
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';

const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';

const weeks = LINEUP.map((g) => SPECS[g.id].weeks);
const STEPS = [
  { title: 'Come and <em>play</em>.', text: 'Book an hour in the room in Halden. All seven are there, plugged in, and nobody is selling. Play until one of them answers back.', meta: 'Free · Thursday to Saturday' },
  { title: 'Make it <em>yours</em>.', text: 'Choose the finish and the carve of the neck with the maker who will build it. They take the measure of your hand and listen to how you play.', meta: 'A 30% deposit holds a bench' },
  { title: 'Built on one <em>bench</em>.', text: `One maker, one guitar, ${Math.min(...weeks)} to ${Math.max(...weeks)} weeks. A picture from the bench every Friday, so you can watch it come together.`, meta: `${Math.min(...weeks)} to ${Math.max(...weeks)} weeks` },
  { title: 'Take it <em>home</em>.', text: 'It is played in the room for a day before it is yours. Collect it in Halden, or it comes to you in a fitted case, anywhere in Europe.', meta: 'The rest on collection' },
];

/** Build the section. `toVisit()` takes the page to the footer. */
export function buildOrder(section, { toVisit, reduced }) {
  section.innerHTML = `
    <div class="order__head">
      <p class="eyebrow">03 · How to order</p>
      <h2 class="order__h2" data-split>From a visit<br>to your <em>hands</em>.</h2>
      <p class="order__lede" data-reveal>Every KVELD is made to order, one at a time, for the person who will play it. This is how that goes, from the first hour in the room to the day you take it home.</p>
    </div>
    <div class="order__stage">
      <div class="slip">
        <header class="slip__head"><b>KVELD</b><span>Order slip · Room 01, Halden</span><i>No. 0417</i></header>
        <ol class="slip__lines">${STEPS.map((s, k) => `
          <li class="slip__line">
            <span class="slip__box" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4L16.5 5"/></svg></span>
            <span class="slip__no">${String(k + 1).padStart(2, '0')}</span>
            <div><h3 class="slip__title">${s.title}</h3><p class="slip__text">${s.text}</p></div>
            <span class="slip__meta">${s.meta}</span>
          </li>`).join('')}
        </ol>
        <footer class="slip__foot"><span>Signed</span><svg class="slip__sig" viewBox="0 0 220 50" aria-hidden="true"><path d="M6 36c10-18 18-26 24-20s-8 22 2 20 14-26 22-24-4 26 6 24 12-18 20-18 2 14 10 14 16-10 26-10 14 8 24 6 20-8 30-12"/></svg><span class="slip__stamp">Bench reserved</span></footer>
      </div>
    </div>
    <div class="order__foot">
      <div class="order__list" data-reveal>
        <p class="order__k">The seven, to order</p>
        <table>
          <tbody>${LINEUP.map((g) => { const S = SPECS[g.id]; return `
            <tr style="--own: ${g.colour}"><td class="order__n">${g.no}</td><th scope="row">${g.name}</th><td class="order__p">${g.pattern}</td><td>${S.weeks} weeks</td><td class="order__price">${S.price}</td></tr>`; }).join('')}
          </tbody>
        </table>
      </div>
      <div class="order__cta" data-reveal>
        <button class="order__book" type="button" data-order-book><span>Book a visit</span>${ARROW}</button>
        <p class="order__small">An hour in the room is free. Thursday to Saturday, 11:00 to 18:00, by appointment.</p>
      </div>
    </div>`;

  $('[data-order-book]', section).addEventListener('click', toVisit);
  // the slip fills in while the stage is pinned: each line writes in and is ticked, then the signature
  // and the stamp. Reduced motion: it fills in a step at a time.
  const lines = $$('.slip__line', section), sig = $('.slip__sig path', section), stamp = $('.slip__stamp', section);
  const L = sig.getTotalLength();
  sig.style.strokeDasharray = L;
  const sm = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const fill = (p) => {
    lines.forEach((li, i) => {
      li.style.setProperty('--w', sm(0.05 + i * 0.18, 0.2 + i * 0.18, p).toFixed(3));
      li.classList.toggle('is-done', p > 0.25 + i * 0.18);
    });
    sig.style.strokeDashoffset = (L * (1 - sm(0.8, 0.92, p))).toFixed(1);
    const st = sm(0.93, 0.97, p);
    stamp.style.opacity = st.toFixed(3);
    stamp.style.transform = `rotate(-8deg) scale(${(1.8 - 0.8 * st).toFixed(3)})`;
  };
  if (reduced) { fill(1); return; }                    // reduced motion: the slip is filled in, and nothing pins
  fill(0);
  ScrollTrigger.create({
    trigger: $('.order__stage', section), start: 'top top', end: () => `+=${Math.round(2.6 * innerHeight)}`, pin: true, anticipatePin: 1,
    onUpdate: (st) => fill(st.progress),
  });
}
