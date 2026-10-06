// DEMO OPTIONS: section 02, the room as a place to choose a guitar.
//
//   ?index=wall    01 The Wall     the seven hang in a row that travels sideways as you scroll
//   ?index=stage   02 Spotlight    seven names on the left, the one in the light on a stage on the right
//   ?index=bench   03 To Scale     all seven side by side on a cream sheet, lined up at the bridge,
//                                  with a finder that narrows them
//
// Without ?index the section is the list the page has always had. All three
// use the product stills in assets/shots (tools/product_shots.mjs) and the
// words and invented prices in specs.js. Styles live here too, so removing an
// option is deleting this file and its one hook in main.js.
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';

const Q = new URLSearchParams(location.search);
export const INDEX = ['wall', 'stage', 'bench'].includes(Q.get('index')) ? Q.get('index') : null;
const { gsap, ScrollTrigger } = window;
const IN = 0.0254;
const ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4" fill="none" stroke="currentColor"/></svg>';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const CSS = /* css */`
.ix em { font-style: normal; }
.ix__go { display: inline-flex; align-items: center; gap: 14px; padding: 10px 4px 9px; white-space: nowrap; font: 400 11px var(--sans); letter-spacing: 0.14em; text-transform: uppercase;
  border-bottom: 1px solid color-mix(in srgb, var(--own) 60%, transparent); transition: gap 0.6s var(--ease), border-color 0.6s var(--ease); }
.ix__go svg { width: 22px; height: 10px; }
.ix__go:hover { gap: 22px; border-color: var(--own); }

/* ------------------------------------------------------------ 01 wall */
.ix-wall { padding: 0; background: var(--ink); }
.ixw__pin { position: relative; height: 100vh; height: 100svh; min-height: 520px; overflow: hidden; }
.ixw__track { display: flex; height: 100%; width: max-content; padding: 0 12vw 0 var(--gutter); will-change: transform; }
.ixw__head { flex: none; width: min(33rem, 40vw); align-self: center; padding-right: 5vw; }
.ixw__h2 { margin: 0; font: 400 clamp(1.8rem, 3.6vw, 3.9rem)/1.04 var(--serif); letter-spacing: -0.015em; }
.ixw__h2 em { color: var(--accent); }
.ixw__lede { margin: 2rem 0 0; max-width: 22rem; font: 300 12.5px/1.85 var(--sans); color: var(--muted); }
.ixw__card { flex: none; position: relative; width: clamp(280px, 27vw, 410px); display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; gap: 2vh; padding: 10.5vh 1.6vw 9vh;
  border-left: 1px solid var(--line); opacity: 0; transform: translateY(5vh); transition: opacity 1.2s var(--ease), transform 1.4s var(--ease); transition-delay: calc(var(--i) * 70ms); }
.ix-wall.is-in .ixw__card { opacity: 1; transform: none; }
.ixw__num { position: absolute; top: 10.5vh; left: 1.3vw; font: 400 clamp(4.6rem, 20vh, 12rem)/0.8 var(--serif); letter-spacing: -0.04em; color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--own) 50%, transparent); pointer-events: none; will-change: transform; }
.ixw__fig { position: relative; min-height: 0; will-change: transform; }
.ixw__glow { position: absolute; inset: 6% -14%; background: radial-gradient(closest-side, color-mix(in srgb, var(--own) 30%, transparent), transparent 72%); opacity: 0.4; transition: opacity 0.9s var(--ease); }
.ixw__fig img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 26px 34px rgba(0, 0, 0, 0.55)); transition: transform 1.1s var(--ease); cursor: pointer; }
.ixw__card:hover .ixw__fig img { transform: translateY(-2.2vh) rotate(-1.6deg) scale(1.035); }
.ixw__card:hover .ixw__glow { opacity: 0.85; }
.ixw__name { margin: 0; font: 500 clamp(1.2rem, 1.9vw, 2rem)/1 var(--serif); letter-spacing: 0.13em; text-transform: uppercase; }
.ixw__line { margin: 9px 0 0; font: 400 10px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--own); }
.ixw__facts { margin: 1.5vh 0 0; padding: 1.1vh 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 16px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font: 400 10.5px var(--sans); }
.ixw__facts dt { color: var(--muted); letter-spacing: 0.16em; text-transform: uppercase; font-size: 9.5px; align-self: center; }
.ixw__facts dd { margin: 0; text-align: right; }
.ixw__buy { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 6px 12px; margin-top: 1.4vh; }
.ixw__buy .ix__go { padding-bottom: 6px; }
.ixw__price { margin: 0; font: 400 clamp(0.95rem, 1.25vw, 1.2rem)/1.1 var(--serif); white-space: nowrap; }
.ixw__price span { display: block; margin-top: 7px; font: 400 9.5px var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.ixw__rail { position: absolute; left: var(--gutter); right: var(--gutter); bottom: 4.2vh; display: flex; align-items: center; gap: 18px; font: 400 10px var(--sans); letter-spacing: 0.14em; color: var(--muted); font-variant-numeric: tabular-nums; }
.ixw__rail b { font-weight: 400; color: var(--text); }
.ixw__bar { flex: 1; height: 1px; background: var(--line); overflow: hidden; }
.ixw__bar span { display: block; height: 100%; background: var(--accent); transform: scaleX(0); transform-origin: left; }
@media (max-width: 900px) {
  .ixw__head { width: 84vw; }
  .ixw__card { width: 80vw; padding: 11vh 5vw 10vh; }
  .ixw__num { left: 5vw; font-size: 15vh; }
}

/* ----------------------------------------------------------- 02 stage */
.ix-stage { padding: 0; background: var(--ink); }
.ixs__pin { position: relative; height: 100vh; height: 100svh; min-height: 520px; overflow: hidden; display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); }
.ixs__left { display: flex; flex-direction: column; justify-content: center; padding: 9vh 0 6vh var(--gutter); }
.ixs__h2 { margin: 0 0 3.4vh; font: 400 clamp(0.95rem, 1.25vw, 1.25rem)/1.3 var(--serif); color: var(--muted); }
.ixs__h2 em { color: var(--own); transition: color 0.8s var(--ease); }
.ixs__names { list-style: none; margin: 0; padding: 0; }
.ixs__names button { display: flex; align-items: baseline; gap: 1.1rem; width: 100%; padding: 0.4vh 0; text-align: left; opacity: 0.22; transition: opacity 0.7s var(--ease), transform 0.9s var(--ease); }
.ixs__names li.is-on button { opacity: 1; transform: translateX(1.4vw); }
.ixs__names button:hover { opacity: 0.6; }
.ixs__names li.is-on button:hover { opacity: 1; }
.ixs__no { flex: none; width: 2.2em; font: 400 11px var(--sans); letter-spacing: 0.14em; color: var(--own); font-variant-numeric: tabular-nums; }
.ixs__t { font: 500 clamp(1.5rem, min(4.5vw, 8.4vh), 4.7rem)/1.12 var(--serif); letter-spacing: 0.1em; text-transform: uppercase; }
.ixs__k { margin-left: auto; padding-right: 2vw; font: 400 10px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); opacity: 0; transition: opacity 0.7s var(--ease); white-space: nowrap; }
.ixs__names li.is-on .ixs__k { opacity: 1; }
.ixs__stage { position: relative; --own: var(--accent); }
.ixs__halo { position: absolute; left: 4%; top: 8%; width: 62%; height: 84%; background: radial-gradient(closest-side, color-mix(in srgb, var(--own) 24%, transparent), transparent 72%); transition: background 0.9s var(--ease); }
.ixs__num { position: absolute; right: var(--gutter); top: 11vh; font: 400 clamp(5rem, 24vh, 15rem)/0.8 var(--serif); letter-spacing: -0.04em; color: transparent; -webkit-text-stroke: 1px color-mix(in srgb, var(--own) 55%, transparent); }
.ixs__plan { position: absolute; left: 19%; top: 6vh; height: 90vh; width: auto; overflow: visible; opacity: 0.5; }
.ixs__plan path { fill: none; stroke: var(--own); stroke-width: 2.2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.ixs__imgs { position: absolute; left: 0; top: 7vh; height: 86vh; width: 66%; }
.ixs__imgs img { position: absolute; left: 50%; top: 0; height: 100%; width: auto; transform: translate(-50%, 7%) scale(0.965); opacity: 0; filter: drop-shadow(0 30px 40px rgba(0, 0, 0, 0.6));
  transition: opacity 0.6s var(--ease), transform 1.2s var(--ease); cursor: pointer; }
.ixs__imgs img.is-on { opacity: 1; transform: translate(-50%, 0) scale(1); }
.ixs__imgs img.is-out { transform: translate(-50%, -6%) scale(0.98); }
.ixs__sheet { position: absolute; right: var(--gutter); bottom: 7vh; width: min(19rem, 44%); }
.ixs__after { margin: 0 0 1.4vh; font: 400 10px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--own); }
.ixs__claim { margin: 0; font: 400 clamp(0.9rem, 1.2vw, 1.15rem)/1.4 var(--serif); }
.ixs__claim em { color: var(--own); }
.ixs__facts { margin: 2.2vh 0 0; padding: 1.5vh 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font: 400 11px var(--sans); }
.ixs__facts dt { color: var(--muted); letter-spacing: 0.16em; text-transform: uppercase; font-size: 9.5px; align-self: center; }
.ixs__facts dd { margin: 0; text-align: right; }
.ixs__buy { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1.4vh 12px; margin-top: 2vh; }
.ixs__price { margin: 0; font: 400 clamp(1rem, 1.35vw, 1.3rem)/1.1 var(--serif); white-space: nowrap; }
.ixs__price span { display: block; margin-top: 7px; font: 400 9.5px var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
@media (max-width: 900px) {
  .ixs__pin { display: block; }
  .ixs__left { position: absolute; left: 0; right: 0; top: 0; padding: 11vh var(--gutter) 0; z-index: 2; }
  .ixs__h2 { margin-bottom: 1.4vh; font-size: 0.8rem; }
  .ixs__names li:not(.is-on) { display: none; }
  .ixs__names li.is-on button { transform: none; }
  .ixs__names li.is-on button { flex-wrap: wrap; gap: 0 0.8rem; }
  .ixs__t { font-size: 2.3rem; }
  .ixs__k { flex-basis: 100%; margin: 6px 0 0 calc(2.2em + 0.8rem); padding: 0; }
  .ixs__stage { position: absolute; inset: 0; }
  .ixs__imgs { top: 26vh; height: 47vh; width: 100%; }
  .ixs__plan { left: 30%; top: 25vh; height: 49vh; }
  .ixs__halo { left: 10%; top: 22%; width: 80%; height: 54%; }
  .ixs__num { top: 31vh; font-size: 11vh; }
  .ixs__sheet { left: var(--gutter); right: var(--gutter); bottom: 4vh; width: auto; }
  .ixs__claim { display: none; }
  .ixs__facts { margin-top: 0; }
}

/* ----------------------------------------------------------- 03 bench */
.ix-bench { padding: 0; background: var(--bone); color: #1a1612; }
.ix-bench .eyebrow { color: var(--muted-ink); }
.ixb__pin { position: relative; height: 100vh; height: 100svh; min-height: 540px; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; padding: 10.5vh var(--gutter) 4vh;
  --h: min(52vh, calc((100vw - 2 * var(--gutter) - 10rem) / 2.12)); }
.ixb__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 3vw; }
.ixb__head .eyebrow { margin-bottom: 1.2vh; }
.ixb__h2 { margin: 0; font: 400 clamp(1.4rem, min(2.7vw, 5vh), 2.9rem)/1.06 var(--serif); letter-spacing: -0.012em; }
.ixb__h2 em { color: var(--own-ink, #1a1612); transition: color 0.8s var(--ease); }
.ixb__filters { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; max-width: 30rem; }
.ixb__filters button { padding: 7px 12px; border: 1px solid var(--line-ink); border-radius: 99px; font: 400 9.5px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: #4a433b;
  transition: background 0.5s var(--ease), color 0.5s var(--ease), border-color 0.5s var(--ease); }
.ixb__filters button:hover { border-color: #1a1612; }
.ixb__filters button[aria-pressed='true'] { background: #1a1612; border-color: #1a1612; color: var(--bone); }
.ixb__wall { position: relative; align-self: end; height: calc(var(--h) * 1.12); margin-left: 9.5rem; }
/* the lines every guitar is hung on: the bridge, and where each scale puts the nut */
.ixb__rule { position: absolute; left: -9.5rem; right: 0; height: 0; border-top: 1px solid rgba(26, 22, 18, 0.2); transform: scaleX(0); transform-origin: left; transition: transform 1.6s var(--ease), border-color 0.6s var(--ease), opacity 0.6s var(--ease); }
.ix-bench.is-in .ixb__rule { transform: none; }
.ixb__rule b { position: absolute; left: 0; bottom: 5px; font: 400 9.5px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted-ink); white-space: nowrap; transition: color 0.6s var(--ease); }
.ixb__rule.is-hit { border-color: #1a1612; }
.ixb__rule.is-hit b { color: #1a1612; }
/* the three nut lines sit millimetres apart: one label at a time */
.ixb__rule.is-nut b { opacity: 0; }
.ixb__rule.is-nut.is-hit b, .ixb__wall:not(.has-on) .ixb__rule.is-all b { opacity: 1; }
.ixb__wall.has-on .ixb__rule:not(.is-hit):not(.is-bridge) { opacity: 0.35; }
.ixb__row { list-style: none; margin: 0; padding: 0; position: absolute; inset: 0; display: flex; justify-content: space-between; }
.ixb__g { position: relative; flex: none; width: calc(var(--h) * 0.3); height: 100%; }
.ixb__g button { position: absolute; left: 50%; bottom: calc(var(--h) * 0.12); width: calc(var(--h) * 0.408); height: var(--h); transform: translate(-50%, var(--drop)); cursor: pointer; }
.ixb__g img, .ixb__g svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ixb__g img { opacity: 0; transform: translateY(1.5%); filter: drop-shadow(0 14px 16px rgba(60, 40, 20, 0.22)); transition: opacity 0.9s var(--ease), transform 1.2s var(--ease), filter 0.9s var(--ease); transition-delay: calc(var(--i) * 80ms); }
.ix-bench.is-built .ixb__g img { opacity: 1; transform: none; }
.ixb__g svg { overflow: visible; }
.ixb__g path { fill: none; stroke: #1a1612; stroke-width: 1.15; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 1;
  transition: stroke-dashoffset 2s var(--ease), opacity 0.8s var(--ease); transition-delay: calc(var(--i) * 90ms), 0s; }
.ix-bench.is-in .ixb__g path { stroke-dashoffset: 0; }
.ix-bench.is-built .ixb__g path { opacity: 0; }
/* one in the light: the others go back to their drawings */
.ixb__wall.has-on .ixb__g:not(.is-on) img, .ixb__g.is-off img { opacity: 0.07; transition-delay: 0s; filter: grayscale(1); }
.ix-bench.is-built .ixb__wall.has-on .ixb__g:not(.is-on) path, .ix-bench.is-built .ixb__g.is-off path { opacity: 0.75; }
.ixb__g.is-off path { stroke-dasharray: 0.004 0.006; }
.ixb__wall.has-on .ixb__g.is-on img { transform: translateY(-1.2%); transition-delay: 0s; filter: drop-shadow(0 22px 22px rgba(60, 40, 20, 0.3)); }
.ixb__tag { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); display: flex; gap: 8px; font: 400 9.5px var(--sans); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted-ink); white-space: nowrap; transition: color 0.5s var(--ease); }
.ixb__tag b { font-weight: 400; color: var(--own-ink); }
.ixb__g.is-on .ixb__tag { color: #1a1612; }
.ixb__card { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1.5fr) auto; align-items: end; gap: 3vw; margin-top: 2.6vh; padding-top: 2.2vh; border-top: 1px solid var(--line-ink); min-height: 12vh; }
.ixb__name { margin: 0; font: 500 clamp(1.3rem, min(2.5vw, 5vh), 2.7rem)/1 var(--serif); letter-spacing: 0.12em; text-transform: uppercase; }
.ixb__claim { margin: 1vh 0 0; font: 300 12px/1.6 var(--sans); color: #4a433b; max-width: 26rem; }
.ixb__claim em { color: var(--own-ink); }
.ixb__facts { margin: 0; display: grid; grid-template-columns: 0.6fr 1fr 0.9fr 1.2fr; gap: 6px 1.6vw; }
.ixb__facts div { display: grid; gap: 6px; }
.ixb__facts dt { font: 400 9.5px var(--sans); letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted-ink); }
.ixb__facts dd { margin: 0; font: 400 11.5px/1.45 var(--sans); }
.ixb__buy { display: grid; justify-items: end; gap: 1vh; }
.ixb__price { margin: 0; font: 400 clamp(1rem, 1.35vw, 1.3rem)/1 var(--serif); text-align: right; }
.ixb__price span { display: block; margin-top: 7px; font: 400 9.5px var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-ink); }
.ix-bench .ix__go { border-color: color-mix(in srgb, var(--own-ink) 70%, transparent); }
@media (max-width: 900px) {
  .ixb__pin { padding-top: 10vh; --h: 46vh; }
  .ixb__head { display: block; }
  .ixb__filters { justify-content: flex-start; margin-top: 1.6vh; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; max-width: none; margin-right: calc(var(--gutter) * -1); }
  .ixb__filters button { flex: none; }
  .ixb__wall { margin-left: 0; overflow: hidden; }
  .ixb__rule { left: 0; }
  .ixb__rule b { font-size: 8.5px; }
  .ixb__row { position: absolute; inset: 0 auto 0 0; width: calc(var(--h) * 2.3); will-change: transform; transition: transform 1.1s var(--ease); }
  .ixb__g { width: calc(var(--h) * 0.32); }
  .ixb__card { grid-template-columns: 1fr auto; gap: 1.6vh 4vw; min-height: 17vh; }
  .ixb__claim { display: none; }
  .ixb__facts { grid-column: 1 / -1; grid-row: 2; grid-template-columns: 0.7fr 1fr 1fr; }
  .ixb__facts div:nth-child(4) { display: none; }
}
`;

// ---------------------------------------------------------------- shared ----
function items(sheets) {
  return LINEUP.map((info, i) => {
    const S = SPECS[info.id] || {}, D = sheets[i];
    return { i, info, S, D, scale: `${+D.scale.toFixed(2)} in`, img: (v) => `assets/shots/${info.id}-${v}.webp` };
  });
}

/** The body and neck outline, laid over a 'front' still (frames.json says where the still sits). */
function planPath(D, F) {
  const tail = Math.min(...D.body_outline.map((p) => p[0])), tip = Math.max(...D.neck.map((p) => p[0])), nut = D.nut[0];
  const fold = Math.min((F.top - (nut - tail) * IN) / ((tip - nut) * IN), 1);   // a head that leans back is shorter seen from the front
  const X = (y) => (-y * IN) * F.ppm + F.w / 2;
  const Y = (x) => (F.base + F.h / F.ppm - ((x > nut ? nut + (x - nut) * fold : x) - tail) * IN) * F.ppm;
  const d = (pts) => `M${pts.map((p) => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}Z`;
  return d(D.body_outline) + d(D.neck);
}
const inkOf = (hex) => `color-mix(in oklch, ${hex} 55%, #1a1612)`;

// ---------------------------------------------------------------- 01 wall ----
function wall(section, list, pick) {
  section.classList.add('ix', 'ix-wall');
  section.innerHTML = `
    <div class="ixw__pin">
      <div class="ixw__track">
        <header class="ixw__head">
          <p class="eyebrow">02 · The room</p>
          <h2 class="ixw__h2">Seven on the wall.<br>One goes <em>home</em>.</h2>
          <p class="ixw__lede">Each KVELD is built to order from its own sheet. Find the shape, then go and stand in front of it.</p>
        </header>
        ${list.map(({ i, info, S, scale, img }) => `
        <article class="ixw__card" style="--own: ${info.colour}; --i: ${i}">
          <span class="ixw__num" aria-hidden="true">${info.no}</span>
          <div class="ixw__fig"><i class="ixw__glow"></i><img src="${img('hero')}" alt="${info.name}, ${S.finish}" data-pick="${i}" decoding="async"></div>
          <div class="ixw__meta">
            <h3 class="ixw__name">${info.name}</h3>
            <p class="ixw__line">${info.pattern}</p>
            <dl class="ixw__facts"><dt>Scale</dt><dd>${scale}</dd><dt>Pickups</dt><dd>${S.short}</dd><dt>Finish</dt><dd>${S.finish}</dd></dl>
            <div class="ixw__buy">
              <p class="ixw__price">From ${S.price}<span>${S.weeks} weeks to build</span></p>
              <button class="ix__go" type="button" data-pick="${i}"><span>In the room</span>${ARROW}</button>
            </div>
          </div>
        </article>`).join('')}
      </div>
      <div class="ixw__rail"><span><b data-n>01</b> / 07</span><div class="ixw__bar"><span data-bar></span></div><span data-name>Floe</span></div>
    </div>`;
  const pin = $('.ixw__pin', section), track = $('.ixw__track', section), cards = $$('.ixw__card', section);
  const bar = $('[data-bar]', section), n = $('[data-n]', section), name = $('[data-name]', section);
  const dist = () => Math.max(track.scrollWidth - innerWidth, 0);
  let on = -1;
  const frame = (p = 0) => {
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    let best = 0, bestD = 1e9;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect(), k = (r.left + r.width / 2 - innerWidth / 2) / innerWidth;
      // the guitar hangs a little behind its card, the numeral a little ahead: depth as the wall goes by
      c.children[1].style.transform = `translate3d(${(-k * 46).toFixed(1)}px, 0, 0)`;
      c.children[0].style.transform = `translate3d(${(k * 110).toFixed(1)}px, 0, 0)`;
      if (Math.abs(k) < bestD) { bestD = Math.abs(k); best = i; }
    });
    if (best !== on) { on = best; n.textContent = LINEUP[on].no; name.textContent = LINEUP[on].name; section.style.setProperty('--accent', LINEUP[on].colour); }
  };
  gsap.to(track, { x: () => -dist(), ease: 'none', onUpdate() { frame(this.progress()); },
    scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true, onRefresh: (st) => frame(st.animation ? st.animation.progress() : 0) } });
  frame(0);
  ScrollTrigger.create({ trigger: section, start: 'top 72%', once: true, onEnter: () => section.classList.add('is-in') });
  section.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) pick(+t.dataset.pick); });
}

// --------------------------------------------------------------- 02 stage ----
function stage(section, list, pick, frames) {
  section.classList.add('ix', 'ix-stage');
  section.innerHTML = `
    <div class="ixs__pin">
      <div class="ixs__left">
        <p class="eyebrow">02 · The room</p>
        <h2 class="ixs__h2">The room holds seven. Find the one that <em>fits</em>.</h2>
        <ol class="ixs__names">${list.map(({ i, info }) => `
          <li style="--own: ${info.colour}"><button type="button" data-i="${i}"><span class="ixs__no">${info.no}</span><span class="ixs__t">${info.name}</span><span class="ixs__k">${info.pattern}</span></button></li>`).join('')}
        </ol>
      </div>
      <div class="ixs__stage">
        <i class="ixs__halo"></i>
        <span class="ixs__num" data-num aria-hidden="true">01</span>
        <svg class="ixs__plan" viewBox="0 0 620 1520" aria-hidden="true"><path pathLength="1" data-plan/></svg>
        <div class="ixs__imgs">${list.map(({ i, info, S, img }) => `<img src="${img('hero')}" alt="${info.name}, ${S.finish}" data-pick="${i}" decoding="async">`).join('')}</div>
        <div class="ixs__sheet">
          <div data-swap>
            <p class="ixs__after" data-after></p>
            <p class="ixs__claim" data-claim></p>
            <dl class="ixs__facts" data-facts></dl>
          </div>
          <div class="ixs__buy"><p class="ixs__price" data-price></p><button class="ix__go" type="button" data-go><span>In the room</span>${ARROW}</button></div>
        </div>
      </div>
    </div>`;
  const pin = $('.ixs__pin', section), st = $('.ixs__stage', section), rows = $$('.ixs__names li', section), imgs = $$('.ixs__imgs img', section);
  const el = { num: $('[data-num]', section), plan: $('[data-plan]', section), after: $('[data-after]', section), claim: $('[data-claim]', section),
    facts: $('[data-facts]', section), price: $('[data-price]', section), swap: $('[data-swap]', section) };
  let on = -1;
  const show = (i) => {
    if (i === on) return;
    const { info, S, D, scale } = list[i], first = on < 0;
    imgs.forEach((im, k) => { im.classList.toggle('is-out', k === on); im.classList.toggle('is-on', k === i); });
    rows.forEach((r, k) => r.classList.toggle('is-on', k === i));
    on = i;
    st.style.setProperty('--own', info.colour); section.style.setProperty('--own', info.colour);
    el.plan.setAttribute('d', planPath(D, frames[info.id]));
    gsap.fromTo(el.plan, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'expo.out', overwrite: true });
    const fill = () => {
      el.num.textContent = info.no;
      el.after.textContent = `After ${S.after}`;
      el.claim.innerHTML = S.claim;
      el.facts.innerHTML = `<dt>Scale</dt><dd>${scale}</dd><dt>Pickups</dt><dd>${S.short}</dd><dt>Finish</dt><dd>${S.finish}</dd>`;
      el.price.innerHTML = `From ${S.price}<span>To order · ${S.weeks} weeks</span>`;
    };
    if (first) { fill(); return; }
    gsap.timeline({ overwrite: true }).to([el.swap, el.num, el.price], { opacity: 0, y: -8, duration: 0.22, ease: 'power2.in' }).add(fill)
      .fromTo([el.num, el.swap, el.price], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
  };
  show(0);
  // scrolling walks down the list; pointing at a name jumps the light to it
  ScrollTrigger.create({ trigger: pin, start: 'top top', end: () => `+=${Math.round(innerHeight * 3.4)}`, pin: true,
    onUpdate: (self) => show(Math.min(Math.floor(self.progress * 7), 6)) });
  rows.forEach((r, i) => {
    r.firstElementChild.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
    r.firstElementChild.addEventListener('click', () => (on === i ? pick(i) : show(i)));
  });
  $('[data-go]', section).addEventListener('click', () => pick(on));
  $('.ixs__imgs', section).addEventListener('click', () => pick(on));
}

// --------------------------------------------------------------- 03 bench ----
function bench(section, list, pick, frames) {
  section.classList.add('ix', 'ix-bench');
  section.dataset.theme = 'light';
  // metres above each still's bottom edge: where its bridge is, and so how far it hangs to line the bridges up
  const F0 = frames[list[0].info.id], perM = F0.ppm / F0.h;
  const bridge = list.map(({ info, D }) => (0 - Math.min(...D.body_outline.map((p) => p[0]))) * IN - frames[info.id].base);
  const line = Math.min(...bridge);
  const scales = [...new Set(list.map(({ D }) => +D.scale.toFixed(2)))].sort((a, b) => a - b);
  const FILTERS = [['all', 'All seven'], ['single', 'Single coils'], ['humbucker', 'Humbuckers'], ['25.5', '25.5 in scale'], ['24.75', '24.75 in scale'], ['semi', 'Semi-hollow']];
  const rule = (m, label, cls = '') => `<i class="ixb__rule ${cls}" style="bottom: calc(var(--h) * ${(0.12 + m * perM).toFixed(4)})"><b>${label}</b></i>`;
  section.innerHTML = `
    <div class="ixb__pin">
      <header class="ixb__head">
        <div><p class="eyebrow">02 · The room</p><h2 class="ixb__h2">Seven shapes,<br>hung at one <em>scale</em>.</h2></div>
        <div class="ixb__filters" role="group" aria-label="Narrow the seven">${FILTERS.map(([k, t], i) => `<button type="button" data-f="${k}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>
      </header>
      <div class="ixb__wall">
        ${rule(line, 'Bridge', 'is-bridge')}
        ${scales.map((s) => rule(line + s * IN, `Nut · ${s} in`, `is-nut s-${String(s).replace('.', '_')}`)).join('')}
        ${rule(line + scales[scales.length - 1] * IN, `Nut · ${scales[0]} to ${scales[scales.length - 1]} in`, 'is-nut is-all')}
        <ol class="ixb__row">${list.map(({ i, info, S, D, img }, k) => `
          <li class="ixb__g" style="--own-ink: ${inkOf(info.colour)}; --i: ${i}; --drop: calc(var(--h) * ${((bridge[k] - line) * perM).toFixed(4)})">
            <button type="button" data-i="${i}" aria-label="${info.name}">
              <img src="${img('front')}" alt="${info.name}, ${S.finish}" decoding="async">
              <svg viewBox="0 0 ${frames[info.id].w} ${frames[info.id].h}" aria-hidden="true"><path pathLength="1" d="${planPath(D, frames[info.id])}"/></svg>
            </button>
            <span class="ixb__tag"><b>${info.no}</b>${info.name}</span>
          </li>`).join('')}
        </ol>
      </div>
      <div class="ixb__card">
        <div data-swap><h3 class="ixb__name" data-name></h3><p class="ixb__claim" data-claim></p></div>
        <dl class="ixb__facts" data-facts></dl>
        <div class="ixb__buy"><p class="ixb__price" data-price></p><button class="ix__go" type="button" data-go><span>In the room</span>${ARROW}</button></div>
      </div>
    </div>`;
  const pin = $('.ixb__pin', section), wallEl = $('.ixb__wall', section), row = $('.ixb__row', section), gs = $$('.ixb__g', section), rules = $$('.ixb__rule', section);
  const el = { name: $('[data-name]', section), claim: $('[data-claim]', section), facts: $('[data-facts]', section), price: $('[data-price]', section) };
  let on = -1, filter = 'all';
  const match = (k) => { const { S, D } = list[k]; return filter === 'all' || S.coils === filter || S.family === filter || String(+D.scale.toFixed(2)) === filter; };
  const show = (i) => {
    if (i === on) return;
    on = i;
    wallEl.classList.toggle('has-on', i >= 0);
    gs.forEach((g, k) => g.classList.toggle('is-on', k === i));
    const it = list[Math.max(i, 0)], { info, S, D, scale } = it;
    section.style.setProperty('--own-ink', inkOf(info.colour));
    section.style.setProperty('--own', inkOf(info.colour));
    rules.forEach((r) => r.classList.toggle('is-hit', i >= 0 && r.classList.contains(`s-${String(+D.scale.toFixed(2)).replace('.', '_')}`)));
    el.name.textContent = info.name; el.claim.innerHTML = S.claim;
    el.facts.innerHTML = [['Scale', scale], ['Pickups', S.short], ['Finish', S.finish], ['Body', S.body]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    el.price.innerHTML = `From ${S.price}<span>To order · ${S.weeks} weeks</span>`;
    // phones: the row is wider than the screen, so it slides to keep the one in the light in view
    if (row.scrollWidth > wallEl.clientWidth + 4 && i >= 0) {
      const g = gs[i], x = g.offsetLeft + g.offsetWidth / 2 - wallEl.clientWidth / 2;
      row.style.transform = `translate3d(${-Math.min(Math.max(x, 0), row.scrollWidth - wallEl.clientWidth).toFixed(0)}px, 0, 0)`;
    }
  };
  show(-1);
  $$('.ixb__filters button', section).forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.f;
    $$('.ixb__filters button', section).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    gs.forEach((g, k) => g.classList.toggle('is-off', !match(k)));
    if (on >= 0 && !match(on)) show(list.findIndex((_, k) => match(k)));
  }));
  gs.forEach((g, i) => {
    g.firstElementChild.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && match(i)) show(i); });
    g.firstElementChild.addEventListener('click', () => (on === i ? pick(i) : show(i)));
  });
  $('[data-go]', section).addEventListener('click', () => pick(Math.max(on, 0)));
  // drawn first, then the guitars; after that scrolling takes the light along the row
  ScrollTrigger.create({ trigger: section, start: 'top 60%', once: true, onEnter: () => { section.classList.add('is-in'); setTimeout(() => section.classList.add('is-built'), 1500); } });
  ScrollTrigger.create({ trigger: pin, start: 'top top', end: () => `+=${Math.round(innerHeight * 3.2)}`, pin: true,
    onUpdate: (self) => {
      const p = self.progress;
      if (p < 0.1) { show(-1); return; }
      const ok = list.map((_, k) => k).filter(match);
      show(ok[Math.min(Math.floor((p - 0.1) / 0.9 * ok.length), ok.length - 1)]);
    } });
}

/** Build the chosen option into the section. `sheet(id)` resolves a guitar's drawing data, `pick(i)` takes the ring to it. */
export async function buildIndexOption(section, { sheet, pick }) {
  const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
  const [sheets, frames] = await Promise.all([Promise.all(LINEUP.map((g) => sheet(g.id))), fetch('assets/shots/frames.json').then((r) => r.json())]);
  const list = items(sheets);
  ({ wall, stage, bench })[INDEX](section, list, pick, frames);
}
