// The close-up tour's words and progress, three options behind ?walk=callout|chapter|lens (V7, 2026-10-24,
// demo-options round). Sam: the tour is "super cinematic", but the words always sit on the left with a
// small text animation, and the progress bar along the bottom feels generic. Without the switch the tour
// keeps its words and rail (main.js walkFrame).
//   callout   01 Callout: the words stand beside the part the camera is on, a line to it, changing side
//             as the part moves. The progress is a ruler down the guitar's real length.
//   chapter   02 Chapter: a huge outlined word for the part, the words in a different corner each stop.
//             The progress is the guitar's own outline from the drawing, filling as you go along it.
//   lens      03 Viewfinder: corner brackets closing on the part, focus readouts, a caption. The progress
//             is a lens's focus scale sliding under a fixed mark.
// frame(W, ctx) runs every frame of the tour: W the walk state (stop, copy 0..1, lift, outro), ctx.anchor()
// the part on screen, ctx.stops the stops, ctx.prog 0..1 along the tour, ctx.info the guitar.
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const pad = (n) => String(n).padStart(2, '0');
const IN = 0.0254;

let cssP = null;
const css = () => cssP ||= new Promise((ok) => {
  const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('../walk-options.css', import.meta.url).href + '?v=2' });
  l.onload = l.onerror = ok; document.head.appendChild(l);
});

export async function buildWalk(slug, walkEl, deps) {
  const make = { callout, chapter, lens }[slug];
  if (!make) return null;
  await css();
  walkEl.classList.add('walk--opt', `walk--${slug}`);
  const box = document.createElement('div');
  box.className = `wo wo--${slug}`;
  walkEl.appendChild(box);
  return make(box, deps);
}

// the copy for a stop, with the title split into masked lines that rise with W.copy
const titleHTML = (t) => `<span class="wo__mask"><span class="wo__rise">${t}</span></span>`;

/* ========================================================== 01 · Callout === */
function callout(box) {
  box.innerHTML = `
    <svg class="wo__lead" aria-hidden="true"><circle class="wo__ring" r="7"/><circle class="wo__dot" r="2.4"/><path data-lead/></svg>
    <div class="wo__copy" data-copy>
      <p class="wo__no"><span data-no>01</span><b data-label></b></p>
      <h3 class="wo__title" data-title></h3>
      <p class="wo__text" data-text></p>
    </div>
    <div class="wo__ruler" aria-hidden="true"><p class="wo__rk" data-rk></p><i class="wo__rline"><b data-rfill></b></i><ol data-ticks></ol><span class="wo__rnow" data-rnow></span></div>`;
  const el = { copy: $('[data-copy]', box), no: $('[data-no]', box), label: $('[data-label]', box), title: $('[data-title]', box), text: $('[data-text]', box),
    lead: $('[data-lead]', box), ring: $('.wo__ring', box), dot: $('.wo__dot', box), ticks: $('[data-ticks]', box), fill: $('[data-rfill]', box), now: $('[data-rnow]', box), rk: $('[data-rk]', box) };
  let at = -2, side = 1, forGuitar = '', pos = [];
  return {
    frame(W, ctx) {
      // the ruler: one tick per stop, placed where its part sits along the guitar, headstock at the top
      if (ctx.info.id !== forGuitar) {
        forGuitar = ctx.info.id;
        pos = ctx.along();
        el.rk.textContent = `${ctx.info.name} · up close`;
        el.ticks.innerHTML = ctx.stops.map((s, i) => `<li style="top:${(pos[i] * 100).toFixed(1)}%"><span>${s.label}</span></li>`).join('');
      }
      const s = ctx.stops[W.stop];
      if (W.stop !== at && s) {
        at = W.stop;
        el.no.textContent = pad(W.stop + 1); el.label.textContent = s.label; el.title.innerHTML = titleHTML(s.title); el.text.textContent = s.text;
      }
      $$('li', el.ticks).forEach((li, i) => { li.classList.toggle('is-on', i === W.stop); li.classList.toggle('is-done', i < W.stop); });
      const here = W.stop < 0 ? 0 : pos[W.stop] ?? 1;
      el.fill.style.transform = `scaleY(${here.toFixed(4)})`;
      el.now.style.top = `${(here * 100).toFixed(2)}%`;
      // the callout: beside the part, on the side with room, the line drawn as the copy arrives
      const a = ctx.anchor(), c = W.stop >= 0 ? W.copy : 0;
      el.copy.style.opacity = Math.min(c * 1.5, 1);
      $('.wo__rise', el.title)?.style.setProperty('transform', `translate3d(0, ${((1 - c) * 110).toFixed(1)}%, 0)`);
      el.text.style.opacity = clamp01((c - 0.3) / 0.7);
      if (!a) return;
      const vw = box.clientWidth, vh = box.clientHeight, phone = vw < 900;
      if (c < 0.05) side = a[0] > vw * 0.5 ? -1 : 1;           // pick the side while the copy is away
      const cw = el.copy.offsetWidth, chh = el.copy.offsetHeight;
      let x = phone ? 20 : a[0] + side * Math.min(vw * 0.12, 200) - (side < 0 ? cw : 0);
      x = Math.min(Math.max(x, 24), vw - cw - 24);
      const y = phone ? vh - chh - 110 : Math.min(Math.max(a[1] - chh * 0.5 - vh * 0.08, 90), vh - chh - 120);
      el.copy.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const ex = side > 0 || phone ? x - 14 : x + cw + 14, ey = y + 18;
      const draw = clamp01(c * 1.4);
      el.ring.setAttribute('cx', a[0]); el.ring.setAttribute('cy', a[1]); el.dot.setAttribute('cx', a[0]); el.dot.setAttribute('cy', a[1]);
      el.ring.style.opacity = el.dot.style.opacity = draw;
      el.lead.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${(a[0] + (ex - a[0]) * draw).toFixed(1)} ${(a[1] + (ey - a[1]) * draw).toFixed(1)}`);
    },
  };
}

/* ========================================================== 02 · Chapter === */
const CORNERS = ['tl', 'br', 'tr', 'bl'];
function chapter(box, deps) {
  box.innerHTML = `
    <p class="wo__huge" aria-hidden="true"><span data-huge></span></p>
    <div class="wo__copy" data-copy>
      <p class="wo__no"><span data-no>01</span><i data-of>/ 07</i><b data-label></b></p>
      <h3 class="wo__title" data-title></h3>
      <p class="wo__text" data-text></p>
    </div>
    <div class="wo__map" aria-hidden="true"><svg data-map><path class="wo__mbase"/><path class="wo__mfill"/><circle class="wo__mdot" r="5"/></svg><p class="wo__mk" data-mk></p></div>`;
  const el = { huge: $('[data-huge]', box), copy: $('[data-copy]', box), no: $('[data-no]', box), of: $('[data-of]', box), label: $('[data-label]', box), title: $('[data-title]', box), text: $('[data-text]', box),
    map: $('[data-map]', box), base: $('.wo__mbase', box), mfill: $('.wo__mfill', box), dot: $('.wo__mdot', box), mk: $('[data-mk]', box) };
  let at = -2, forGuitar = '', pos = [], len = 1, ready = false;
  // the guitar's outline from its drawing, lying down, headstock to the right, as one path
  const outline = async (info) => {
    const D = await deps.sheet(info.id);
    const xs = [...D.body_outline, ...D.neck].map((p) => p[0]), ys = [...D.body_outline, ...D.neck].map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = 300 / (x1 - x0);
    const d = (pts) => `M${pts.map((p) => `${((p[0] - x0) * k).toFixed(1)} ${((y1 - p[1]) * k).toFixed(1)}`).join('L')}Z`;
    el.map.setAttribute('viewBox', `-8 -8 316 ${((y1 - y0) * k + 16).toFixed(1)}`);
    el.base.setAttribute('d', d(D.body_outline) + d(D.neck));
    el.mfill.setAttribute('d', d(D.body_outline) + d(D.neck));
    len = el.mfill.getTotalLength();
    ready = true;
  };
  return {
    frame(W, ctx) {
      if (ctx.info.id !== forGuitar) { forGuitar = ctx.info.id; ready = false; pos = ctx.along(); outline(ctx.info); el.of.textContent = `/ ${pad(ctx.stops.length)}`; el.mk.textContent = `${ctx.info.name} · up close`; }
      const s = ctx.stops[W.stop];
      if (W.stop !== at && s) {
        at = W.stop;
        el.no.textContent = pad(W.stop + 1); el.label.textContent = s.label; el.title.innerHTML = titleHTML(s.title); el.text.textContent = s.text;
        el.huge.innerHTML = [...s.label.toUpperCase()].map((ch) => `<span class="wo__ch">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
        // as big as fits: the display face is wide, about 1.1 em a letter
        el.huge.style.fontSize = `${Math.min(innerWidth * 0.15, (box.clientWidth * 0.9) / (s.label.length * 1.12)).toFixed(0)}px`;
        box.dataset.corner = CORNERS[W.stop % 4];
      }
      const c = W.stop >= 0 ? W.copy : 0;
      el.copy.style.opacity = Math.min(c * 1.5, 1);
      $('.wo__rise', el.title)?.style.setProperty('transform', `translate3d(0, ${((1 - c) * 110).toFixed(1)}%, 0)`);
      el.text.style.opacity = clamp01((c - 0.3) / 0.7);
      // the huge word: its letters rise one after another with the copy
      const chs = el.huge.children, n = chs.length;
      for (let i = 0; i < n; i++) { const k = clamp01(c * (1 + n * 0.08) - i * 0.08); chs[i].style.transform = `translate3d(0, ${((1 - k) * 100).toFixed(1)}%, 0)`; }
      // the map: the outline drawn as far as the tour has come, a dot at the part (headstock first)
      if (ready) {
        // the map lies with the headstock to the right: a part's place along the guitar is its x
        const here = W.stop < 0 ? 0 : pos[W.stop] ?? 1, vb = el.map.viewBox.baseVal;
        el.dot.setAttribute('cx', (300 * (1 - here)).toFixed(1)); el.dot.setAttribute('cy', (vb.y + vb.height / 2).toFixed(1));
        el.mfill.style.strokeDasharray = `${len} ${len}`;
        el.mfill.style.strokeDashoffset = `${(len * (1 - ctx.prog)).toFixed(1)}`;
      }
    },
  };
}

/* ======================================================= 03 · Viewfinder === */
function lens(box) {
  box.innerHTML = `
    <div class="wo__frame" data-frame aria-hidden="true"><i></i><i></i><i></i><i></i><span class="wo__cross"></span>
      <p class="wo__hud wo__hud--tl" data-hud-a></p><p class="wo__hud wo__hud--tr" data-hud-b></p><p class="wo__hud wo__hud--bl" data-hud-c></p>
    </div>
    <div class="wo__copy" data-copy>
      <h3 class="wo__title" data-title></h3>
      <p class="wo__text" data-text></p>
    </div>
    <div class="wo__scale" aria-hidden="true"><i class="wo__mark"></i><div class="wo__track" data-track></div><p class="wo__sk" data-sk></p></div>`;
  const el = { frame: $('[data-frame]', box), a: $('[data-hud-a]', box), b: $('[data-hud-b]', box), c: $('[data-hud-c]', box), copy: $('[data-copy]', box), title: $('[data-title]', box), text: $('[data-text]', box), track: $('[data-track]', box), sk: $('[data-sk]', box) };
  let at = -2, forGuitar = '', fx = 0, fy = 0, fs = 0;
  const STEP = 150;                   // px between stops on the focus scale
  return {
    frame(W, ctx) {
      if (ctx.info.id !== forGuitar) {
        forGuitar = ctx.info.id;
        el.sk.textContent = `${ctx.info.name} · up close`;
        el.track.innerHTML = ctx.stops.map((s, i) => `<span style="left:${i * STEP}px"><b>${pad(i + 1)}</b>${s.label}</span>`).join('') + Array.from({ length: ctx.stops.length * 6 }, (_, i) => `<i style="left:${i * STEP / 6}px"></i>`).join('');
      }
      const s = ctx.stops[W.stop];
      if (W.stop !== at && s) {
        at = W.stop;
        el.title.innerHTML = titleHTML(s.title); el.text.textContent = s.text;
        el.a.textContent = `${pad(W.stop + 1)} / ${pad(ctx.stops.length)} · ${s.label}`;
        el.b.textContent = `${ctx.info.name}`;
      }
      const c = W.stop >= 0 ? W.copy : 0;
      el.copy.style.opacity = Math.min(c * 1.5, 1);
      $('.wo__rise', el.title)?.style.setProperty('transform', `translate3d(0, ${((1 - c) * 110).toFixed(1)}%, 0)`);
      el.text.style.opacity = clamp01((c - 0.3) / 0.7);
      // the brackets close on the part as the camera settles, and open between stops
      const a = ctx.anchor(), vw = box.clientWidth, vh = box.clientHeight;
      if (a) {
        const size = Math.min(vw, vh) * (0.62 - 0.22 * c);
        fx += (a[0] - fx) * 0.25; fy += (a[1] - fy) * 0.25; fs += (size - fs) * 0.2;
        el.frame.style.transform = `translate3d(${(fx - fs / 2).toFixed(1)}px, ${(fy - fs / 2).toFixed(1)}px, 0)`;
        el.frame.style.width = el.frame.style.height = `${fs.toFixed(1)}px`;
        el.frame.style.opacity = (0.35 + 0.65 * c).toFixed(2);
        el.frame.classList.toggle('is-sharp', c > 0.92);
        el.c.textContent = `Focus ${(0.08 + 0.5 * (1 - c)).toFixed(2)} m · f/2.8`;
      }
      // the focus scale slides under the mark
      el.track.style.transform = `translate3d(${(-ctx.prog * (ctx.stops.length - 1) * STEP).toFixed(1)}px, 0, 0)`;
    },
  };
}
