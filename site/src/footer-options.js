// DEMO OPTIONS: the footer (03 Visit).
//
//   ?footer=light     01 Last Light   the whole room as the last picture, the lights coming up as you arrive
//   ?footer=strings   02 Open Strings six strings across the page that ring when a hand crosses them (sound is opt-in)
//   ?footer=ticket    03 The Ticket   a paper appointment card: pick the guitar, the day, the hour, and it is stamped
//
// Without ?footer the footer is the one the page has always had. Nothing here
// sends anything anywhere: the ticket is a front with no back.
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';

const Q = new URLSearchParams(location.search);
export const FOOTER = ['light', 'strings', 'ticket'].includes(Q.get('footer')) ? Q.get('footer') : null;
const { gsap, ScrollTrigger } = window;
const IN = 0.0254;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const NOTE = 'KVELD is a fictional maker, made for a concept study. Each of the seven is modelled from published measured drawings of a classic electric guitar, then changed: the headstock, markers and logo are original, and every body departs from its source.';
const lines = (...l) => l.map((t) => `<span class="ft__l"><span>${t}</span></span>`).join('');

const CSS = /* css */`
.ft { position: relative; padding: 0; overflow: hidden; background: var(--ink); }
.ft em { font-style: normal; color: var(--accent); }
.ft__l { display: block; overflow: hidden; padding-bottom: 0.1em; margin-bottom: -0.1em; }
.ft__l > span { display: block; transform: translateY(112%); transition: transform 1.5s var(--ease); }
.ft.is-in .ft__l > span { transform: none; }
.ft.is-in .ft__l:nth-child(2) > span { transition-delay: 0.1s; }
.ft__up { opacity: 0; transform: translateY(26px); transition: opacity 1.3s var(--ease), transform 1.3s var(--ease); transition-delay: calc(0.25s + var(--d, 0) * 80ms); }
.ft.is-in .ft__up { opacity: 1; transform: none; }
.ft__note { margin: 0; max-width: 46rem; font: 300 11.5px/1.7 var(--sans); color: var(--muted); }
.ft__meta { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; font: 400 10.5px/1.7 var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.ft__meta b { font-weight: 400; color: var(--text); }
.ft__cta { display: inline-flex; align-items: center; gap: 22px; padding: 20px 30px 19px; border: 1px solid color-mix(in srgb, var(--accent) 60%, transparent); border-radius: 99px; text-decoration: none;
  font: 500 clamp(0.95rem, 1.5vw, 1.4rem) var(--serif); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); will-change: transform;
  transition: background 0.7s var(--ease), color 0.7s var(--ease), border-color 0.7s var(--ease), gap 0.7s var(--ease); }
.ft__cta svg { width: 30px; height: 12px; }
.ft__cta:hover { background: var(--accent); border-color: var(--accent); color: var(--ink); gap: 30px; }

/* ----------------------------------------------------------- 01 light */
.ft-light { min-height: 100vh; min-height: 100svh; display: grid; grid-template-rows: 1fr auto auto; }
.ftl__bg { position: absolute; inset: 0; overflow: hidden; }
.ftl__bg img { position: absolute; left: 50%; top: 13%; height: 100%; width: auto; min-width: 100%; object-fit: cover; object-position: 50% 62%; transform: translateX(-50%) scale(var(--zoom, 1.16)); filter: brightness(var(--lit, 0.25)) saturate(1.1); transform-origin: 50% 60%; will-change: transform, filter; }
.ftl__bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11, 10, 9, 1) 0%, rgba(11, 10, 9, 0.86) 24%, rgba(11, 10, 9, 0.12) 50%, rgba(11, 10, 9, 0) 62%, rgba(11, 10, 9, 0.8) 100%); }
.ftl__in { position: relative; padding: 15vh var(--gutter) 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 4vw; }
.ftl__h2 { margin: 0; font: 400 clamp(1.9rem, 5.3vw, 5.8rem)/0.98 var(--serif); letter-spacing: -0.02em; white-space: nowrap; }
.ftl__side { display: grid; justify-items: end; gap: 3.4vh; padding-top: 1.2vh; text-align: right; }
.ftl__names { position: relative; display: flex; gap: 3.2vw; padding: 0 var(--gutter); margin-top: auto; white-space: nowrap; font: 500 clamp(0.7rem, 1vw, 0.95rem) var(--serif); letter-spacing: 0.3em; text-transform: uppercase; justify-content: space-between; }
.ftl__names span { color: var(--own); opacity: 0.85; }
.ftl__foot { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 4vw; padding: 3vh var(--gutter) 4vh; margin-top: 2.4vh; border-top: 1px solid var(--line); }
@media (max-width: 900px) {
  .ftl__in { grid-template-columns: 1fr; padding-top: 13vh; }
  .ftl__side { justify-items: start; text-align: left; }
  .ftl__bg img { top: 30%; height: 62%; }
  .ftl__h2 { white-space: normal; }
  .ftl__names { flex-wrap: wrap; gap: 8px 16px; justify-content: flex-start; }
  .ftl__foot { display: grid; }
}

/* --------------------------------------------------------- 02 strings */
.ft-strings { padding: 12vh 0 3.4vh; }
.fts__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 4vw; padding: 0 var(--gutter); }
.fts__h2 { margin: 0; font: 400 clamp(1.9rem, 5vw, 5.4rem)/0.98 var(--serif); letter-spacing: -0.02em; }
.fts__sound { display: inline-flex; align-items: center; gap: 12px; padding: 9px 16px; border: 1px solid var(--line); border-radius: 99px; font: 400 10px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); white-space: nowrap;
  transition: color 0.5s var(--ease), border-color 0.5s var(--ease); }
.fts__sound i { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); transition: background 0.5s var(--ease), box-shadow 0.5s var(--ease); }
.fts__sound[aria-pressed='true'] { color: var(--text); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
.fts__sound[aria-pressed='true'] i { background: var(--accent); box-shadow: 0 0 10px var(--accent); }
.fts__neck { position: relative; height: clamp(170px, 30vh, 300px); margin: 8vh 0 0; cursor: crosshair; touch-action: pan-y; }
.fts__neck canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.fts__hint { position: absolute; left: var(--gutter); top: -3.2vh; margin: 0; font: 400 10px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.fts__row { display: flex; align-items: center; justify-content: space-between; gap: 4vw; padding: 5vh var(--gutter) 0; }
.fts__foot { margin: 5vh var(--gutter) 0; padding-top: 2.6vh; border-top: 1px solid var(--line); }
@media (max-height: 640px) and (min-width: 901px) {
  .ft-strings { padding-top: 13vh; }
  .fts__h2 { font-size: 4.2vw; }
  .fts__neck { height: 150px; margin-top: 7vh; }
  .fts__row { padding-top: 3vh; }
  .fts__foot { margin-top: 3vh; }
  .fts__row .ft__cta { padding: 14px 24px 13px; }
}
@media (max-width: 900px) {
  .fts__head, .fts__row { display: grid; gap: 3vh; }
  .ft-strings { padding-top: 12vh; }
}

/* ---------------------------------------------------------- 03 ticket */
.ft-ticket { padding: 16vh var(--gutter) 4vh; }
.ftt__in { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 30rem); gap: 6vw; align-items: center; max-width: 1400px; margin: 0 auto; }
.ftt__h2 { margin: 0; font: 400 clamp(1.5rem, 3.35vw, 4.2rem)/1 var(--serif); letter-spacing: -0.02em; white-space: nowrap; }
.ftt__lede { margin: 3.4vh 0 4vh; max-width: 24rem; font: 300 12.5px/1.85 var(--sans); color: var(--muted); }
.ftt__stage { perspective: 1400px; }
.ftt__card { position: relative; padding: 26px 28px 24px; background: var(--bone); color: #1a1612; --ink-2: color-mix(in oklch, var(--pick, #9fe3f0) 55%, #1a1612);
  transform: rotate(-1.6deg) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transform-style: preserve-3d; transition: transform 0.9s var(--ease); box-shadow: 0 40px 80px rgba(0, 0, 0, 0.55);
  -webkit-mask: radial-gradient(circle 7px at 0 7.2rem, transparent 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle 7px at 100% 7.2rem, transparent 98%, #000) right / 51% 100% no-repeat;
  mask: radial-gradient(circle 7px at 0 7.2rem, transparent 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle 7px at 100% 7.2rem, transparent 98%, #000) right / 51% 100% no-repeat; }
.ftt__top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; height: 5rem; font: 400 9.5px var(--sans); letter-spacing: 0.16em; text-transform: uppercase; color: #6f675c; border-bottom: 1px dashed rgba(26, 22, 18, 0.3); margin-bottom: 20px; }
.ftt__top b { font: 500 15px var(--serif); letter-spacing: 0.34em; color: #1a1612; }
.ftt__q { margin: 0 0 10px; padding: 0; font: 400 9.5px var(--sans); letter-spacing: 0.16em; text-transform: uppercase; color: #6f675c; }
.ftt__set { margin: 0 0 18px; padding: 0; border: 0; min-width: 0; }
.ftt__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ftt__chips label { position: relative; cursor: pointer; }
.ftt__chips input { position: absolute; opacity: 0; pointer-events: none; }
.ftt__chips span { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; border: 1px solid rgba(26, 22, 18, 0.18); border-radius: 99px; font: 400 10px var(--sans); letter-spacing: 0.12em; text-transform: uppercase;
  transition: background 0.4s var(--ease), color 0.4s var(--ease), border-color 0.4s var(--ease); }
.ftt__chips span i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); }
.ftt__chips input:checked + span { background: #1a1612; border-color: #1a1612; color: var(--bone); }
.ftt__chips input:focus-visible + span { outline: 2px solid var(--ink-2); outline-offset: 2px; }
.ftt__two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.ftt__field { display: grid; gap: 6px; margin-bottom: 16px; font: 400 9.5px var(--sans); letter-spacing: 0.16em; text-transform: uppercase; color: #6f675c; }
.ftt__field input { width: 100%; padding: 8px 0; border: 0; border-bottom: 1px solid rgba(26, 22, 18, 0.3); background: none; font: 400 13px var(--sans); color: #1a1612; outline: none; border-radius: 0; }
.ftt__field input:focus { border-color: var(--ink-2); }
.ftt__send { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 4px; padding: 15px 18px; background: #1a1612; color: var(--bone); font: 500 12px var(--serif); letter-spacing: 0.16em; text-transform: uppercase;
  transition: background 0.5s var(--ease); }
.ftt__send svg { width: 26px; height: 10px; }
.ftt__send:hover { background: var(--ink-2); }
.ftt__held { margin: 12px 0 0; min-height: 1.4em; font: 400 10.5px var(--sans); letter-spacing: 0.06em; color: #4a433b; }
.ftt__plan { position: absolute; right: -4%; top: 4.6rem; height: 78%; width: auto; opacity: 0.11; pointer-events: none; overflow: visible; }
.ftt__plan path { fill: none; stroke: var(--ink-2); stroke-width: 2; vector-effect: non-scaling-stroke; }
.ftt__stamp { position: absolute; right: 22px; top: 5.6rem; padding: 9px 14px 8px; border: 2px solid var(--ink-2); border-radius: 6px; color: var(--ink-2); font: 500 17px/1 var(--serif); letter-spacing: 0.2em; text-transform: uppercase; text-align: center;
  transform: rotate(9deg) scale(2.2); opacity: 0; pointer-events: none; }
.ftt__stamp small { display: block; margin-top: 5px; font: 400 8.5px var(--sans); letter-spacing: 0.18em; }
.ftt__card.is-held .ftt__stamp { opacity: 0.9; transform: rotate(9deg) scale(1); transition: transform 0.28s cubic-bezier(0.2, 1.6, 0.4, 1), opacity 0.12s linear; }
.ftt__foot { max-width: 1400px; margin: 10vh auto 0; padding-top: 3vh; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 4vw; align-items: flex-end; }
@media (max-width: 900px) {
  .ftt__h2 { white-space: normal; }
  .ft-ticket { padding-top: 12vh; }
  .ftt__in { grid-template-columns: 1fr; gap: 5vh; }
  .ftt__card { padding: 22px 20px 20px; }
  .ftt__foot { display: grid; }
}
`;

const META = `<ul class="ft__meta"><li><b>KVELD Room 01</b></li><li>59.1244° N, 11.3875° E</li><li>Thursday to Saturday, by appointment</li></ul>`;
function arrive(section) {
  ScrollTrigger.create({ trigger: section, start: 'top 68%', once: true, onEnter: () => section.classList.add('is-in') });
}
/** The button leans toward the pointer. */
function magnet(el, k = 0.28) {
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * k, y: (e.clientY - r.top - r.height / 2) * k, duration: 0.6, ease: 'expo.out' }); });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }));
}

// --------------------------------------------------------------- 01 light ----
function light(section) {
  section.classList.add('ft-light');
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

// ------------------------------------------------------------- 02 strings ----
// Six open strings, low E at the top. A string is a sum of five standing
// waves whose mix depends on where it was plucked; each mode rings at its own
// rate and dies away. The sound, when switched on, is a plucked-string model
// (Karplus-Strong) rendered once per string.
const OPEN = [['E', 82.41, 0.046], ['A', 110.0, 0.036], ['D', 146.83, 0.026], ['G', 196.0, 0.017], ['B', 246.94, 0.013], ['E', 329.63, 0.01]];
function strings(section) {
  section.classList.add('ft-strings');
  section.innerHTML = `
    <div class="fts__head">
      <div><p class="eyebrow ft__up">03 · Visit</p><h2 class="fts__h2">${lines('Come and hear', 'them <em>played</em>.')}</h2></div>
      <button class="fts__sound ft__up" type="button" aria-pressed="false" style="--d: 2"><i></i><span>Sound off</span></button>
    </div>
    <div class="fts__neck ft__up" style="--d: 3"><p class="fts__hint">Run a hand across the strings</p><canvas></canvas></div>
    <div class="fts__row">
      <a class="ft__cta ft__up" href="#room" style="--d: 4"><span>Book the room</span>${ARROW}</a>
      <div class="ft__up" style="--d: 5">${META}</div>
    </div>
    <div class="fts__foot ft__up" style="--d: 6"><p class="ft__note">${NOTE}</p></div>`;
  const neck = $('.fts__neck', section), cv = $('canvas', neck), c = cv.getContext('2d'), btn = $('.fts__sound', section);
  let W = 0, H = 0, dpr = 1, raf = 0, audio = null, buffers = null;
  const S = OPEN.map(([, f, gauge], i) => ({ f, gauge, i, t0: -1e3, amp: 0, at: 0.3, lit: 0 }));
  const yOf = (i) => H * (0.14 + 0.72 * i / 5);
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = neck.clientWidth; H = neck.clientHeight; cv.width = W * dpr; cv.height = H * dpr; draw(performance.now() / 1000); };
  const colour = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#9fe3f0';

  function pluck(i, at, force = 1) {
    const s = S[i], now = performance.now() / 1000;
    s.t0 = now; s.at = Math.min(Math.max(at, 0.06), 0.94); s.amp = Math.min(6 + force * 13, 22) * (1 - i * 0.07); s.lit = 1;
    if (audio && buffers) {
      const src = audio.createBufferSource(), g = audio.createGain();
      src.buffer = buffers[i]; g.gain.value = Math.min(0.25 + force * 0.5, 0.8);
      src.connect(g).connect(audio.destination); src.start();
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function draw(now) {
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    // the frets, spaced the way they are on a neck (each a twelfth root of two closer), nut on the left
    c.strokeStyle = 'rgba(237, 230, 218, 0.1)'; c.lineWidth = 1;
    const L = W * 1.9;
    for (let n = 0; n <= 14; n++) { const x = L * (1 - Math.pow(2, -n / 12)) + (n ? 0 : 1); c.beginPath(); c.moveTo(x, yOf(0) - 12); c.lineTo(x, yOf(5) + 12); c.stroke(); }
    c.fillStyle = 'rgba(237, 230, 218, 0.14)';
    for (const n of [3, 5, 7, 9, 12]) { const x = L * (1 - (Math.pow(2, -n / 12) + Math.pow(2, -(n - 1) / 12)) / 2); c.beginPath(); c.arc(x, H / 2 + (n === 12 ? -18 : 0), 3.2, 0, 7); c.fill(); if (n === 12) { c.beginPath(); c.arc(x, H / 2 + 18, 3.2, 0, 7); c.fill(); } }
    const acc = colour();
    let alive = false;
    for (const s of S) {
      const y0 = yOf(s.i), dt = now - s.t0, p = s.at;
      c.beginPath();
      const live = s.amp * Math.exp(-dt * 1.5) > 0.12;
      if (live) {
        alive = true;
        for (let k = 0; k <= 90; k++) {
          const u = k / 90; let y = 0;
          for (let n = 1; n <= 5; n++) y += (Math.sin(n * Math.PI * p) / (n * n)) * Math.sin(n * Math.PI * u) * Math.cos(dt * (9 + s.i * 1.6) * n * 2.1) * Math.exp(-dt * (1.2 + n * 0.55));
          const yy = y0 + y * s.amp * 2.1; k ? c.lineTo(u * W, yy) : c.moveTo(u * W, yy);
        }
      } else { c.moveTo(0, y0); c.lineTo(W, y0); }
      s.lit = Math.exp(-dt * 1.6);
      c.lineWidth = 0.9 + s.gauge * 46; c.strokeStyle = 'rgba(237, 230, 218, 0.82)'; c.shadowColor = acc; c.shadowBlur = 22 * s.lit; c.stroke();
      if (s.lit > 0.03) { c.globalAlpha = s.lit * 0.9; c.strokeStyle = acc; c.stroke(); c.globalAlpha = 1; }
      c.shadowBlur = 0;
    }
    return alive;
  }
  function tick() { raf = draw(performance.now() / 1000) ? requestAnimationFrame(tick) : 0; }

  // a hand across the strings: each one it crosses is plucked where it crossed
  let last = null;
  neck.addEventListener('pointermove', (e) => {
    const r = neck.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (last) {
      for (let i = 0; i < 6; i++) { const ys = yOf(i); if ((last.y - ys) * (y - ys) < 0) pluck(i, x / W, Math.min(Math.abs(y - last.y) / 26, 1)); }
    }
    last = { x, y };
  });
  neck.addEventListener('pointerleave', () => { last = null; });
  neck.addEventListener('pointerdown', (e) => { const r = neck.getBoundingClientRect(), y = e.clientY - r.top; let best = 0; for (let i = 1; i < 6; i++) if (Math.abs(yOf(i) - y) < Math.abs(yOf(best) - y)) best = i; pluck(best, (e.clientX - r.left) / W, 0.9); });

  // sound is off until asked for
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on)); btn.lastElementChild.textContent = on ? 'Sound on' : 'Sound off';
    if (!on) { audio?.suspend(); audio = null; return; }
    audio = new (window.AudioContext || window.webkitAudioContext)();
    buffers ||= S.map((s) => {
      const sr = audio.sampleRate, n = Math.round(sr * 3.2), buf = audio.createBuffer(1, n, sr), d = buf.getChannelData(0), N = Math.round(sr / s.f), ring = new Float32Array(N);
      for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
      for (let i = 0, k = 0; i < n; i++) { const a = ring[k], b = ring[(k + 1) % N]; d[i] = a; ring[k] = (a + b) * 0.4985; k = (k + 1) % N; }
      return buf;
    });
    strum(0.12);
  });
  const strum = (gap = 0.07, force = 0.7) => S.forEach((s, i) => setTimeout(() => pluck(i, 0.24 + i * 0.03, force), i * gap * 1000));
  new ResizeObserver(size).observe(neck);
  size();
  magnet($('.ft__cta', section));
  arrive(section);
  // one strum as the strings come into view, so they are seen to be strings
  ScrollTrigger.create({ trigger: neck, start: 'top 62%', once: true, onEnter: () => strum(0.09, 0.8) });
  ScrollTrigger.create({ trigger: neck, start: 'bottom 88%', once: true, onEnter: () => S.slice().reverse().forEach((s, k) => setTimeout(() => pluck(s.i, 0.6 - k * 0.03, 0.6), k * 80)) });
}

// -------------------------------------------------------------- 03 ticket ----
function planPath(D, F) {
  const tail = Math.min(...D.body_outline.map((p) => p[0])), tip = Math.max(...D.neck.map((p) => p[0])), nut = D.nut[0];
  const fold = Math.min((F.top - (nut - tail) * IN) / ((tip - nut) * IN), 1);
  const X = (y) => (-y * IN) * F.ppm + F.w / 2, Y = (x) => (F.base + F.h / F.ppm - ((x > nut ? nut + (x - nut) * fold : x) - tail) * IN) * F.ppm;
  const d = (pts) => `M${pts.map((p) => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}Z`;
  return d(D.body_outline) + d(D.neck);
}
function ticket(section, { sheets, frames, front }) {
  section.classList.add('ft-ticket');
  const chips = (name, list, pick) => `<div class="ftt__chips">${list.map(([v, label, c], i) => `<label><input type="radio" name="${name}" value="${v}" ${i === pick ? 'checked' : ''}><span>${c ? `<i style="--c: ${c}"></i>` : ''}${label}</span></label>`).join('')}</div>`;
  section.innerHTML = `
    <div class="ftt__in">
      <div>
        <p class="eyebrow ft__up">03 · Visit</p>
        <h2 class="ftt__h2">${lines('Come and hear', 'them <em>played</em>.')}</h2>
        <p class="ftt__lede ft__up" style="--d: 2">The room takes one guest at a time, for an hour, with whichever of the seven you want on the stand. Fill in the card and we hold the hour.</p>
        <div class="ft__up" style="--d: 3">${META}</div>
      </div>
      <div class="ftt__stage ft__up" style="--d: 2">
        <form class="ftt__card" novalidate>
          <svg class="ftt__plan" viewBox="0 0 620 1520" aria-hidden="true"><path data-plan/></svg>
          <div class="ftt__top"><b>KVELD</b><span>Room 01 · Appointment</span><span>No. 0147</span></div>
          <fieldset class="ftt__set"><legend class="ftt__q">Which one do you want to hear?</legend>${chips('guitar', LINEUP.map((g) => [g.id, g.name, g.colour]), front)}</fieldset>
          <div class="ftt__two">
            <fieldset class="ftt__set"><legend class="ftt__q">Day</legend>${chips('day', [['Thursday', 'Thu'], ['Friday', 'Fri'], ['Saturday', 'Sat']], 1)}</fieldset>
            <fieldset class="ftt__set"><legend class="ftt__q">Hour</legend>${chips('hour', [['11:00', '11:00'], ['14:00', '14:00'], ['16:30', '16:30']], 1)}</fieldset>
          </div>
          <div class="ftt__two">
            <label class="ftt__field">Name<input type="text" name="name" autocomplete="name"></label>
            <label class="ftt__field">Email<input type="email" name="email" autocomplete="email"></label>
          </div>
          <button class="ftt__send" type="submit"><span>Hold the hour</span>${ARROW}</button>
          <p class="ftt__held" data-held aria-live="polite"></p>
          <div class="ftt__stamp" aria-hidden="true">Held<small>Room 01</small></div>
        </form>
      </div>
    </div>
    <div class="ftt__foot ft__up" style="--d: 5"><p class="ft__note">${NOTE}</p></div>`;
  const card = $('.ftt__card', section), plan = $('[data-plan]', section), held = $('[data-held]', section), stage = $('.ftt__stage', section);
  const setGuitar = () => {
    const id = card.elements.guitar.value, i = LINEUP.findIndex((g) => g.id === id);
    card.style.setProperty('--pick', LINEUP[i].colour);
    plan.setAttribute('d', planPath(sheets[i], frames[id]));
    card.classList.remove('is-held'); held.textContent = '';
  };
  setGuitar();
  card.addEventListener('change', (e) => { if (e.target.name === 'guitar') setGuitar(); else { card.classList.remove('is-held'); held.textContent = ''; } });
  // nothing is sent: the card is stamped, and says what it would have held
  card.addEventListener('submit', (e) => {
    e.preventDefault();
    const g = LINEUP.find((x) => x.id === card.elements.guitar.value);
    card.classList.remove('is-held'); void card.offsetWidth; card.classList.add('is-held');
    held.textContent = `${card.elements.day.value}, ${card.elements.hour.value}, with ${g.name} on the stand. ${SPECS[g.id].short}, ${SPECS[g.id].finish.toLowerCase()}.`;
  });
  // the card tips toward the pointer, like something held in the hand
  stage.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = stage.getBoundingClientRect(); card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 9}deg`); card.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 7}deg`); });
  stage.addEventListener('pointerleave', () => { card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); });
  arrive(section);
}

/** Build the chosen footer into the section. `front()` is the guitar in the centre of the room. */
export async function buildFooterOption(section, { sheet, front }) {
  const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
  section.classList.add('ft');
  if (FOOTER === 'light') return light(section);
  if (FOOTER === 'strings') return strings(section);
  const [sheets, frames] = await Promise.all([Promise.all(LINEUP.map((g) => sheet(g.id))), fetch('assets/shots/frames.json').then((r) => r.json())]);
  return ticket(section, { sheets, frames, front: front() });
}
