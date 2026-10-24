// 03 · How to order (V7, 2026-10-24). Between Hear them and the footer: the buyer's side of the weeks the
// workshop shows. A light chapter, on the same paper as the drawing, because ordering one starts on paper
// too. One view, pinned while the scroll plays it (Sam, 2026-10-24: "everything in the same view"): on the
// left the head, the seven with their weeks and starting prices, and Book a visit. On the right an order
// slip that fills in step by step, each step in its own colour: a marker swipes behind its title, the
// words rise one after another, the box fills and ticks, the note becomes a coloured tag. Then the slip
// is signed and stamped "Bench reserved". (Sam picked the Order Slip from three: Two by Two and Card
// Deck are under the tag alt/v7-options.) Phones: no pin, the slip fills as it scrolls past. Reduced
// motion: the slip is filled in. Styles: "03 · how to order" in styles.css.
// The terms (deposit, delivery, the Friday pictures) are invented, like the maker.
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';

const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';

const weeks = LINEUP.map((g) => SPECS[g.id].weeks);
// each step takes one of the guitars' own colours (data.js): Sedge, Rowan, Moss, Floe
const STEPS = [
  { colour: '#e8c14a', title: 'Come and <em>play</em>.', text: 'Book an hour in the room in Halden. All seven are there, plugged in, and nobody is selling. Play until one of them answers back.', meta: 'Free · Thursday to Saturday' },
  { colour: '#ff5a40', title: 'Make it <em>yours</em>.', text: 'Choose the finish and the carve of the neck with the maker who will build it. They take the measure of your hand and listen to how you play.', meta: 'A 30% deposit holds a bench' },
  { colour: '#a6d84a', title: 'Built on one <em>bench</em>.', text: `One maker, one guitar, ${Math.min(...weeks)} to ${Math.max(...weeks)} weeks. A picture from the bench every Friday, so you can watch it come together.`, meta: `${Math.min(...weeks)} to ${Math.max(...weeks)} weeks` },
  { colour: '#4fb8cc', title: 'Take it <em>home</em>.', text: 'It is played in the room for a day before it is yours. Collect it in Halden, or it comes to you in a fitted case, anywhere in Europe.', meta: 'The rest on collection' },
];

/** Build the section. `toVisit()` takes the page to the footer. */
export function buildOrder(section, { toVisit, reduced }) {
  // a title split into words, each in a mask, so they can rise one after another
  const wordsOf = (html) => html.replace(/(<em>.*?<\/em>[.,]?|[^\s<]+)/g, (w) => `<span class="slip__w"><span>${w}</span></span>`);
  section.innerHTML = `
    <div class="order__pin">
      <div class="order__info">
        <p class="eyebrow">03 · How to order</p>
        <h2 class="order__h2" data-split>From a visit<br>to your <em>hands</em>.</h2>
        <p class="order__lede">Every KVELD is made to order, one at a time, for the person who will play it. This is how that goes.</p>
        <div class="order__list">
          <p class="order__k"><span>The seven</span><span>Build</span><span>From</span></p>
          <ol>${LINEUP.map((g) => { const S = SPECS[g.id]; return `
            <li style="--own: ${g.colour}"><b>${g.name}</b><span>${S.weeks} weeks</span><em>${S.price}</em></li>`; }).join('')}
          </ol>
        </div>
        <div class="order__cta">
          <button class="order__book" type="button" data-order-book><span>Book a visit</span>${ARROW}</button>
          <p class="order__small">An hour in the room is free.<br>Thursday to Saturday, by appointment.</p>
        </div>
      </div>
      <div class="slip">
        <header class="slip__head"><b>KVELD</b><span>Order slip · Room 01, Halden</span><i>No. 0417</i></header>
        <ol class="slip__lines">${STEPS.map((st, k) => `
          <li class="slip__line" style="--step: ${st.colour}">
            <span class="slip__box" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4L16.5 5"/></svg></span>
            <span class="slip__no">${String(k + 1).padStart(2, '0')}</span>
            <div class="slip__body"><h3 class="slip__title"><i class="slip__mark" aria-hidden="true"></i>${wordsOf(st.title)}</h3><p class="slip__text">${st.text}</p></div>
            <span class="slip__meta">${st.meta}</span>
          </li>`).join('')}
        </ol>
        <footer class="slip__foot"><span>Signed</span><svg class="slip__sig" viewBox="0 0 220 50" aria-hidden="true"><path d="M6 36c10-18 18-26 24-20s-8 22 2 20 14-26 22-24-4 26 6 24 12-18 20-18 2 14 10 14 16-10 26-10 14 8 24 6 20-8 30-12"/></svg><span class="slip__stamp">Bench reserved</span></footer>
      </div>
    </div>`;

  $('[data-order-book]', section).addEventListener('click', toVisit);
  // the slip fills in: each step's marker swipes, its words rise one after another, its text and note
  // come in, its box fills and ticks. Then the signature, then the stamp.
  const lines = $$('.slip__line', section), sig = $('.slip__sig path', section), stamp = $('.slip__stamp', section);
  const parts = lines.map((li) => ({ li, mark: $('.slip__mark', li), words: $$('.slip__w > span', li) }));
  const L = sig.getTotalLength();
  sig.style.strokeDasharray = L;
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const fill = (p) => {
    parts.forEach(({ li, mark, words }, i) => {
      const w = clamp01((p - 0.04 - i * 0.19) / 0.15);            // this step's own 0..1
      mark.style.transform = `scaleX(${sm(0, 0.45, w).toFixed(3)})`;
      const n = words.length;
      words.forEach((el, k) => { const e = sm(0, 1, w * (n + 2) / 2 - k * 0.5); el.style.transform = `translate3d(0, ${((1 - e) * 105).toFixed(1)}%, 0)`; });
      li.style.setProperty('--w', sm(0.35, 1, w).toFixed(3));
      li.classList.toggle('is-on', w > 0 && w < 1);
      li.classList.toggle('is-done', w >= 1);
    });
    sig.style.strokeDashoffset = (L * (1 - sm(0.8, 0.9, p))).toFixed(1);
    const st = sm(0.91, 0.96, p);
    stamp.style.opacity = st.toFixed(3);
    stamp.style.transform = `rotate(-8deg) scale(${(1.8 - 0.8 * st).toFixed(3)})`;
  };
  if (reduced) { fill(1); return; }                    // reduced motion: the slip is filled in, and nothing pins
  fill(0);
  // wide screens: the whole view pins while the slip fills. Phones: the slip fills as it scrolls past
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': () => { ScrollTrigger.create({ trigger: $('.order__pin', section), start: 'top top', end: () => `+=${Math.round(2.4 * innerHeight)}`, pin: true, anticipatePin: 1, onUpdate: (st) => fill(st.progress) }); },
    '(max-width: 900px)': () => { ScrollTrigger.create({ trigger: $('.slip', section), start: 'top 70%', end: 'bottom 45%', onUpdate: (st) => fill(st.progress) }); },
  });
}
