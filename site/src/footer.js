// The footer (03 Visit): Last Light, Sam's pick of 2026-10-06.
// The whole room as the last picture. It is dark and close when the footer first
// shows, and the lights come up as it fills the screen. Styles: "03 · visit" in styles.css.
// (The two options that were not picked, Open Strings and The Ticket, run in versions/v32
// with ?footer=strings and ?footer=ticket.)
import { LINEUP } from './data.js';

const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const NOTE = 'KVELD is a fictional maker, made for a concept study. Each of the seven is modelled from published measured drawings of a classic electric guitar, then changed: the headstock, markers and logo are original, and every body departs from its source.';
const lines = (...l) => l.map((t) => `<span class="ft__l"><span>${t}</span></span>`).join('');
const META = `<ul class="ft__meta"><li><b>KVELD Room 01</b></li><li>59.1244° N, 11.3875° E</li><li>Thursday to Saturday, by appointment</li></ul>`;

function arrive(section) {
  ScrollTrigger.create({ trigger: section, start: 'top 68%', once: true, onEnter: () => section.classList.add('is-in') });
}
/** The button leans toward the pointer. */
function magnet(el, k = 0.28) {
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * k, y: (e.clientY - r.top - r.height / 2) * k, duration: 0.6, ease: 'expo.out' }); });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }));
}

/** Build the footer into the section (it replaces the plain markup the page ships with). */
export function buildFooter(section) {
  section.classList.add('ft', 'ft-light');
  section.innerHTML = `
    <div class="ftl__bg"><img src="assets/shots/room-wide.jpg" alt="" decoding="async"></div>
    <div class="ftl__in">
      <div>
        <p class="eyebrow ft__up">03 · Visit</p>
        <h2 class="ftl__h2">${lines('Come and hear', 'them <em>played</em>.')}</h2>
      </div>
      <div class="ftl__side">
        <a class="ft__cta ft__up" href="#room" style="--d: 2"><span>Book the room</span>${ARROW}</a>
        <div class="ft__up" style="--d: 3">${META}</div>
      </div>
    </div>
    <p class="ftl__names ft__up" style="--d: 5">${LINEUP.map((g) => `<span style="--own: ${g.colour}">${g.name}</span>`).join('')}</p>
    <div class="ftl__foot ft__up" style="--d: 6"><p class="ft__note">${NOTE}</p></div>`;
  const img = $('.ftl__bg img', section);
  // the room is dark and close when the footer first shows, and opens up as it fills the screen
  gsap.fromTo(img, { '--zoom': 1.2, '--lit': 0.2 }, { '--zoom': 1, '--lit': 1.25, ease: 'none',
    scrollTrigger: { trigger: section, start: 'top 90%', end: 'bottom bottom', scrub: 1 } });
  magnet($('.ft__cta', section));
  arrive(section);
}
