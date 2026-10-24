// The close-up tour's words and progress: Callout (V7, picked by Sam on 2026-10-24 from three: Chapter
// and Viewfinder are under the tag alt/v7-options, behind ?walk=). The words stand beside the part the
// camera is on, with a line to it, and change side as the part moves across the screen. The progress is
// a ruler down the guitar's real length, each stop a tick at its place, a light at the one you are on.
//   createCallout(walkEl).frame(W, ctx) every frame of the tour: W the walk state (stop, copy 0..1),
//   ctx.anchor() the part on screen (showroom.js walkAnchor), ctx.stops, ctx.info, ctx.along() where
//   each stop sits along the guitar, 0 headstock to 1 tail.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const pad = (n) => String(n).padStart(2, '0');
// the title, in a mask, rising with W.copy
const titleHTML = (t) => `<span class="wo__mask"><span class="wo__rise">${t}</span></span>`;

export function createCallout(walkEl) {
  const box = document.createElement('div');
  box.className = 'wo';
  walkEl.appendChild(box);
  const opt = callout(box);
  return { box, frame: opt.frame };
}

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
