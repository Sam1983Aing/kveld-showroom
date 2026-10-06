/* ==========================================================================
   KVELD showroom · boot
   One loop: GSAP's ticker drives Lenis, ScrollTrigger and the WebGL frame.
   One easing family: expo.out for things arriving, expo.in for things
   leaving, expo.inOut for the ring (see showroom.js).
   ========================================================================== */
import { Showroom } from './showroom.js';
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';
import { drawBlueprint, specRows } from './blueprint.js';
import { BEATS } from './sequence.js';
import { initDraft, DRAFT } from './draft.js';     // the drawing comes first (Ink on Paper)
import { buildSpotlight } from './spotlight.js';
import { buildFooter } from './footer.js';         // 03 Visit (Last Light)
import { initCursor } from './cursor.js';

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

// The header steps aside while the page is read downward and comes back on the
// way up: fixed over the chapters it ran through their headlines and copy.
{
  const head = $('.site-head');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (y < 80 || y < lastY - 2) head.classList.remove('is-away'); else if (y > lastY + 2) head.classList.add('is-away');
    lastY = y;
  };
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });
}

/* ---------------------------------------------------------------------------
   2) The room
   ------------------------------------------------------------------------ */
const roomEl = $('.room');
const ui = {
  no: $('[data-no]'), name: $('[data-name]'), line: $('[data-line]'),
  view: $('[data-view]'), dots: $('[data-dots]'), closeup: $('[data-closeup]'),
};
let room = null, draft = null;
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

$$('[data-prev]').forEach((b) => b.addEventListener('click', () => room?.step(-1)));
$$('[data-next]').forEach((b) => b.addEventListener('click', () => room?.step(1)));
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
const roomChrome = () => $$('.room__copy, .room__title, .room__view, .room__controls, .room__scroll');

// Each guitar's sheet: the figures from the file its build writes, the words from specs.js
const sheets = new Map();
const sheet = (id) => sheets.get(id) || sheets.set(id, fetch(`assets/data/${id}.json`).then((r) => r.json())).get(id);
const cu = {
  no: $('[data-cu-no]'), after: $('[data-cu-after]'), name: $('[data-cu-name]'), claim: $('[data-cu-claim]'),
  figures: $('[data-cu-figures]'), specs: $('[data-specs]'), ours: $('[data-cu-ours]'), shade: $('[data-cu-shade]'),
};
async function fillCloseup(info) {
  const D = await sheet(info.id), S = SPECS[info.id] || {};
  cu.no.textContent = info.no;
  cu.after.textContent = S.after ? `After ${S.after}` : info.pattern;
  cu.name.textContent = info.name;
  cu.claim.innerHTML = S.claim || '';
  const places = (v) => (Number.isInteger(v) ? 0 : 2);
  cu.figures.innerHTML = [[D.scale, 'in', 'Scale'], [D.frets, '', 'Frets'], [D.radius, 'in', 'Radius'], [D.nut_width, 'in', 'Nut']]
    .map(([v, unit, k]) => `<li><b data-v="${v}" data-p="${places(v)}">${v.toFixed(places(v))}</b>${unit ? `<i>${unit}</i>` : '<i></i>'}<span>${k}</span></li>`).join('');
  cu.specs.innerHTML = [['Body', S.body], ['Neck', S.neck], ['Pickups', S.pickups], ['Bridge', S.bridge], ['Finish', S.finish]]
    .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  cu.ours.textContent = S.ours || '';
}
async function openCloseup() {
  if (!room || inCloseup) return;
  inCloseup = true;
  await fillCloseup(LINEUP[room.index]);
  lenis?.scrollTo(0, { immediate: true, force: true });
  lenis?.stop();
  roomEl.classList.add('is-closeup');
  room.enterCloseup();
  gsap.to(roomChrome(), { autoAlpha: 0, duration: 0.6, ease: 'expo.in', stagger: 0.02 });
  gsap.set(ui.closeup, { visibility: 'visible' });
  ui.closeup.setAttribute('aria-hidden', 'false');
  if (reduced) { gsap.set(cu.shade, { opacity: 1 }); gsap.set($$('.closeup__back, .closeup__panel > *', ui.closeup), { y: 0, opacity: 1 }); return; }
  // the room goes out behind the sheet, the name comes up out of its mask, the
  // rest follows row by row and the four figures count up to their numbers
  gsap.to(cu.shade, { opacity: 1, duration: 1.6, ease: 'expo.inOut', delay: 0.3 });
  gsap.fromTo($$('.closeup__back, .closeup__panel > *', ui.closeup), { y: 22, opacity: 0 },
    { y: 0, opacity: 1, duration: REVEAL, ease: EASE, stagger: 0.07, delay: 0.85 });
  gsap.fromTo(cu.name, { yPercent: 112 }, { yPercent: 0, duration: 1.5, ease: EASE, delay: 0.95 });
  gsap.fromTo($$('dt, dd', cu.specs), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.035, delay: 1.25 });
  $$('b', cu.figures).forEach((b, i) => {
    const to = +b.dataset.v, p = +b.dataset.p, n = { v: 0 };
    gsap.to(n, { v: to, duration: 1.5, ease: 'expo.out', delay: 1.1 + i * 0.08, onUpdate: () => { b.textContent = n.v.toFixed(p); } });
  });
}
function closeCloseup() {
  if (!inCloseup) return;
  inCloseup = false;
  room.exitCloseup();
  gsap.to(cu.shade, { opacity: 0, duration: 0.9, ease: 'expo.inOut' });
  gsap.to($$('.closeup__back, .closeup__panel > *', ui.closeup), { y: -12, opacity: 0, duration: 0.45, ease: 'expo.in',
    onComplete: () => { gsap.set(ui.closeup, { visibility: 'hidden' }); ui.closeup.setAttribute('aria-hidden', 'true'); } });
  gsap.to(roomChrome(), { autoAlpha: 1, duration: REVEAL, ease: EASE, stagger: 0.04, delay: 0.8 });
  roomEl.classList.remove('is-closeup');
  lenis?.start();
}
ui.view.addEventListener('click', openCloseup);
$('[data-back]').addEventListener('click', closeCloseup);
// from the sheet straight into the walk's first stop
$('[data-cu-walk]').addEventListener('click', () => { closeCloseup(); setTimeout(toFirstStop, 700); });

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
  gsap.from('.room__title > *, .room__view, .room__controls, .room__scroll, .site-head',
    { y: 14, opacity: 0, duration: REVEAL, ease: EASE, stagger: 0.06, delay: 1.3 });
}

async function boot() {
  // SplitText measures lines, so the faces have to be in first
  await Promise.all(FACES.map((f) => document.fonts.load(f))).catch(() => {});
  await document.fonts.ready;
  const dataP = sheet('floe');
  LINEUP.forEach((g) => sheet(g.id));        // the seven sheets are small: have them ready for the panel
  if (room) {
    try {
      await room.load(LINEUP);
    } catch (err) {
      console.error(err);
    }
    draft = initDraft(room);
    if (draft) { walkFor = -1; setWalkGuitar(room.index); }   // the chapter changes the walk's length
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
  if (reduced) room?.intro();        // a zero-length tween never calls its onStart: the lights stayed off
  const loader = $('.loader');
  gsap.to(loader, {
    autoAlpha: 0, duration: reduced ? 0 : 1.2, ease: 'expo.inOut', delay: reduced ? 0 : 0.2,
    onStart: () => room?.intro(),
    onComplete: () => { loader.remove(); lenis?.start(); },
  });
  introReveal();

  const D = await dataP;
  // pins are made in page order (the room, then anything below it), so each measures from the one before
  // The cream chapter with Floe's plan is what the page falls back on where the ink chapter cannot
  // run (reduced motion, no WebGL). With the ink chapter on, the drawing lives inside the pinned room.
  if (draft) $('#drawings').remove(); else buildDrawing(D);
  initWalk();
  await buildIndex();
  buildFooter($('#visit'));
  initReveals();
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
  if (reduced) return;
  const strokes = $$('[data-draw]', svg);
  gsap.set(strokes, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set($$('[data-fade]', svg), { opacity: 0 });
  gsap.timeline({ scrollTrigger: { trigger: '[data-plate]', start: 'top 90%', end: 'bottom 85%', scrub: 1.2 } })
    .to(strokes, { strokeDashoffset: 0, ease: 'none', stagger: { each: 0.012 }, duration: 0.6 })
    .to($$('[data-fade]', svg), { opacity: 1, ease: 'none', stagger: 0.02, duration: 0.2 }, '-=0.35');
}

/* ---------------------------------------------------------------------------
   6) The room as a place to choose (spotlight.js): picking one turns the ring
   ------------------------------------------------------------------------ */
const pickGuitar = (i) => { scrollTo('#room', { onComplete: () => room?.goTo(i) }); if (!lenis) room?.goTo(i); };
const buildIndex = () => buildSpotlight($('#guitars'), {
  sheet, pick: pickGuitar, reduced,
  scrollToY: (y) => (lenis ? lenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y })),
}).catch((err) => console.error(err));

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
  if (!$('[data-reveal]')) return;             // only the fallback chapter still has them
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
  // Scroll in the corner goes to the drawing (or the first stop) rather than past the walk,
  // and so does Drawings in the header once the drawing lives inside the pinned room
  $('[data-scroll-cue]').addEventListener('click', (e) => { e.preventDefault(); draft ? toDrawing() : toFirstStop(); });
  $$('.site-nav a[href="#drawings"]').forEach((a) => a.addEventListener('click', (e) => { if (draft) { e.preventDefault(); toDrawing(); } }));
  gsap.ticker.add(walkFrame);
}

function toFirstStop() {
  const to = Math.round(((draft ? DRAFT.len : BEATS.lift) + BEATS.travel + BEATS.hold * 0.4) * innerHeight);
  lenis ? lenis.scrollTo(to, { duration: 2.6 }) : window.scrollTo({ top: to });
}
function toDrawing() {
  const to = Math.round(DRAFT.hold * innerHeight);
  lenis ? lenis.scrollTo(to, { duration: 2.6 }) : window.scrollTo({ top: to });
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

initCursor({ room: () => room, draft: () => draft, reduced });
boot();
