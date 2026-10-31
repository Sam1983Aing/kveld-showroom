// 03 · How to order (V7, 2026-10-24, adapted to the page on 2026-10-31). Between Hear them and the footer:
// the buyer's side of the weeks the workshop shows. A light chapter, on the same paper as the drawing,
// because ordering one starts on paper too. One view, pinned while the scroll plays it (Sam: "everything in
// the same view"): on the left the head, the seven with their weeks and starting prices, and Book a visit.
// On the right the order slip (Sam's pick from three), and it is made out for one guitar: the one the room
// was left on, or any of the seven you point at. As it fills in, that guitar is drawn on it the way the
// drawing chapter draws: the outline traced, the measures and parts set out, the frets and the finish, the
// strings. Down the slip runs the tour's ruler, with the same ring, dot and sliding light. Each step keeps
// one of the guitars' colours (Sam's note of 2026-10-24), now as ink and light rather than highlighter and
// pills. The words rise out of a mask like the tour's. Then it is signed and stamped "Bench reserved".
// Phones: no pin, the slip fills as it scrolls past. Reduced motion: the slip is filled in.
// The terms (deposit, delivery, the Friday pictures) are invented, like the maker. Styles: "03 · how to order".
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';
import { riseOver } from './handoff.js';

const { gsap, ScrollTrigger } = window;
const NS = 'http://www.w3.org/2000/svg';
const IN = 0.0254;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const euros = (n) => `€${Math.round(n).toLocaleString('en-US')}`;
const priceOf = (S) => +S.price.replace(/\D/g, '');

// each step takes one of the guitars' own colours (data.js): Sedge, Rowan, Moss, Floe
const STEPS = [
  { colour: '#e8c14a', title: 'Come and <em>play</em>.', text: () => 'An hour in the room in Halden. All seven plugged in, nobody selling. Play until one answers back.', meta: () => 'Free · Thursday to Saturday' },
  { colour: '#ff5a40', title: 'Make it <em>yours</em>.', text: () => 'Choose the finish and the carve of the neck with the maker who builds it. They measure your hand and hear you play.', meta: (S) => `${euros(priceOf(S) * 0.3)} holds a bench` },
  { colour: '#a6d84a', title: 'Built on one <em>bench</em>.', text: (S, g) => `One guitar at a time: ${g.name} takes ${S.weeks} weeks. A picture from the bench every Friday.`, meta: (S) => `${S.weeks} weeks` },
  { colour: '#4fb8cc', title: 'Take it <em>home</em>.', text: () => 'Played in the room for a day before it is yours. Collect it in Halden, or it comes in a fitted case.', meta: (S) => `${euros(priceOf(S) * 0.7)} on collection` },
];

/** A guitar's plan on the slip, in the drawing chapter's ink, as the groups the scroll draws one by one. */
function plotPlan(svg, D, flat, F, id) {
  svg.textContent = '';
  const tail = Math.min(...D.body_outline.map((p) => p[0])), tip = D.nut[0] + D.headstock_length, half = D.body.width / 2;
  // upright on the slip with the head at the top. Lying down on a phone, across the top of it
  // a head that leans back is shorter seen from the front, as in the still it has to line up with
  const nut = D.nut[0], fold = Math.min((F.top - (nut - tail) * IN) / ((tip - nut) * IN), 1), up = (x) => (x > nut ? nut + (x - nut) * fold : x);
  const X = (x, y) => (flat ? up(x) : -y), Y = (x, y) => (flat ? -y : -up(x));
  const span = tip - tail, pad = 2.1;
  svg.setAttribute('viewBox', flat ? `${tail - pad} ${-half - 1.6} ${span + pad * 2} ${half * 2 + 3.2}` : `${-half - pad} ${-tip - 0.8} ${half * 2 + pad * 2} ${span + 2.6}`);
  const f = (v) => (+v).toFixed(2);
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const line = (pts, close = true) => 'M' + pts.map(([x, y]) => `${f(X(x, y))} ${f(Y(x, y))}`).join('L') + (close ? 'Z' : '');
  const G = {};
  // the finish: the guitar itself (its front still) comes through from the tail, under the ink, the way the
  // drawing chapter's plan turns into the guitar. It lines up with the plan through frames.json.
  const clipId = `slip-clip-${Math.random().toString(36).slice(2, 7)}`;
  const defs = el('defs', {}, svg), clip = el('clipPath', { id: clipId }, defs);
  G.wipe = el('rect', { x: f(flat ? tail - 1 : -half - 1), y: f(flat ? -half - 1 : -tail + 1), width: f(flat ? 0 : half * 2 + 2), height: f(flat ? half * 2 + 2 : 0) }, clip);
  G.span = span + 2; G.flat = flat; G.tail = tail; G.half = half;
  const k = F.ppm * IN, top = (F.base + F.h / F.ppm) / IN + tail;
  const wrap = el('g', { 'clip-path': `url(#${clipId})` }, svg);
  G.img = el('image', { href: `assets/shots/${id}-front.webp`, width: F.w, height: F.h, class: 'pl-img',
    transform: flat ? `matrix(0 ${1 / k} ${-1 / k} 0 ${top} ${-F.w / (2 * k)})` : `matrix(${1 / k} 0 0 ${1 / k} ${-F.w / (2 * k)} ${-top})` }, wrap);
  const strokes = (cls) => { const g = el('g', { class: cls }, svg); g.items = []; return g; };
  const add = (g, tag, attrs) => { const e = el(tag, { ...attrs, pathLength: 1 }, g); g.items.push(e); return e; };
  G.parts = strokes('pl-2');
  for (const k of ['pickguard', 'pickguard_slot', 'bridge_plate', 'bridge_pickup', 'control_plate']) if (D[k]?.length > 2) add(G.parts, 'path', { d: line(D[k]) });
  D.knobs?.forEach(([x, y]) => add(G.parts, 'circle', { cx: f(X(x, y)), cy: f(Y(x, y)), r: 0.37 }));
  D.posts?.forEach(([x, y]) => add(G.parts, 'circle', { cx: f(X(x, y)), cy: f(Y(x, y)), r: 0.17 }));
  G.frets = strokes('pl-3');
  D.fret_x?.forEach((x, i) => { const [a, b] = D.fret_span[i]; add(G.frets, 'line', { x1: f(X(x, a)), y1: f(Y(x, a)), x2: f(X(x, b)), y2: f(Y(x, b)) }); });
  G.strings = strokes('pl-3');
  D.strings?.forEach(([[x0, y0], [x1, y1]]) => add(G.strings, 'line', { x1: f(X(x0, y0)), y1: f(Y(x0, y0)), x2: f(X(x1, y1)), y2: f(Y(x1, y1)) }));
  G.ink = strokes('pl-1');
  add(G.ink, 'path', { d: line(D.body_outline) }); add(G.ink, 'path', { d: line(D.neck) });
  // the measures, in the same dimension lines as the drawing
  G.dims = strokes('pl-d');
  const dim = (x0, x1, off, label) => {
    const a = [x0, off], b = [x1, off];
    add(G.dims, 'line', { x1: f(X(...a)), y1: f(Y(...a)), x2: f(X(...b)), y2: f(Y(...b)) });
    for (const p of [a, b]) add(G.dims, 'line', { x1: f(X(...p) - 0.14), y1: f(Y(...p) + 0.14), x2: f(X(...p) + 0.14), y2: f(Y(...p) - 0.14) });
    const mx = X((x0 + x1) / 2, off), my = Y((x0 + x1) / 2, off);
    const t = el('text', { x: f(mx), y: f(my), class: 'pl-t', 'text-anchor': 'middle', dy: '-0.28', transform: flat ? '' : `rotate(-90 ${f(mx)} ${f(my)})` }, G.dims);
    t.textContent = label; G.dims.items.push(t);
  };
  dim(tail, tip, -half - 0.95, `Overall ${(tip - tail).toFixed(2)}`);
  dim(0, D.scale, half + 0.95, `Scale ${D.scale.toFixed(2)}`);
  return G;
}

/** How far a group of strokes is drawn, one after another across its own 0..1. */
function drawn(group, k, overlap = 4) {
  const n = group.items.length;
  group.items.forEach((e, i) => {
    const t = clamp01(k * (n + overlap) / overlap - (i / overlap));
    if (e.tagName === 'text') { e.style.opacity = t.toFixed(3); return; }
    e.style.strokeDashoffset = (1 - t).toFixed(3);
    e.style.opacity = t > 0 ? 1 : 0;
  });
}

/** Build the section. `toVisit()` takes the page to the footer, `sheet(id)` a guitar's drawing data, `current()` the guitar the room is on. */
export function buildOrder(section, { toVisit, sheet, current = () => 0, reduced }) {
  // a title split into words, each in a mask, so they can rise one after another
  const wordsOf = (html) => html.replace(/(<em>.*?<\/em>[.,]?|[^\s<]+)/g, (w) => `<span class="slip__w"><span>${w}</span></span>`);
  section.innerHTML = `
    <div class="order__pin">
      <div class="order__info">
        <p class="eyebrow">03 · How to order</p>
        <h2 class="order__h2">From a visit<br>to your <em>hands</em>.</h2>
        <p class="order__lede">Every KVELD is made to order, one at a time, for the person who will play it. This is how that goes.</p>
        <div class="order__list">
          <p class="order__k"><span>The seven</span><span>Build</span><span>From</span></p>
          <ol>${LINEUP.map((g, i) => { const S = SPECS[g.id]; return `
            <li><button class="order__row" type="button" data-g="${i}" style="--own: ${g.colour}" aria-label="Make the slip out for ${g.name}, ${S.weeks} weeks, from ${S.price}"><b>${g.name}</b><span>${S.weeks} weeks</span><em>${S.price}</em></button></li>`; }).join('')}
          </ol>
        </div>
        <div class="order__cta">
          <button class="order__book" type="button" data-order-book><span>Book a visit</span>${ARROW}</button>
          <p class="order__small">An hour in the room is free.<br>Thursday to Saturday, by appointment.</p>
        </div>
      </div>
      <div class="slip">
        <header class="slip__head"><b>KVELD</b><span>Order slip · Room 01, Halden</span><i>No. 0417</i></header>
        <div class="slip__main">
          <ol class="slip__lines">
            <i class="slip__rule" aria-hidden="true"><b></b></i><i class="slip__now" aria-hidden="true"></i>
            ${STEPS.map((st, k) => `
            <li class="slip__line" style="--step: ${st.colour}">
              <span class="slip__ring" aria-hidden="true"><svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="8"/><circle class="d" cx="11" cy="11" r="3.4"/></svg></span>
              <div class="slip__body">
                <div class="slip__top"><span class="slip__no">${String(k + 1).padStart(2, '0')}</span><h3 class="slip__title"><i class="slip__mark" aria-hidden="true"></i>${wordsOf(st.title)}</h3><span class="slip__meta" data-meta="${k}"></span></div>
                <p class="slip__text" data-text="${k}"></p>
              </div>
            </li>`).join('')}
          </ol>
          <figure class="slip__plan" aria-hidden="true"><svg data-slip-plan preserveAspectRatio="xMidYMid meet"></svg></figure>
        </div>
        <footer class="slip__foot">
          <span>Signed</span><svg class="slip__sig" viewBox="0 0 220 50" aria-hidden="true"><path d="M6 36c10-18 18-26 24-20s-8 22 2 20 14-26 22-24-4 26 6 24 12-18 20-18 2 14 10 14 16-10 26-10 14 8 24 6 20-8 30-12"/></svg>
          <span class="slip__for">Made out for <b data-for>Floe</b> · from <b data-from>€2,900</b></span>
          <span class="slip__stamp">Bench reserved</span>
        </footer>
      </div>
    </div>`;

  $('[data-order-book]', section).addEventListener('click', toVisit);
  const lines = $$('.slip__line', section), sig = $('.slip__sig path', section), stamp = $('.slip__stamp', section), slip = $('.slip', section);
  const parts = lines.map((li) => ({ li, ring: $('.slip__ring', li), mark: $('.slip__mark', li), words: $$('.slip__w > span', li) }));
  const rule = $('.slip__rule', section), ruleFill = $('.slip__rule b', section), now = $('.slip__now', section), box = $('.slip__lines', section);
  const planSvg = $('[data-slip-plan]', section), rows = $$('.order__row', section);
  const L = sig.getTotalLength();
  sig.style.strokeDasharray = L;
  const state = { p: 0, sig: 0, stamp: 0 };

  // the ruler runs from the first ring to the last, measured from the layout
  let rings = [];
  const measure = () => {
    const b = box.getBoundingClientRect();
    rings = parts.map(({ ring }) => { const r = ring.getBoundingClientRect(); return r.top + r.height / 2 - b.top; });
    rule.style.top = `${rings[0]}px`; rule.style.height = `${rings[rings.length - 1] - rings[0]}px`;
    fill(state.p);
  };
  const at = (i) => clamp01((state.p - 0.04 - i * 0.19) / 0.15);

  let P = null;   // the plan on the slip
  function fill(p) {
    state.p = p;
    let track = 0;
    parts.forEach(({ li, mark, words }, i) => {
      const w = at(i);
      if (w > 0) track = i - 1 + sm(0, 0.35, w);
      mark.style.transform = `scaleX(${sm(0.1, 0.65, w).toFixed(3)})`;
      const n = words.length;
      words.forEach((el, k) => { const e = sm(0, 1, w * (n + 2) / 2 - k * 0.5); el.style.transform = `translate3d(0, ${((1 - e) * 105).toFixed(1)}%, 0)`; });
      li.style.setProperty('--w', sm(0.35, 1, w).toFixed(3));
      li.classList.toggle('is-on', w > 0 && w < 1);
      li.classList.toggle('is-done', w >= 1);
    });
    const here = rings.length ? rings[0] + (rings[rings.length - 1] - rings[0]) * clamp01(track / (rings.length - 1)) : 0;
    now.style.transform = `translate3d(0, ${here.toFixed(1)}px, 0)`;
    now.style.opacity = sm(0.02, 0.06, p).toFixed(3);
    ruleFill.style.transform = `scaleY(${clamp01(track / (rings.length - 1 || 1)).toFixed(4)})`;
    // the guitar comes up on the slip step by step, in the order the words tell it
    if (P) {
      drawn(P.ink, sm(0.04, 0.2, p), 1.2);
      drawn(P.dims, sm(0.22, 0.34, p), 3);
      drawn(P.parts, sm(0.25, 0.4, p), 6);
      drawn(P.frets, sm(0.42, 0.56, p), 5);
      const k = sm(0.44, 0.6, p);
      if (P.flat) P.wipe.setAttribute('width', (P.span * k).toFixed(2));
      else { P.wipe.setAttribute('y', (-P.tail + 1 - P.span * k).toFixed(2)); P.wipe.setAttribute('height', (P.span * k).toFixed(2)); }
      // once it is all there the working lines lift off and it is just the guitar on the sheet, with its shadow
      drawn(P.strings, sm(0.62, 0.72, p), 3);
      const clean = sm(0.72, 0.84, p);
      for (const g of [P.parts, P.frets, P.strings]) g.style.opacity = (1 - clean).toFixed(3);
      P.ink.style.opacity = (1 - 0.7 * clean).toFixed(3);
      planSvg.style.setProperty('--lift', (clean * 1.2).toFixed(3));
    }
    state.sig = sm(0.8, 0.9, p);
    sig.style.strokeDashoffset = (L * (1 - state.sig)).toFixed(1);
    const st = sm(0.91, 0.96, p);
    state.stamp = st > 0.5 ? 1 : 0;
    stamp.style.opacity = st.toFixed(3);
    stamp.style.transform = `rotate(-7deg) scale(${(1.7 - 0.7 * st).toFixed(3)})`;
  }

  // the slip is made out for one guitar: its plan, its colour, its terms
  let forI = -1;
  const framesP = fetch('assets/shots/frames.json').then((r) => r.json());
  const flat = () => matchMedia('(max-width: 900px)').matches;
  async function makeOut(i, first) {
    if (i === forI) return;
    forI = i;
    const g = LINEUP[i], S = SPECS[g.id];
    rows.forEach((r, k) => { r.classList.toggle('is-on', k === i); r.setAttribute('aria-pressed', String(k === i)); });
    section.style.setProperty('--own', g.colour);
    $$('[data-text]', section).forEach((el) => { el.textContent = STEPS[+el.dataset.text].text(S, g); });
    $$('[data-meta]', section).forEach((el) => { el.textContent = STEPS[+el.dataset.meta].meta(S, g); });
    $('[data-for]', section).textContent = g.name; $('[data-from]', section).textContent = S.price;
    const D = await sheet(g.id);
    if (i !== forI) return;
    const frames = await framesP;
    if (i !== forI) return;
    P = plotPlan(planSvg, D, flat(), frames[g.id], g.id);
    fill(state.p);
    if (!first && !reduced) gsap.fromTo(planSvg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', overwrite: true });
  }
  rows.forEach((r, i) => {
    r.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') makeOut(i); });      // moving: not a list scrolling under a still pointer
    r.addEventListener('focus', () => makeOut(i));
    r.addEventListener('click', () => makeOut(i));
  });
  makeOut(current(), true).then(measure);
  new ResizeObserver(() => { measure(); }).observe(box);
  addEventListener('resize', () => { if (P && P.flat !== flat()) { const k = forI; forI = -1; makeOut(k, true); } });

  if (reduced) { fill(1); return { state }; }                    // reduced motion: the slip is filled in, and nothing pins
  fill(0);
  // it arrives on the guitar the room was left on, and slides into place as the sheet comes up
  let arrived = false;
  // and the first line is already being written as it lands, so the slip is never an empty form on screen
  const OPENING = 0.2;
  riseOver(section, $('#guitars'), { onRise: (p) => {
    slip.style.setProperty('--in', (1 - p).toFixed(3));
    if (!arrived && p > 0.02) { arrived = true; makeOut(current(), true); }
    if (innerWidth > 900) { if (p < 1) fill(OPENING * sm(0.45, 1, p)); else if (state.p < OPENING) fill(OPENING); }      // (p = 1 alone: a jump here from the header)
  } });
  // wide screens: the whole view pins while the slip fills, and holds a screen for the footer to come up over.
  // Phones: the slip fills as it scrolls past
  const FILL = 2.4;
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': () => { ScrollTrigger.create({ trigger: section, start: 'top top', end: () => `+=${Math.round((FILL + 1) * innerHeight)}`, pin: true, anticipatePin: 1, onUpdate: (st) => fill(OPENING + (1 - OPENING) * Math.min(st.progress * (FILL + 1) / FILL, 1)) }); },
    '(max-width: 900px)': () => { ScrollTrigger.create({ trigger: slip, start: 'top 70%', end: 'bottom 60%', onUpdate: (st) => fill(st.progress) }); },
  });
  return { state };
}
