/* ==========================================================================
   KVELD showroom · boot
   One loop: GSAP's ticker drives Lenis, ScrollTrigger and the WebGL frame.
   One easing family: expo.out for things arriving, expo.in for things
   leaving, expo.inOut for the ring (see showroom.js).
   ========================================================================== */
import { Showroom } from './showroom.js';
import { LINEUP } from './data.js';
import { drawBlueprint, specRows } from './blueprint.js';
import { BEATS } from './sequence.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = 'expo.out';
const FACES = ['400 32px Panchang', '500 32px Panchang', '300 16px "Martian Mono"', '400 16px "Martian Mono"'];
const REVEAL = 1.3;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------------------------------------------------------------------
   1) Lenis ↔ ScrollTrigger: one scroll position, driven from the GSAP ticker.
   Duration 1.4 gives the heavy, drifting feel. No second rAF loop anywhere.
   ------------------------------------------------------------------------ */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  window.__lenis = lenis;
}
const scrollTo = (target, opts = {}) => (lenis ? lenis.scrollTo(target, { duration: 1.8, ...opts }) : document.querySelector(target)?.scrollIntoView());

/* ---------------------------------------------------------------------------
   2) The room
   ------------------------------------------------------------------------ */
const roomEl = $('.room');
const ui = {
  no: $('[data-no]'), name: $('[data-name]'), line: $('[data-line]'),
  view: $('[data-view]'), dots: $('[data-dots]'), closeup: $('[data-closeup]'),
};
let room = null;
try {
  room = new Showroom($('.room__gl'), { onProgress, onChange });
  room.reduced = reduced;
  window.__room = room;       // handy from the console while tuning
} catch (err) {
  console.warn('WebGL unavailable', err);
  document.documentElement.classList.add('no-webgl');
}

LINEUP.forEach((g, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" aria-label="${g.name}" style="--dot: ${g.colour}"></button>`;
  li.firstChild.addEventListener('click', () => room?.goTo(i));
  ui.dots.appendChild(li);
});

// The button sits on the centre pedestal's front face, but never lower than
// a clear gap above the arrows: on short windows the pedestal lands on them.
function setStageY() {
  if (!room) return;
  const view = ui.view.getBoundingClientRect(), controls = $('.room__controls').getBoundingClientRect();
  const floor = controls.top - roomEl.getBoundingClientRect().top - 22 - view.height / 2;
  document.documentElement.style.setProperty('--stage-y', `${Math.round(Math.min(room.stageScreenY(), floor))}px`);
}

let firstChange = true;
function onChange(i, info) {
  setWalkGuitar(i);
  $$('button', ui.dots).forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
  const apply = () => {
    ui.no.textContent = info.no;
    ui.name.textContent = info.name;
    ui.line.textContent = info.line;
    ui.view.disabled = !info.real;
    ui.view.querySelector('span').textContent = info.real ? 'View guitar' : 'In the workshop';
    ui.view.classList.toggle('is-bench', !info.real);
  };
  if (firstChange || reduced) { firstChange = false; apply(); return; }
  gsap.timeline({ overwrite: true })
    .to([ui.name, ui.line, ui.no], { yPercent: -110, opacity: 0, duration: 0.42, ease: 'expo.in', stagger: 0.03 })
    .add(apply)
    .fromTo([ui.name, ui.line, ui.no], { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: EASE, stagger: 0.05 });
}

$('[data-prev]').addEventListener('click', () => room?.step(-1));
$('[data-next]').addEventListener('click', () => room?.step(1));
addEventListener('keydown', (e) => {
  if (!room) return;
  if (e.key === 'Escape' && inCloseup) return closeCloseup();
  if (inCloseup || scrollY > innerHeight * 0.6) return;
  if (e.key === 'ArrowRight') room.step(1);
  if (e.key === 'ArrowLeft') room.step(-1);
});

/* ---------------------------------------------------------------------------
   3) Close-up: the camera walks up to the guitar, everything else dims
   ------------------------------------------------------------------------ */
let inCloseup = false;
const roomChrome = () => $$('.room__copy, .room__title, .room__view, .room__controls, .room__foot, .room__scroll');
function openCloseup() {
  if (!room || inCloseup) return;
  inCloseup = true;
  lenis?.scrollTo(0, { immediate: true, force: true });
  lenis?.stop();
  roomEl.classList.add('is-closeup');
  room.enterCloseup();
  gsap.to(roomChrome(), { autoAlpha: 0, duration: 0.6, ease: 'expo.in', stagger: 0.02 });
  gsap.set(ui.closeup, { visibility: 'visible' });
  ui.closeup.setAttribute('aria-hidden', 'false');
  gsap.fromTo($$('.closeup__back, .closeup__panel > *', ui.closeup), { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: REVEAL, ease: EASE, stagger: 0.07, delay: 0.9 });
}
function closeCloseup() {
  if (!inCloseup) return;
  inCloseup = false;
  room.exitCloseup();
  gsap.to($$('.closeup__back, .closeup__panel > *', ui.closeup), { y: -12, opacity: 0, duration: 0.45, ease: 'expo.in',
    onComplete: () => { gsap.set(ui.closeup, { visibility: 'hidden' }); ui.closeup.setAttribute('aria-hidden', 'true'); } });
  gsap.to(roomChrome(), { autoAlpha: 1, duration: REVEAL, ease: EASE, stagger: 0.04, delay: 0.8 });
  roomEl.classList.remove('is-closeup');
  lenis?.start();
}
ui.view.addEventListener('click', openCloseup);
$('[data-back]').addEventListener('click', closeCloseup);

/* ---------------------------------------------------------------------------
   4) Loader: real download progress of the model, then the lights come on
   ------------------------------------------------------------------------ */
const bar = $('.loader__bar span');
const count = $('[data-count]');
function onProgress(p) {
  gsap.to(bar, { scaleX: p, duration: 0.4, ease: EASE, overwrite: true });
  count.textContent = String(Math.round(p * 100)).padStart(3, '0');
}

function splitLines(el) {
  return SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
}

function introReveal() {
  const h1 = splitLines($('.room__h1'));
  if (reduced) return;
  gsap.from(h1.lines, { yPercent: 115, duration: 1.6, ease: EASE, stagger: 0.12, delay: 0.6 });
  gsap.from('[data-intro]', { y: 18, opacity: 0, duration: REVEAL, ease: EASE, stagger: 0.12, delay: 1.0 });
  gsap.from('.room__title > *, .room__view, .room__controls, .room__foot, .room__scroll, .site-head',
    { y: 14, opacity: 0, duration: REVEAL, ease: EASE, stagger: 0.06, delay: 1.3 });
}

async function boot() {
  // SplitText measures lines, so the faces have to be in first
  await Promise.all(FACES.map((f) => document.fonts.load(f))).catch(() => {});
  await document.fonts.ready;
  const dataP = fetch('assets/data/floe.json').then((r) => r.json());
  if (room) {
    try {
      await room.load(LINEUP, 'assets/models/floe.glb');
    } catch (err) {
      console.error(err);
    }
    setStageY();
    // the page accent follows the guitar in the centre, same colour as the room's light
    let accent = '';
    gsap.ticker.add(() => {
      room.render();
      const hex = room.accentHex;
      if (hex !== accent) { accent = hex; document.documentElement.style.setProperty('--accent', hex); }
    });
    new IntersectionObserver(([e]) => { room.running = e.isIntersecting; }).observe(roomEl);
  }
  onProgress(1);
  const loader = $('.loader');
  gsap.to(loader, {
    autoAlpha: 0, duration: reduced ? 0 : 1.2, ease: 'expo.inOut', delay: reduced ? 0 : 0.2,
    onStart: () => room?.intro(),
    onComplete: () => { loader.remove(); lenis?.start(); },
  });
  introReveal();

  const D = await dataP;
  buildDrawing(D);
  buildIndex();
  initReveals();
  initWalk();
  ScrollTrigger.refresh();
}

/* ---------------------------------------------------------------------------
   5) The drawing: the plan draws itself as you scroll past it
   ------------------------------------------------------------------------ */
function buildDrawing(D) {
  const svg = drawBlueprint($('[data-blueprint]'), D);
  const specs = $('[data-spec-list]');
  specRows(D).forEach(([k, v], i) => {
    const li = document.createElement('li');
    li.setAttribute('data-reveal', '');
    li.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="k">${k}</span><span class="v">${v}</span>`;
    specs.appendChild(li);
  });
  const dl = $('[data-specs]');
  [['Scale', '25.5 in'], ['Radius', '7.25 in'], ['Frets', '21'], ['Nut', '1.65 in'], ['Body', 'Swamp ash, two-piece'],
    ['Neck', 'One-piece maple'], ['Finish', 'White blonde'], ['Hardware', 'Nickel, brass saddles']]
    .forEach(([k, v]) => { dl.insertAdjacentHTML('beforeend', `<dt>${k}</dt><dd>${v}</dd>`); });

  if (reduced) return;
  const strokes = $$('[data-draw]', svg);
  gsap.set(strokes, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set($$('[data-fade]', svg), { opacity: 0 });
  gsap.timeline({ scrollTrigger: { trigger: '[data-plate]', start: 'top 90%', end: 'bottom 85%', scrub: 1.2 } })
    .to(strokes, { strokeDashoffset: 0, ease: 'none', stagger: { each: 0.012 }, duration: 0.6 })
    .to($$('[data-fade]', svg), { opacity: 1, ease: 'none', stagger: 0.02, duration: 0.2 }, '-=0.35');
}

/* ---------------------------------------------------------------------------
   6) The index: numbered rows that turn the ring when clicked
   ------------------------------------------------------------------------ */
function buildIndex() {
  const list = $('[data-index]');
  LINEUP.forEach((g, i) => {
    const li = document.createElement('li');
    li.setAttribute('data-reveal', '');
    li.innerHTML = `<button class="index__row" type="button" style="--own: ${g.colour}">
        <span class="index__no">${g.no}</span>
        <span class="index__name">${g.name}</span>
        <span class="index__meta">${g.pattern}</span>
        <span class="index__meta">${g.woods}</span>
        <span class="index__state ${g.real ? 'is-floor' : ''}">${g.real ? 'On the floor' : 'In the workshop'}</span>
      </button>`;
    li.firstElementChild.addEventListener('click', () => {
      scrollTo('#room', { onComplete: () => room?.goTo(i) });
      if (!lenis) room?.goTo(i);
    });
    list.appendChild(li);
  });
}

/* ---------------------------------------------------------------------------
   7) Reveals and headline splits for the chapters below the room
   ------------------------------------------------------------------------ */
function initReveals() {
  if (reduced) return;
  $$('main [data-split]').forEach((el) => {
    if (el.closest('.room')) return;
    const s = splitLines(el);
    gsap.from(s.lines, { yPercent: 115, duration: 1.5, ease: EASE, stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 82%' } });
  });
  gsap.set('[data-reveal]', { y: 36, opacity: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: REVEAL, ease: EASE, stagger: 0.07, overwrite: true }),
  });
}

/* ---------------------------------------------------------------------------
   8) The walk: the room pins, and scrolling lifts the guitar in the centre
   off its plinth and takes the camera along it (sequence.js). The stops and
   their copy are data per guitar (stops.js); this only shows the copy.
   ------------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, '0');
const walkUI = {
  el: $('[data-walk]'), no: $('[data-walk-no]'), of: $('[data-walk-of]'), label: $('[data-walk-label]'),
  title: $('[data-walk-title]'), text: $('[data-walk-text]'), ticker: $('[data-walk-ticker]'), bar: $('[data-walk-bar]'),
  model: $('[data-walk-model]'), copy: $('.walk__copy'), rail: $('.walk__rail'), shade: $('.walk__shade'), roomUI: $('.room__ui'),
};
let walkST = null, walkStops = [], walkLen = 0, walkStop = -2, walkFor = -1;

function setWalkGuitar(i) {
  if (!room || i === walkFor) return;
  walkFor = i;
  const info = LINEUP[i];
  walkStops = room.walk.stopsFor(info);
  walkLen = room.walk.length(info);
  walkUI.of.textContent = pad(walkStops.length);
  walkUI.model.textContent = `${info.name} · ${info.real ? 'Up close' : 'In the workshop'}`;
  walkUI.ticker.innerHTML = walkStops.map((s, k) => `<li data-n="${pad(k + 1)}">${s.label}</li>`).join('');
  walkStop = -2;
  if (walkST) ScrollTrigger.refresh();     // a maquette's walk is shorter, so the pin is too
}

function initWalk() {
  if (!room) return;
  setWalkGuitar(room.index);
  walkST = ScrollTrigger.create({
    trigger: roomEl, start: 'top top', end: () => `+=${Math.round(walkLen * innerHeight)}`, pin: true, anticipatePin: 1,
    onUpdate: (self) => {
      const at = self.progress * walkLen;
      // reduced motion: no camera travel, the walk cuts from stop to stop
      room.walkTo = reduced ? room.walk.snap(LINEUP[walkFor], at) : at;
    },
  });
  // Scroll in the corner goes to the first stop rather than past the walk
  $('[data-scroll-cue]').addEventListener('click', (e) => {
    e.preventDefault();
    const to = Math.round((BEATS.lift + BEATS.travel + BEATS.hold * 0.4) * innerHeight);
    lenis ? lenis.scrollTo(to, { duration: 2.6 }) : window.scrollTo({ top: to });
  });
  gsap.ticker.add(walkFrame);
}

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
function walkFrame() {
  const W = room.walkState;
  const lift = W ? W.lift : 0;
  // the room's own chrome leaves as the guitar lifts
  const roomA = 1 - clamp01(lift / 0.45);
  walkUI.roomUI.style.opacity = roomA;
  walkUI.roomUI.style.visibility = roomA > 0 ? '' : 'hidden';
  walkUI.el.style.visibility = lift > 0 ? 'visible' : 'hidden';
  if (!W) return;

  if (W.stop !== walkStop) {
    walkStop = W.stop;
    const s = walkStops[W.stop];
    walkUI.ticker.querySelectorAll('li').forEach((li, k) => li.classList.toggle('is-on', k === W.stop));
    if (s) {
      walkUI.no.textContent = pad(W.stop + 1);
      walkUI.label.textContent = s.label;
      walkUI.title.innerHTML = s.title;
      walkUI.text.textContent = s.text;
    }
  }
  // the copy rides the scroll: the title slides up out of its mask, the rest fades
  const c = W.stop >= 0 ? W.copy : 0;
  walkUI.title.style.transform = `translate3d(0, ${((1 - c) * 108).toFixed(2)}%, 0)`;
  walkUI.copy.style.opacity = Math.min(c * 1.6, 1);
  walkUI.text.style.transform = `translate3d(0, ${((1 - c) * 14).toFixed(1)}px, 0)`;
  walkUI.text.style.opacity = clamp01((c - 0.25) / 0.75);
  walkUI.rail.style.opacity = clamp01((lift - 0.5) / 0.5) * (1 - W.outro);
  walkUI.shade.style.opacity = clamp01((lift - 0.5) / 0.5) * (1 - W.outro);
  walkUI.bar.style.transform = `scaleX(${clamp01(room.walkAt / walkLen).toFixed(4)})`;
}

let resizeT;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { room?.layout(); setStageY(); ScrollTrigger.refresh(); }, 120);
});

boot();
