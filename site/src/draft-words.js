// The drawing chapter's words, three options behind ?ink=block|notes|name (V7, 2026-10-24, demo-options).
// Sam: drop "03 / 07" for the guitar's name, make the words more fun, and stop the two beats being two
// headlines and two subtitles in the same place with the same transition: something that matches the
// drawing. Without the switch the chapter keeps its words (draft.js buildCopy).
//   block   01 Title Block: a draughtsman's title block in the corner of the sheet, the name inked into
//           it as the plan draws, the headline inked stroke by stroke, struck through when beat two arrives
//   notes   02 Margin Notes: short notes written round the sheet as it draws, each with a pen line to it
//   name    03 Big Name: the name huge across the paper, drawn letter by letter with the plan, and lifting
//           off the page with the guitar
// frame(S, ctx) runs with the chapter: S.beat (0 the drawing, 1 off the page), S.copy, S.draw, S.rise,
// S.fill, ctx.paper 0..1, ctx.accent (hex for the page it is on), ctx.anchor() the sheet's middle on screen.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

let cssP = null;
const css = () => cssP ||= new Promise((ok) => {
  const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('../draft-words.css', import.meta.url).href + '?v=2' });
  l.onload = l.onerror = ok; document.head.appendChild(l);
});

// the words, for a guitar and its sheet (D: the drawing data)
function words(info, D, mode) {
  const scale = `${D.scale.toFixed(2)} in`, nut = `${D.nut_width.toFixed(2)} in`;
  const up = mode === 'dark' ? 'Then the lights come up.' : 'Then it leaves the page.';
  return {
    name: info.name,
    beats: [
      { title: 'It starts as <em>numbers</em>.', text: `${scale} from nut to saddle, ${nut} across the nut, ${D.frets} frets. We kept every one of them, even the awkward ones.` },
      { title: up.replace(/(page|up)\.$/, '<em>$1</em>.'), text: 'The same lines stand up, slice by slice, and the finish runs out from the bridge. Paper to wood in one scroll.' },
    ],
    notes: [
      [`${info.name}. Sheet one of one.`, `${scale}, nut to saddle. Measured twice.`, `${nut} across the nut.`, `${D.frets} frets. Not one more.`],
      ['Now it stands up.', 'Slice by slice, from the same lines.', 'Finish from the bridge outward.', 'Still the same numbers.'],
    ],
  };
}

export async function buildDraftWords(slug, roomEl) {
  const make = { block, notes, name }[slug];
  if (!make) return null;
  await css();
  const box = document.createElement('div');
  box.className = `dw dw--${slug}`;
  roomEl.appendChild(box);
  const opt = make(box);
  let key = '';
  return {
    frame(S, ctx) {
      const k = `${ctx.info.id}:${ctx.mode}`;
      if (k !== key) { key = k; opt.words(words(ctx.info, ctx.D, ctx.mode)); }
      box.classList.toggle('is-paper', ctx.paper > 0.5);
      box.style.setProperty('--dw-accent', ctx.accent);
      // the chapter's own presence: from the first ink to the guitar's way back
      box.style.opacity = (sm(0.6, 1.0, S.at) * (1 - sm(4.4, 4.75, S.at))).toFixed(3);
      opt.frame(S, ctx);
    },
    hide() { box.style.opacity = 0; },
  };
}

// a title written as an SVG line that inks itself (the stroke draws, then the fill comes in)
const inkTitle = (html) => `<svg class="dw__ink" aria-hidden="true"><text x="0" y="0.82em">${html.replace(/<em>/g, '<tspan class="dw__em">').replace(/<\/em>/g, '</tspan>')}</text></svg><span class="dw__sr">${html.replace(/<[^>]+>/g, '')}</span>`;
function fitInk(el) {
  const svg = $('svg', el), t = $('text', svg);
  if (!t) return;
  const b = t.getBBox();
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(b.width + 4)} ${Math.ceil(b.height + 6)}`);
  svg.style.width = `${b.width + 4}px`; svg.style.height = `${b.height + 6}px`;
}
function inkTo(el, k) {
  const t = $('text', el);
  if (!t) return;
  t.style.strokeDashoffset = `${(1 - clamp01(k / 0.75)) * 2400}`;
  t.style.fillOpacity = clamp01((k - 0.55) / 0.45).toFixed(3);
}

/* ===================================================== 01 · Title Block === */
function block(box) {
  box.innerHTML = `
    <div class="dw__head" data-head>
      <div class="dw__t" data-t0></div><i class="dw__strike" data-strike></i>
      <div class="dw__t dw__t--b" data-t1></div>
      <p class="dw__x" data-x></p>
    </div>
    <div class="dw__block" aria-hidden="true">
      <div class="dw__cell dw__cell--name"><span>KVELD</span><b data-name></b></div>
      <div class="dw__cell"><i>Sheet</i><span data-sheet>01 of 02</span></div>
      <div class="dw__cell"><i>Scale</i><span>1 : 1</span></div>
      <div class="dw__cell"><i>Units</i><span>Inches</span></div>
      <div class="dw__cell"><i>Drawn</i><span>By hand. Twice.</span></div>
    </div>`;
  const el = { t0: $('[data-t0]', box), t1: $('[data-t1]', box), x: $('[data-x]', box), strike: $('[data-strike]', box), name: $('[data-name]', box), sheet: $('[data-sheet]', box) };
  let W = null, nameChars = [];
  return {
    words(w) {
      W = w;
      el.t0.innerHTML = inkTitle(w.beats[0].title); el.t1.innerHTML = inkTitle(w.beats[1].title);
      requestAnimationFrame(() => { fitInk(el.t0); fitInk(el.t1); });
      el.name.innerHTML = [...w.name.toUpperCase()].map((c) => `<span>${c}</span>`).join('');
      nameChars = [...el.name.children];
    },
    frame(S) {
      if (!W) return;
      const b = S.beat;
      // the name inks into the block as the plan draws, letter after letter
      nameChars.forEach((c, i) => { c.style.opacity = clamp01(S.draw * (nameChars.length + 1) - i).toFixed(3); });
      el.sheet.textContent = b ? '02 of 02' : '01 of 02';
      // beat one: the headline inks with the copy. Beat two: it is struck out, and the second written under it
      inkTo(el.t0, b === 0 ? S.copy : 1);
      el.t0.style.opacity = b === 0 ? 1 : (1 - 0.65 * clamp01(S.copy * 2)).toFixed(3);
      el.strike.style.transform = `scaleX(${b === 0 ? 0 : clamp01(S.copy * 2.2).toFixed(3)})`;
      inkTo(el.t1, b === 1 ? clamp01(S.copy * 1.3 - 0.3) : 0);
      el.t1.style.display = b === 1 ? '' : 'none';
      el.x.textContent = W.beats[b].text;
      el.x.style.opacity = clamp01((S.copy - 0.45) / 0.55).toFixed(3);
    },
  };
}

/* ===================================================== 02 · Margin Notes === */
// where the four notes sit round the sheet, as fractions of the screen, and where their pen lines point
const SPOTS = [[0.06, 0.18, 0.36, 0.42], [0.66, 0.14, 0.6, 0.38], [0.07, 0.72, 0.34, 0.6], [0.7, 0.74, 0.62, 0.6]];
function notes(box) {
  box.innerHTML = `
    <svg class="dw__lines" aria-hidden="true">${SPOTS.map(() => '<path/>').join('')}</svg>
    ${SPOTS.map((s, i) => `<p class="dw__note" data-i="${i}"><span></span></p>`).join('')}
    <p class="dw__tag"><b data-name></b><i data-beat>The drawing</i></p>`;
  const notesEl = $$('.dw__note', box), paths = $$('.dw__lines path', box), nm = $('[data-name]', box), beat = $('[data-beat]', box);
  let W = null, shownBeat = -1;
  return {
    words(w) { W = w; nm.textContent = w.name; shownBeat = -1; },
    frame(S, ctx) {
      if (!W) return;
      const b = S.beat, vw = box.clientWidth, vh = box.clientHeight;
      if (b !== shownBeat) { shownBeat = b; notesEl.forEach((n, i) => { n.firstElementChild.textContent = W.notes[b][i]; }); beat.textContent = b ? 'Off the page' : 'The drawing'; }
      // each note writes itself in turn as the copy comes: its pen line first, then the words
      notesEl.forEach((n, i) => {
        const k = clamp01(S.copy * 1.6 - i * 0.18);
        const [x, y, tx, ty] = SPOTS[i], phone = vw < 900;
        const nx = (phone ? 0.06 : x) * vw, ny = (phone ? 0.16 + i * 0.07 : y) * vh;
        n.style.transform = `translate3d(${nx.toFixed(1)}px, ${ny.toFixed(1)}px, 0)`;
        n.style.clipPath = `inset(0 ${((1 - clamp01((k - 0.3) / 0.7)) * 100).toFixed(1)}% 0 0)`;
        const sx = nx + (x > 0.5 ? -8 : n.offsetWidth + 8), sy = ny + 12, ex = tx * vw, ey = ty * vh;
        const d = clamp01(k / 0.4);
        paths[i].setAttribute('d', phone ? '' : `M${sx.toFixed(1)} ${sy.toFixed(1)}L${(sx + (ex - sx) * d).toFixed(1)} ${(sy + (ey - sy) * d).toFixed(1)}`);
      });
    },
  };
}

/* ========================================================= 03 · Big Name === */
function name(box) {
  box.innerHTML = `
    <p class="dw__big" aria-hidden="true" data-big></p>
    <div class="dw__under"><div class="dw__t" data-t></div><p class="dw__x" data-x></p></div>`;
  const big = $('[data-big]', box), t = $('[data-t]', box), x = $('[data-x]', box);
  let W = null, chars = [], beatShown = -1;
  return {
    words(w) {
      W = w; beatShown = -1;
      big.innerHTML = [...w.name.toUpperCase()].map((c) => `<span class="dw__l"><span>${c}</span></span>`).join('');
      chars = $$('.dw__l > span', big);
    },
    frame(S) {
      if (!W) return;
      const b = S.beat;
      if (b !== beatShown) { beatShown = b; t.innerHTML = inkTitle(W.beats[b].title); requestAnimationFrame(() => fitInk(t)); x.textContent = W.beats[b].text; }
      // the name: traced in letter by letter with the plan (a pen line rising through each letter), inked
      // solid as the dimensions land, and when the guitar rises off the sheet its letters lift and fade
      const n = chars.length;
      chars.forEach((c, i) => {
        const k = clamp01(S.draw * (n + 1.5) - i);
        c.style.clipPath = `inset(${((1 - k) * 100).toFixed(1)}% 0 0 0)`;
        c.style.setProperty('--ink', (sm(0.75, 1, k) * sm(0.2, 0.7, S.draw)).toFixed(3));
        const lift = clamp01(S.rise * (n + 2) - (n - i));
        c.parentElement.style.transform = `translate3d(0, ${(-lift * 60).toFixed(1)}px, 0) rotate(${(-lift * 6).toFixed(2)}deg)`;
        c.parentElement.style.opacity = (1 - lift * 0.9).toFixed(3);
      });
      inkTo(t, S.copy);
      x.style.opacity = clamp01((S.copy - 0.45) / 0.55).toFixed(3);
    },
  };
}
