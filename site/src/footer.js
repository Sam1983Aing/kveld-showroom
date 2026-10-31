// The footer (04 Visit, 03 until How to order came in on 2026-10-24): Last Light, Sam's pick of 2026-10-06, tidied to his notes on 2026-10-07.
// The whole room as the last picture. It is dark and close when the footer first shows, and the
// lights come up as it fills the screen. Dust drifts up through the light on the guitar in the
// centre and fades into the dark above it. Under the guitars: where the room is, when it is open
// and how to reach it. Styles: "03 · visit" in styles.css.
// (The two options that were not picked, Open Strings and The Ticket, are under the tag
// alt/unpicked-options with ?footer=strings and ?footer=ticket.)
import { LINEUP } from './data.js';

const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const lines = (...l) => l.map((t) => `<span class="ft__l"><span>${t}</span></span>`).join('');

// The picture: tools/room_still.mjs, taken with this guitar in front (FLOOR=0.6 for a quiet floor).
// `dust` is the part of it the dust lives in, as fractions of the picture: the light and the guitar under it.
const STILL = { src: 'assets/shots/room-wide.jpg', front: 'moss' };
// KVELD is a concept: the hours are invented and the links have nowhere to go yet.
const link = (t) => `<a href="#visit">${t}${ARROW}</a>`;
const INFO = [
  ['The room', ['KVELD Room 01', 'Halden, Norway', '59.1244° N, 11.3875° E']],
  ['Hours', ['Thursday to Saturday', '11:00 to 18:00', 'By appointment']],
  ['Need info?', [link('Send us a text'), link('Email the workshop')]],
  ['Follow', [link('Instagram'), link('YouTube')]],
];

function arrive(section) {
  ScrollTrigger.create({ trigger: section, start: 'top 68%', once: true, onEnter: () => section.classList.add('is-in') });
}
/** The button leans toward the pointer. */
function magnet(el, k = 0.28) {
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * k, y: (e.clientY - r.top - r.height / 2) * k, duration: 0.6, ease: 'expo.out' }); });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'expo.out' }));
}

/**
 * Dust in the light over the centre guitar. Each mote rises slowly, sways, and fades out as it
 * climbs, so the top of the light dissolves into the dark. Drawn with one soft sprite, additive.
 * Runs only while the footer is on screen; with reduced motion it is a single still frame.
 */
function dust(canvas, section, hex, reduced) {
  // the guitar's colour, lifted towards white: "r, g, b"
  const colour = [1, 3, 5].map((k) => Math.round(parseInt(hex.slice(k, k + 2), 16) * 0.62 + 255 * 0.38)).join(', ');
  const g = canvas.getContext('2d');
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  {
    const s = sprite.getContext('2d'), grad = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${colour}, 1)`); grad.addColorStop(0.25, `rgba(${colour}, 0.9)`); grad.addColorStop(1, `rgba(${colour}, 0)`);
    s.fillStyle = grad; s.fillRect(0, 0, 32, 32);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  // x, y in 0..1 of the canvas (y down). Gathered round the middle, born anywhere from the plinth to above the head.
  const born = (p, first) => Object.assign(p, {
    x: 0.5 + (Math.random() + Math.random() + Math.random() - 1.5) * 0.42, y: rnd(0.3, 0.98),
    vy: rnd(0.014, 0.055), sway: rnd(0.004, 0.018), ph: rnd(0, 6.28), r: Math.random() < 0.12 ? rnd(3.2, 6) : rnd(1, 2.6),
    life: rnd(5, 12), t: first ? rnd(0, 12) : 0, tw: rnd(0.6, 2.4),
  });
  const P = Array.from({ length: 150 }, () => born({}, true));
  let w = 0, h = 0, dpr = 1, last = 0, on = false, raf = 0;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr)); h = canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  };
  function draw(dt, time) {
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (const p of P) {
      p.t += dt;
      if (p.t > p.life || p.y < -0.02) born(p, false);
      p.y -= p.vy * dt;
      const x = p.x + Math.sin(time * 0.35 + p.ph) * p.sway * 2.2;
      const k = p.t / p.life;
      // in quickly, out slowly, a little twinkle, and nothing near the edges or the top of the light
      const a = Math.min(k / 0.15, 1) * Math.pow(1 - k, 1.1) * (0.72 + 0.28 * Math.sin(time * p.tw + p.ph))
        * Math.min(Math.max(p.y / 0.3, 0), 1) * Math.max(1 - Math.abs(x - 0.5) / 0.5, 0);
      if (a <= 0.004) continue;
      const r = p.r * dpr * (p.r > 3 ? 2.2 : 1.6);
      g.globalAlpha = Math.min(a * (p.r > 3 ? 0.2 : 1.15), 1);
      g.drawImage(sprite, x * w - r, p.y * h - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }
  const frame = (now) => {
    if (!on) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    draw(dt, now / 1000);
    raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(() => { size(); if (reduced || !on) draw(0, 3); }).observe(canvas);
  size();
  if (reduced) { draw(0, 3); return; }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting === on) return;
    on = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (on) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(section);
}

/** Build the footer into the section (it replaces the plain markup the page ships with). */
export function buildFooter(section, { reduced = false } = {}) {
  const front = LINEUP.find((g) => g.id === STILL.front) || LINEUP[0];
  section.classList.add('ft', 'ft-light');
  // the footer takes the colour of the guitar in its picture, whichever one the room was left on
  section.style.setProperty('--accent', front.colour);
  section.innerHTML = `
    <div class="ftl__bg">
      <div class="ftl__pic">
        <img src="${STILL.src}" alt="" decoding="async">
        <i class="ftl__glow"></i>
        <canvas class="ftl__dust" aria-hidden="true"></canvas>
      </div>
    </div>
    <div class="ftl__in">
      <div>
        <p class="eyebrow ft__up">04 · Visit</p>
        <h2 class="ftl__h2">${lines('Come and hear', 'them <em>played</em>.')}</h2>
      </div>
      <a class="ft__cta ft__up" href="#room" style="--d: 2"><span>Book the room</span>${ARROW}</a>
    </div>
    <div class="ftl__info">${INFO.map(([k, rows], i) => `
      <div class="ft__up" style="--d: ${3 + i}"><h3>${k}</h3><ul>${rows.map((t) => `<li>${t}</li>`).join('')}</ul></div>`).join('')}
    </div>
    <div class="ftl__base ft__up" style="--d: 7"><p>© 2026 KVELD · Concept study</p><a href="#room">Back to the room</a></div>`;
  const pic = $('.ftl__pic', section);
  // the room is dark and close when the footer first shows, and opens up as it fills the screen
  gsap.fromTo(pic, { '--zoom': 1.2, '--lit': 0.2 }, { '--zoom': 1, '--lit': 1.25, ease: 'none',
    scrollTrigger: { trigger: section, start: 'top 90%', end: 'bottom bottom', scrub: 1 } });
  dust($('.ftl__dust', section), section, front.colour, reduced);
  magnet($('.ft__cta', section));
  arrive(section);
}
