// 02 · Hear them (V7, 2026-10-23). Was "The room", a place to choose a guitar ("Spotlight", picked
// 2026-10-06), and choosing one took you back up to the hero. Sam found that flow poor: the hero
// already picks a guitar. Now 02 has its own job, you hear them. A click on a name plays that guitar's
// phrase (voices.js) and turns the sound on, after which pointing at a name plays it too. The arch of
// light behind the guitar is the hero's halo, and it ripples with the sound (drawArch). The room is
// still one small link away ("See it in the room").
//
// Seven names on the left; on the right the one in the light: its still, its
// outline drawn behind it, a short sheet, a price and the way to it in the room.
// Pointing at a name puts that guitar in the light, and it stays there. The
// page scrolls past the section like any other. (Until 2026-10-07 the section
// held for 3.4 screens and scrolling stepped through the seven; Sam wanted the
// choice to follow the pointer, not the scroll.) On a touch screen a tap on a
// name or a dot does it, and so does a swipe across the guitar.
//
// Stills: assets/shots/<id>-hero.webp (tools/product_shots.mjs). The outline
// is plotted from assets/data/<id>.json with frames.json, which says where a
// front still sits in the guitar's own frame. Words and prices: specs.js.
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';
import { createVoices } from './voices.js';

const { gsap } = window;
const IN = 0.0254;
const N = LINEUP.length;
const PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>';
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
 * takes the ring to that guitar, `current()` is the guitar the room is on.
 */
export async function buildSpotlight(section, { sheet, pick, current = () => 0, reduced }) {
  const [sheets, frames] = await Promise.all([Promise.all(LINEUP.map((g) => sheet(g.id))), fetch('assets/shots/frames.json').then((r) => r.json())]);
  const list = LINEUP.map((info, i) => ({ info, S: SPECS[info.id] || {}, D: sheets[i], scale: `${+sheets[i].scale.toFixed(2)} in` }));
  const F0 = frames[LINEUP[0].id];

  section.innerHTML = `
    <div class="spot__pin">
      <div class="spot__left">
        <p class="eyebrow">02 · Hear them</p>
        <h2 class="spot__h2">Seven voices in one room. Point at one to <em>hear</em> it.</h2>
        <ol class="spot__names">${list.map(({ info }, i) => `
          <li style="--own: ${info.colour}; --i: ${i}"><button type="button" data-i="${i}" aria-label="${info.name}, ${info.pattern}. Play it"><span class="spot__no">${info.no}</span><span class="spot__t">${info.name}</span><span class="spot__k">${info.pattern}</span></button></li>`).join('')}
        </ol>
        <ol class="spot__dots">${list.map(({ info }, i) => `<li><button type="button" data-step="${i}" style="--own: ${info.colour}" aria-label="${info.name}"></button></li>`).join('')}</ol>
        <button class="spot__sound" type="button" data-sound aria-pressed="false"><i class="spot__bars" aria-hidden="true"><b></b><b></b><b></b><b></b></i><span data-sound-label>Sound off</span></button>
      </div>
      <div class="spot__stage">
        <i class="spot__halo"></i>
        <canvas class="spot__arch" aria-hidden="true"></canvas>
        <span class="spot__num" data-num aria-hidden="true">01</span>
        <svg class="spot__plan" viewBox="0 0 ${F0.w} ${F0.h}" aria-hidden="true"><path pathLength="1" data-plan/></svg>
        <div class="spot__imgs">${list.map(({ info, S }, i) => `<img src="assets/shots/${info.id}-hero.webp" alt="${info.name}, ${S.finish}" data-pick="${i}" decoding="async" fetchpriority="low">`).join('')}</div>
        <div class="spot__sheet">
          <div data-swap>
            <p class="spot__after" data-after></p>
            <p class="spot__claim" data-claim></p>
            <dl class="spot__facts" data-facts></dl>
          </div>
          <div class="spot__buy"><p class="spot__price" data-price></p><button class="spot__go" type="button" data-play>${PLAY}<span data-play-label>Hear Floe</span></button></div>
          <button class="spot__room" type="button" data-go><span>See it in the room</span>${ARROW}</button>
        </div>
      </div>
    </div>`;

  const names = $('.spot__names', section);
  const rows = $$('li', names), imgs = $$('.spot__imgs img', section), dots = $$('.spot__dots button', section);
  const el = { num: $('[data-num]', section), plan: $('[data-plan]', section), after: $('[data-after]', section), claim: $('[data-claim]', section),
    facts: $('[data-facts]', section), price: $('[data-price]', section), swap: $('[data-swap]', section), playLabel: $('[data-play-label]', section) };

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
      el.playLabel.textContent = `Hear ${info.name}`;
    };
    if (first || reduced) { fill(); return; }
    // the outline redraws behind the guitar, the words step out and back in
    gsap.fromTo(el.plan, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'expo.out', overwrite: true });
    gsap.timeline({ overwrite: true }).to([el.swap, el.num, el.price], { opacity: 0, y: -8, duration: 0.22, ease: 'power2.in' }).add(fill)
      .fromTo([el.num, el.swap, el.price], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
  }

  show(0);
  // the section opens on the guitar the room was left on
  const arrive = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    show(current());
    section.classList.add('is-in');
    arrive.disconnect();
  }, { rootMargin: '0px 0px -28% 0px' });
  arrive.observe(section);

  /* --- the sound. Off until a click: browsers only let sound start from one, and a page that plays on
     its own is rude. A click on a name, the guitar, Hear or the sound button turns it on. */
  const voices = createVoices();
  const soundBtn = $('[data-sound]', section), soundLabel = $('[data-sound-label]', section);
  let soundOn = false, dwell = 0;
  const setSound = (v) => {
    soundOn = v;
    soundBtn.setAttribute('aria-pressed', String(v));
    soundLabel.textContent = v ? 'Sound on' : 'Sound off';
    if (!v) voices.stop();
  };
  const play = (i) => { if (!soundOn) { voices.unlock(); setSound(true); } show(i); voices.play(list[i].info.id).then(() => { (window.__plays ||= []).push([list[i].info.id, Date.now()]); wake(); }); };
  soundBtn.addEventListener('click', () => { if (soundOn) setSound(false); else play(on); });
  $('[data-play]', section).addEventListener('click', () => play(on));
  $('[data-go]', section).addEventListener('click', () => { voices.stop(); pick(on); });

  rows.forEach((r, i) => {
    const b = r.firstElementChild;
    // pointing lights a name, and plays it once the sound is on (after a short pause, so sweeping
    // the pointer down the list does not play all seven)
    b.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      show(i);
      clearTimeout(dwell);
      if (soundOn) dwell = setTimeout(() => { if (on === i && voices.playing !== list[i].info.id) play(i); }, 160);
    });
    b.addEventListener('pointerleave', () => clearTimeout(dwell));
    b.addEventListener('focus', () => show(i));
    b.addEventListener('click', () => play(i));
  });
  dots.forEach((d, i) => d.addEventListener('click', () => (soundOn ? play(i) : show(i))));
  const stage = $('.spot__imgs', section);
  stage.addEventListener('click', () => play(on));
  // a swipe across the guitar goes to the next or the one before
  let x0 = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (x0 !== null && Math.abs(dx) > 44) { const j = (on + (dx < 0 ? 1 : -1) + N) % N; soundOn ? play(j) : show(j); e.preventDefault(); }
    x0 = null;
  });
  // out of sight, out of hearing
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) voices.stop(0.6); }, { threshold: 0.15 }).observe(section);

  /* --- the arch: the hero's halo behind the guitar, drawn here in 2D. At rest it is a still line of
     light. While a guitar plays it carries the sound: the waveform runs along it, pinned at both ends
     like a string, as big as the sound is loud. */
  const canvas = $('.spot__arch', section), g2 = canvas.getContext('2d');
  const SPAN = Math.PI * 1.32, PTS = 220, wave = new Float32Array(PTS);
  let box = null, level = 0, running = false, visible = false;
  const size = () => {
    const sr = $('.spot__stage', section).getBoundingClientRect(), ir = stage.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(sr.width * dpr); canvas.height = Math.round(sr.height * dpr);
    box = { dpr, cx: ir.left - sr.left + ir.width / 2, cy: ir.top - sr.top + ir.height * 0.6, R: ir.height * 0.35 };
  };
  function drawArch() {
    if (!box) size();
    const { dpr, cx, cy, R } = box;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.clearRect(0, 0, canvas.width, canvas.height);
    const colour = getComputedStyle(section).getPropertyValue('--own').trim() || '#9fe3f0';
    const hex = parseInt(colour.slice(1), 16), mix = (c) => Math.round(c + (255 - c) * 0.45);
    const core = `rgb(${mix(hex >> 16)}, ${mix((hex >> 8) & 255)}, ${mix(hex & 255)})`;
    const live = voices.playing ? voices.wave(wave) : (wave.fill(0), 0);
    level += ((voices.playing ? live : 0) - level) * 0.25;
    const amp = R * 0.13 * level;
    const path = () => {
      g2.beginPath();
      for (let k = 0; k <= PTS; k++) {
        const t = k / PTS, th = -Math.PI / 2 - SPAN / 2 + t * SPAN;
        const r = R + amp * (wave[Math.min(k, PTS - 1)] / Math.max(level, 0.08)) * Math.sin(Math.PI * t) * 0.6;
        const x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
        k ? g2.lineTo(x, y) : g2.moveTo(x, y);
      }
    };
    path();
    g2.lineCap = 'round';
    const glow = 0.55 + 0.45 * Math.min(level * 1.4, 1);
    for (const [w, a] of [[14, 0.06], [7, 0.12], [3, 0.35]]) { g2.strokeStyle = colour; g2.globalAlpha = a * glow; g2.lineWidth = w; g2.stroke(); }
    g2.globalAlpha = 0.55 + 0.45 * glow; g2.lineWidth = 1.4; g2.strokeStyle = core; g2.stroke();
    g2.globalAlpha = 1;
  }
  function loop() {
    drawArch();
    soundBtn.classList.toggle('is-playing', !!voices.playing);
    if (visible && (voices.playing || level > 0.004)) requestAnimationFrame(loop); else { running = false; level = 0; drawArch(); }
  }
  function wake() { if (!running && visible) { running = true; requestAnimationFrame(loop); } }
  // the phrases are rendered ahead, one at a time when the page is idle, so a click plays at once
  let ahead = false;
  const renderAhead = () => {
    if (ahead) return; ahead = true;
    const ids = [on, ...list.keys()].map((k) => list[k].info.id).filter((id, k, a) => a.indexOf(id) === k);
    const next = () => { const id = ids.shift(); if (!id) return; voices.render(id).then(() => (window.requestIdleCallback || setTimeout)(next, { timeout: 600 })); };
    next();
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { size(); drawArch(); renderAhead(); } }, { rootMargin: '10% 0px' }).observe(section);
  addEventListener('resize', () => { box = null; if (visible) drawArch(); });
  // the colour follows the guitar: redraw the resting arch when it changes
  new MutationObserver(() => { if (visible && !running) drawArch(); }).observe(section, { attributes: true, attributeFilter: ['style'] });
  window.__voices = voices;            // for tools/voices_render.mjs and the console
}
