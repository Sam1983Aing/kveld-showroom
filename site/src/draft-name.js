// The drawing chapter's words: Big Name (V7, picked by Sam on 2026-10-24 from three: Title Block and
// Margin Notes are under the tag alt/v7-options, behind ?ink=). The guitar's name, not its number,
// sits bottom right in the same band as the words on the left. It is traced in letter by letter as the
// plan draws, inked solid as the dimensions land, and its letters lift off one after another when the
// guitar rises off the sheet. The headline writes itself like ink (an SVG line, then its fill).
//   createDraftName(roomEl).frame(S, ctx): S the chapter's state (draft.js sample: beat, copy, draw,
//   rise, at), ctx.info, ctx.D the drawing data, ctx.mode, ctx.paper 0..1, ctx.accent for that page.
//   .hide() when the chapter is not on screen.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function words(D, mode) {
  const scale = `${D.scale.toFixed(2)} in`, nut = `${D.nut_width.toFixed(2)} in`;
  return [
    { title: 'It starts as <em>numbers</em>.', text: `${scale} from nut to saddle, ${nut} across the nut, ${D.frets} frets. We kept every one of them, even the awkward ones.` },
    mode === 'dark'
      ? { title: 'Then the lights come <em>up</em>.', text: 'The same lines stand up, slice by slice, and the finish runs out from the tail. Paper to wood in one scroll.' }
      : { title: 'Then it leaves the <em>page</em>.', text: 'The same lines stand up, slice by slice, and the finish runs out from the bridge. Paper to wood in one scroll.' },
  ];
}

// a headline as an SVG text line that inks itself: the stroke draws, then the fill comes in
const inkTitle = (html) => `<svg class="dw__ink" aria-hidden="true"><text x="0" y="0.82em">${html.replace(/<em>/g, '<tspan class="dw__em">').replace(/<\/em>/g, '</tspan>')}</text></svg><span class="dw__sr">${html.replace(/<[^>]+>/g, '')}</span>`;
function fitInk(el) {
  const svg = $('svg', el), t = svg && $('text', svg);
  if (!t) return;
  const b = t.getBBox();
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(b.width + 4)} ${Math.ceil(b.height + 6)}`);
  svg.style.width = `${b.width + 4}px`;          // its height follows from the viewBox, so it can shrink to fit (styles.css)
}
function inkTo(el, k) {
  const t = $('text', el);
  if (!t) return;
  t.style.strokeDashoffset = `${(1 - clamp01(k / 0.75)) * 2400}`;
  t.style.fillOpacity = clamp01((k - 0.55) / 0.45).toFixed(3);
}

export function createDraftName(roomEl) {
  const box = document.createElement('div');
  box.className = 'dw';
  box.innerHTML = `
    <div class="dw__band">
      <div class="dw__under"><div class="dw__t" data-t></div><p class="dw__x" data-x></p></div>
      <p class="dw__big" aria-hidden="true" data-big></p>
    </div>`;
  roomEl.appendChild(box);
  const big = $('[data-big]', box), t = $('[data-t]', box), x = $('[data-x]', box);
  let key = '', W = null, chars = [], beatShown = -1;
  return {
    frame(S, ctx) {
      const k = `${ctx.info.id}:${ctx.mode}`;
      if (k !== key) {
        key = k; W = words(ctx.D, ctx.mode); beatShown = -1;
        big.innerHTML = [...ctx.info.name.toUpperCase()].map((c) => `<span class="dw__l"><span>${c}</span></span>`).join('');
        chars = $$('.dw__l > span', big);
      }
      box.classList.toggle('is-paper', ctx.paper > 0.5);
      box.style.setProperty('--dw-accent', ctx.accent);
      // the chapter's own presence: from the first ink to the guitar's way back
      box.style.opacity = (sm(0.6, 1.0, S.at) * (1 - sm(4.4, 4.75, S.at))).toFixed(3);
      const b = S.beat;
      if (b !== beatShown) { beatShown = b; t.innerHTML = inkTitle(W[b].title); requestAnimationFrame(() => fitInk(t)); x.textContent = W[b].text; }
      // the name: traced in with the plan (a pen line rising through each letter), inked solid as the
      // dimensions land, and lifting off letter by letter when the guitar rises off the sheet
      const n = chars.length;
      chars.forEach((c, i) => {
        const kk = clamp01(S.draw * (n + 1.5) - i);
        c.style.clipPath = `inset(${((1 - kk) * 100).toFixed(1)}% 0 0 0)`;
        c.style.setProperty('--ink', (sm(0.75, 1, kk) * sm(0.2, 0.7, S.draw)).toFixed(3));
        const lift = clamp01(S.rise * (n + 2) * 2.2 - (n - i));     // gone well before the plan's title block swings under it
        c.parentElement.style.transform = `translate3d(0, ${(-lift * 46).toFixed(1)}px, 0) rotate(${(-lift * 6).toFixed(2)}deg)`;
        c.parentElement.style.opacity = (1 - sm(0.1, 0.8, lift)).toFixed(3);
      });
      inkTo(t, S.copy);
      x.style.opacity = clamp01((S.copy - 0.45) / 0.55).toFixed(3);
    },
    hide() { box.style.opacity = 0; },
  };
}
