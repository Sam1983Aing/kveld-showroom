// 03 · How to order (V7, 2026-10-24, first version, approved by Sam before it was built).
// Between Hear them and the footer: the buyer's side of the weeks the workshop shows. A light chapter,
// on the same paper as the drawing, because ordering one starts on paper too. Four steps in a row,
// joined by a line that draws itself as you scroll past, then the seven with their weeks and prices,
// and Book a visit, which takes you down to the footer. Styles: "03 · how to order" in styles.css.
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
    <div class="order__steps">
      <i class="order__line" aria-hidden="true"><b></b></i>
      <ol>${STEPS.map((s, k) => `
        <li class="order__step" data-reveal>
          <span class="order__node" aria-hidden="true"></span>
          <span class="order__no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span>
          <h3 class="order__title">${s.title}</h3>
          <p class="order__text">${s.text}</p>
          <p class="order__meta">${s.meta}</p>
        </li>`).join('')}
      </ol>
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

  // the line draws across the four steps as they pass, and each step's node lights when it gets there
  const line = $('.order__line b', section), nodes = $$('.order__node', section);
  const draw = (p) => {
    line.style.transform = `scale${innerWidth > 900 ? 'X' : 'Y'}(${p.toFixed(4)})`;
    nodes.forEach((n, k) => n.classList.toggle('is-on', p >= (k + 0.02) / STEPS.length - (innerWidth > 900 ? 0 : 0.08)));
  };
  if (reduced) { draw(1); return; }
  draw(0);
  ScrollTrigger.create({
    trigger: $('.order__steps', section), start: 'top 78%', end: () => (innerWidth > 900 ? 'top 22%' : 'bottom 60%'), scrub: 0.8,
    onUpdate: (st) => draw(st.progress),
  });
}
