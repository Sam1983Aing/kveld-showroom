// Navigation options (V7, 2026-10-24, demo-options round): ?nav=halo|fret|index. Sam found the header
// generic ("a nice logo next to the name, a nice navigation with all the tabs"). Without the switch the
// page keeps its old header. Each option builds its own header and hides the old one.
//   halo    01 Halo Mark: the hero's arch as a logo, seven tabs with a light that slides to the one
//           you are in, Book a visit, a glass bar once you leave the top
//   fret    02 Fretboard: KVELD's own headstock as the logo, the sections laid out as frets along a
//           neck that runs across the header, a fingertip of light pressed in the one you are in
//   index   03 Index: a quiet header that says where you are, and a full-screen menu of the seven
// api (main.js): go(key) travels there (a dark jump when it is far), where() says which section is in
// view, paper() says whether the header sits over a light page.
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const TABS = [['room', 'Room'], ['drawing', 'Drawing'], ['closeup', 'Up close'], ['workshop', 'Workshop'], ['hear', 'Hear them'], ['order', 'Order'], ['visit', 'Visit']];
const NOTES = { room: 'Seven guitars on glass', drawing: 'The plan, inked', closeup: 'The camera along the guitar', workshop: 'Built on one bench', hear: 'Seven voices', order: 'From a visit to your hands', visit: 'Halden, by appointment' };
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
// the hero's arch, open at the bottom, with a guitar's neck standing in it
const HALO = `<svg class="nv__mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M7.4 24.4A11 11 0 1 1 24.6 24.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16 5.5V27" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="27.4" r="2.2" fill="currentColor"/></svg>`;
// KVELD's own headstock, traced from Floe's drawing (assets/data/floe.json), standing up, with its six posts
const HEAD = `<svg class="nv__head" viewBox="-0.5 -0.5 11 31" aria-hidden="true"><path d="M7.9 29.8L7.89 28.48L7.97 27.49L8.22 26.64L8.55 25.92L9.02 25.23L9.47 24.53L9.87 23.97L9.99 23.61L9.98 23.07L9.81 22.32L9.53 21.43L9.21 20.51L8.93 19.61L8.66 18.72L8.39 17.82L8.11 16.92L7.83 16.02L7.56 15.12L7.29 14.22L7.01 13.33L6.74 12.43L6.46 11.52L6.18 10.61L5.91 9.71L5.65 8.85L5.39 8L5.14 7.18L4.9 6.4L4.59 5.4L4.26 4.32L3.97 3.28L3.7 2.24L3.39 1.41L3.04 0.82L2.41 0.22L1.64 0L0.93 0.25L0.43 0.81L0.13 1.74L0.03 2.68L0 4.13L0.03 5.43L0.08 6.33L0.15 7.31L0.24 8.33L0.33 9.36L0.4 10.36L0.47 11.36L0.52 12.35L0.57 13.35L0.6 14.35L0.61 15.36L0.61 16.87L0.61 18.31L0.59 19.71L0.59 21.43L0.63 22.92L0.71 24.22L0.84 25.3L0.98 26.21L1.13 27.14L1.25 28.03L1.3 29.2L1.28 30Z" fill="none" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round"/>${[[7.78, 22.27], [6.68, 18.66], [5.58, 15.06], [4.48, 11.46], [3.38, 7.85], [2.28, 4.25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.55" fill="currentColor"/>`).join('')}</svg>`;

let cssP = null;
const css = () => cssP ||= new Promise((ok) => {
  const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('../nav-options.css', import.meta.url).href + '?v=3' });
  l.onload = l.onerror = ok; document.head.appendChild(l);
});

export async function buildNav(slug, api) {
  const make = { halo, fret, index }[slug];
  if (!make) return;
  await css();
  const head = document.createElement('header');
  head.className = `nv nv--${slug}`;
  document.body.appendChild(head);
  document.documentElement.dataset.navOpt = slug;      // not data-nav: that is what the links carry
  const opt = make(head, api);
  head.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nav]');
    if (!b || !head.contains(b)) return;
    e.preventDefault();
    opt.close?.();
    api.go(b.dataset.nav);
  });
  // where we are and what we sit on, once a frame while the page moves
  let at = '', paper = null, solid = null;
  const tick = () => {
    const w = api.where(), p = api.paper(), s = scrollY > 40;
    if (w !== at) { at = w; opt.at(w); }
    if (p !== paper) { paper = p; head.classList.toggle('is-paper', p); }
    if (s !== solid) { solid = s; head.classList.toggle('is-solid', s); }
  };
  gsap.ticker.add(tick);
  tick();
  document.documentElement.dataset.navReady = '1';
}

/* ======================================================== 01 · Halo Mark === */
function halo(head) {
  head.innerHTML = `
    <a class="nv__brand" href="#room" data-nav="home" aria-label="KVELD, back to the room">${HALO}<span class="nv__word">KVELD</span><span class="nv__sub">Guitar makers<br>Halden</span></a>
    <nav class="nv__tabs" aria-label="Sections">${TABS.map(([k, t]) => `<button type="button" data-nav="${k}">${t}</button>`).join('')}<i class="nv__ind" aria-hidden="true"></i></nav>
    <button class="nv__book" type="button" data-nav="visit"><span>Book a visit</span>${ARROW}</button>
    <button class="nv__menu" type="button" data-nav-menu aria-expanded="false"><span>Menu</span><i></i></button>
    <div class="nv__sheet">${TABS.map(([k, t], i) => `<button type="button" data-nav="${k}"><b>${String(i + 1).padStart(2, '0')}</b>${t}</button>`).join('')}</div>`;
  const tabs = $$('.nv__tabs button', head), ind = $('.nv__ind', head), menu = $('[data-nav-menu]', head);
  const place = (b) => { if (!b) return; ind.style.transform = `translateX(${b.offsetLeft}px)`; ind.style.width = `${b.offsetWidth}px`; };
  let cur = null;
  addEventListener('resize', () => place(cur));
  const open = (v) => { head.classList.toggle('is-open', v); menu.setAttribute('aria-expanded', String(v)); };
  menu.addEventListener('click', () => open(!head.classList.contains('is-open')));
  return {
    at(w) { tabs.forEach((b) => b.classList.toggle('is-on', b.dataset.nav === w)); cur = tabs.find((b) => b.dataset.nav === w); place(cur); $$('.nv__sheet button', head).forEach((b) => b.classList.toggle('is-on', b.dataset.nav === w)); },
    close() { open(false); },
  };
}

/* ======================================================== 02 · Fretboard === */
// The header is a neck lying across the top: the headstock (the logo) on the left, the nut, then seven
// frets that close up toward the body the way real ones do (each 2^(1/12) shorter). A section is the
// space between two frets. Six strings run the whole way. The one you are in has a fingertip of light
// pressed on the strings, and the strings shiver when it moves.
function fret(head) {
  const n = TABS.length;
  const pos = Array.from({ length: n + 1 }, (_, k) => 1 - Math.pow(2, -k / 12));
  const x = (k) => (pos[k] / pos[n]) * 100;           // percent along the board
  head.innerHTML = `
    <a class="nv__brand" href="#room" data-nav="home" aria-label="KVELD, back to the room">${HEAD}<span class="nv__word">KVELD</span></a>
    <nav class="nv__board" aria-label="Sections">
      <svg class="nv__strings" preserveAspectRatio="none" viewBox="0 0 1000 24" aria-hidden="true">
        ${Array.from({ length: n + 1 }, (_, k) => `<line class="nv__fw${k ? '' : ' is-nut'}" x1="${x(k) * 10}" x2="${x(k) * 10}" y1="1" y2="23"/>`).join('')}
        ${[2, 4, 6].map((k) => `<circle class="nv__inlay" cx="${(x(k) + x(k + 1)) * 5}" cy="12" r="1.6"/>`).join('')}
        ${Array.from({ length: 6 }, (_, s) => `<path class="nv__str" data-s="${s}" d="M0 ${3 + s * 3.6}H1000" style="stroke-width:${(0.5 + s * 0.13).toFixed(2)}"/>`).join('')}
      </svg>
      <i class="nv__finger" aria-hidden="true"></i>
      ${TABS.map(([k, t], i) => `<button type="button" data-nav="${k}" style="left:${x(i)}%; width:${x(i + 1) - x(i)}%"><span>${t}</span></button>`).join('')}
    </nav>
    <button class="nv__book" type="button" data-nav="visit"><span>Book a visit</span>${ARROW}</button>`;
  const finger = $('.nv__finger', head), strs = $$('.nv__str', head), btns = $$('.nv__board button', head);
  // the strings shiver for a moment: each one a fading wave, from where the finger lands
  let raf = 0;
  const shiver = (cx) => {
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
  return {
    at(w) {
      const i = TABS.findIndex(([k]) => k === w);
      btns.forEach((b, k) => b.classList.toggle('is-on', k === i));
      if (i < 0) return;
      const mid = (x(i) + x(i + 1)) / 2;
      finger.style.left = `${mid}%`;
      if (!first) shiver(mid * 10);
      first = false;
    },
  };
}

/* ============================================================ 03 · Index === */
// A header that only says where you are: the mark, KVELD, the section's number and name rolling over
// as you go, and Menu. The menu fills the screen: the seven as big lines, each with a note, the room's
// hours and Book a visit along the bottom.
function index(head) {
  head.innerHTML = `
    <a class="nv__brand" href="#room" data-nav="home" aria-label="KVELD, back to the room">${HALO}<span class="nv__word">KVELD</span></a>
    <p class="nv__now" aria-live="polite"><span class="nv__no" data-now-no>01</span><span class="nv__nm"><span data-now-name>Room</span></span></p>
    <button class="nv__menu" type="button" data-nav-menu aria-expanded="false"><span data-menu-label>Menu</span><i></i></button>
    <div class="nv__over" aria-hidden="true">
      <i class="nv__glow"></i>
      <ol class="nv__list">${TABS.map(([k, t], i) => `
        <li><button type="button" data-nav="${k}"><span class="nv__ln">${String(i + 1).padStart(2, '0')}</span><span class="nv__lt"><span>${t}</span></span><span class="nv__lnote">${NOTES[k]}</span></button></li>`).join('')}
      </ol>
      <div class="nv__foot">
        <p>KVELD Room 01<br>Halden, Norway</p>
        <p>Thursday to Saturday<br>11:00 to 18:00, by appointment</p>
        <button class="nv__book" type="button" data-nav="visit"><span>Book a visit</span>${ARROW}</button>
      </div>
    </div>`;
  const menu = $('[data-nav-menu]', head), over = $('.nv__over', head), label = $('[data-menu-label]', head);
  const no = $('[data-now-no]', head), nm = $('[data-now-name]', head);
  const lines = $$('.nv__lt > span', over), notes = $$('.nv__ln, .nv__lnote', over), foot = $$('.nv__foot > *', over);
  let isOpen = false;
  const open = (v) => {
    if (v === isOpen) return;
    isOpen = v;
    head.classList.toggle('is-open', v);
    menu.setAttribute('aria-expanded', String(v)); over.setAttribute('aria-hidden', String(!v));
    label.textContent = v ? 'Close' : 'Menu';
    if (v) {
      gsap.set(over, { visibility: 'visible' });
      gsap.fromTo(over, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut', overwrite: true });
      gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05, delay: 0.35 });
      gsap.fromTo([...notes, ...foot], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.02, delay: 0.6 });
    } else {
      // replaces the opening tween if it is still running (two tweens on one clip-path left it open)
      gsap.fromTo(over, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.7, ease: 'expo.inOut', overwrite: true,
        onComplete: () => { if (!isOpen) gsap.set(over, { visibility: 'hidden' }); } });
    }
  };
  menu.addEventListener('click', () => open(!isOpen));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
  let first = true;
  return {
    at(w) {
      const i = TABS.findIndex(([k]) => k === w);
      if (i < 0) return;
      $$('.nv__list button', over).forEach((b, k) => b.classList.toggle('is-on', k === i));
      const fill = () => { no.textContent = String(i + 1).padStart(2, '0'); nm.textContent = TABS[i][1]; };
      if (first) { first = false; fill(); return; }
      gsap.timeline({ overwrite: true }).to([nm, no], { yPercent: -110, duration: 0.3, ease: 'expo.in' }).add(fill).fromTo([nm, no], { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'expo.out' });
    },
    close() { open(false); },
  };
}
