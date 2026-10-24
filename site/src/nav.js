// The header: Fretboard (V7, picked by Sam on 2026-10-24 from three: Halo Mark and Index are under the
// tag alt/v7-options, behind ?nav=). KVELD's own headstock, traced from Floe's drawing, is the logo.
// The sections lie along a neck that runs across the header: the nut, then seven frets that close up
// toward the body the way real ones do (each 2^(1/12) shorter). A section is the space between two
// frets, six strings run the whole way, and the section you are in has a fingertip of light pressed on
// the strings, which shiver when it moves. On phones the board moves to the bottom edge of the screen.
//   buildNav()          the header, built at once, so the room can measure it (showroom.js layout)
//   .start(api)         once the page is built: api.go(key), api.where(), api.paper() (main.js)
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const TABS = [['room', 'Room'], ['drawing', 'Drawing'], ['closeup', 'Up close'], ['workshop', 'Workshop'], ['hear', 'Hear them'], ['order', 'Order'], ['visit', 'Visit']];
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const HEAD = `<svg class="nv__head" viewBox="-0.5 -0.5 11 31" aria-hidden="true"><path d="M7.9 29.8L7.89 28.48L7.97 27.49L8.22 26.64L8.55 25.92L9.02 25.23L9.47 24.53L9.87 23.97L9.99 23.61L9.98 23.07L9.81 22.32L9.53 21.43L9.21 20.51L8.93 19.61L8.66 18.72L8.39 17.82L8.11 16.92L7.83 16.02L7.56 15.12L7.29 14.22L7.01 13.33L6.74 12.43L6.46 11.52L6.18 10.61L5.91 9.71L5.65 8.85L5.39 8L5.14 7.18L4.9 6.4L4.59 5.4L4.26 4.32L3.97 3.28L3.7 2.24L3.39 1.41L3.04 0.82L2.41 0.22L1.64 0L0.93 0.25L0.43 0.81L0.13 1.74L0.03 2.68L0 4.13L0.03 5.43L0.08 6.33L0.15 7.31L0.24 8.33L0.33 9.36L0.4 10.36L0.47 11.36L0.52 12.35L0.57 13.35L0.6 14.35L0.61 15.36L0.61 16.87L0.61 18.31L0.59 19.71L0.59 21.43L0.63 22.92L0.71 24.22L0.84 25.3L0.98 26.21L1.13 27.14L1.25 28.03L1.3 29.2L1.28 30Z" fill="none" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round"/>${[[7.78, 22.27], [6.68, 18.66], [5.58, 15.06], [4.48, 11.46], [3.38, 7.85], [2.28, 4.25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.55" fill="currentColor"/>`).join('')}</svg>`;

export function buildNav() {
  const n = TABS.length;
  const pos = Array.from({ length: n + 1 }, (_, k) => 1 - Math.pow(2, -k / 12));
  const x = (k) => (pos[k] / pos[n]) * 100;           // percent along the board
  const head = document.createElement('header');
  head.className = 'site-head nv';
  head.innerHTML = `
    <a class="nv__brand" href="#room" data-nav="home" aria-label="KVELD, back to the room">${HEAD}<span class="nv__word">KVELD</span></a>
    <nav class="nv__board" aria-label="Sections">
      <svg class="nv__strings" preserveAspectRatio="none" viewBox="0 0 1000 24" aria-hidden="true">
        ${Array.from({ length: n + 1 }, (_, k) => `<line class="nv__fw${k ? '' : ' is-nut'}" x1="${x(k) * 10}" x2="${x(k) * 10}" y1="1" y2="23"/>`).join('')}
        ${[2, 4, 6].map((k) => `<circle class="nv__inlay" cx="${(x(k) + x(k + 1)) * 5}" cy="12" r="1.6"/>`).join('')}
        ${Array.from({ length: 6 }, (_, s) => `<path class="nv__str" d="M0 ${3 + s * 3.6}H1000" style="stroke-width:${(0.5 + s * 0.13).toFixed(2)}"/>`).join('')}
      </svg>
      <i class="nv__finger" aria-hidden="true"></i>
      ${TABS.map(([k, t], i) => `<button type="button" data-nav="${k}" style="left:${x(i)}%; width:${x(i + 1) - x(i)}%"><span>${t}</span></button>`).join('')}
    </nav>
    <button class="nv__book" type="button" data-nav="visit"><span>Book a visit</span>${ARROW}</button>`;
  document.body.prepend(head);
  const finger = $('.nv__finger', head), strs = $$('.nv__str', head), btns = $$('.nv__board button', head);

  // the strings shiver for a moment from where the finger lands: each one a fading wave
  let raf = 0;
  const shiver = (cx) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const f = (now) => {
      const t = (now - t0) / 1000, a = Math.max(0, 1 - t / 0.9);
      strs.forEach((p, s) => {
        const y = 3 + s * 3.6, amp = 1.3 * a * a * (1 - s * 0.08);
        let d = `M0 ${y}`;
        for (let i = 1; i <= 40; i++) { const xx = i * 25, env = Math.exp(-Math.pow((xx - cx) / 260, 2)); d += `L${xx} ${(y + amp * env * Math.sin(xx * 0.09 - t * 70 + s)).toFixed(2)}`; }
        p.setAttribute('d', d);
      });
      if (a > 0) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  };
  let first = true;
  const at = (w) => {
    const i = TABS.findIndex(([k]) => k === w);
    btns.forEach((b, k) => { b.classList.toggle('is-on', k === i); b.toggleAttribute('aria-current', k === i); });
    if (i < 0) return;
    const mid = (x(i) + x(i + 1)) / 2;
    finger.style.left = `${mid}%`;
    if (!first) shiver(mid * 10);
    first = false;
  };
  at('room');

  return {
    start(api) {
      head.addEventListener('click', (e) => {
        const b = e.target.closest('[data-nav]');
        if (!b || !head.contains(b)) return;
        e.preventDefault();
        api.go(b.dataset.nav);
      });
      // where we are and what we sit on, once a frame while the page moves
      let where = 'room', paper = null;
      gsap.ticker.add(() => {
        const w = api.where(), p = api.paper();
        if (w !== where) { where = w; at(w); }
        if (p !== paper) { paper = p; head.classList.toggle('is-paper', p); }
      });
    },
  };
}
