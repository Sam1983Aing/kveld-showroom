// How to order, three more interactive versions behind ?order=pairs|deck|ticket (V7, 2026-10-24,
// demo-options round). Sam: keep the light mode, but not all four steps on one screen at once: two by
// two, or with some animation, a better transition. Without the switch the section stays as order.js
// builds it. Each option pins the steps and lets the scroll play them; the price list and Book a visit
// stay as they are, after the pin.
//   pairs   01 Two by Two: steps 1 and 2, then 3 and 4, a big number sliding over between the pairs
//   deck    02 Card Deck: four cards stacked on the paper, each scrolled off the top to show the next
//   ticket  03 Order Ticket: a paper order slip that fills in as you scroll, a stamp at the end
const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

let cssP = null;
const css = () => cssP ||= new Promise((ok) => {
  const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('../order-options.css', import.meta.url).href + '?v=2' });
  l.onload = l.onerror = ok; document.head.appendChild(l);
});

export async function enhanceOrder(slug, section, { reduced }) {
  const make = { pairs, deck, ticket }[slug];
  if (!make) return;
  await css();
  section.classList.add('oo', `oo--${slug}`);
  const steps = $$('.order__step', section).map((li) => ({
    no: $('.order__no', li).textContent, title: $('.order__title', li).innerHTML, text: $('.order__text', li).textContent, meta: $('.order__meta', li).textContent,
  }));
  const old = $('.order__steps', section);
  const stage = document.createElement('div');
  stage.className = 'oo__stage';
  old.replaceWith(stage);
  const opt = make(stage, steps);
  ScrollTrigger.create({
    trigger: stage, start: 'top top', end: () => `+=${Math.round(opt.len * innerHeight)}`, pin: true, anticipatePin: 1,
    onUpdate: (st) => opt.update(reduced ? Math.round(st.progress * 4) / 4 : st.progress),
  });
  opt.update(0);
  ScrollTrigger.refresh();
}

const stepHTML = (s, cls = '') => `
  <article class="oo__step ${cls}">
    <span class="oo__no">${s.no}</span>
    <h3 class="oo__title">${s.title}</h3>
    <p class="oo__text">${s.text}</p>
    <p class="oo__meta">${s.meta}</p>
  </article>`;

/* ======================================================= 01 · Two by Two === */
function pairs(stage, S) {
  stage.innerHTML = `
    <div class="oo__pair" data-p="0">${stepHTML(S[0])}${stepHTML(S[1])}</div>
    <div class="oo__pair" data-p="1">${stepHTML(S[2])}${stepHTML(S[3])}</div>
    <p class="oo__huge" aria-hidden="true"><span data-h>01 02</span></p>
    <div class="oo__dots" aria-hidden="true"><i></i><i></i></div>`;
  const P = $$('.oo__pair', stage), huge = $('[data-h]', stage), dots = $$('.oo__dots i', stage);
  return {
    len: 2.4,
    update(p) {
      const k = sm(0.42, 0.62, p);                       // the swap from the first pair to the second
      P[0].style.transform = `translate3d(${(-k * 60).toFixed(2)}vw, 0, 0)`; P[0].style.opacity = (1 - k).toFixed(3);
      P[1].style.transform = `translate3d(${((1 - k) * 60).toFixed(2)}vw, 0, 0)`; P[1].style.opacity = k.toFixed(3);
      // inside each pair, the second step arrives a beat after the first
      $$('.oo__step', P[0]).forEach((s, i) => { const e = sm(0.02 + i * 0.12, 0.2 + i * 0.12, p); s.style.transform = `translate3d(0, ${((1 - e) * 60).toFixed(1)}px, 0)`; s.style.opacity = e.toFixed(3); });
      $$('.oo__step', P[1]).forEach((s, i) => { const e = sm(0.55 + i * 0.1, 0.72 + i * 0.1, p); s.style.transform = `translate3d(0, ${((1 - e) * 60).toFixed(1)}px, 0)`; s.style.opacity = e.toFixed(3); });
      huge.textContent = k < 0.5 ? '01 02' : '03 04';     // the display face has no middle dot
      huge.style.transform = `translate3d(${(-p * 30).toFixed(2)}vw, 0, 0)`;
      dots.forEach((d, i) => d.classList.toggle('is-on', (k < 0.5 ? 0 : 1) === i));
    },
  };
}

/* ======================================================== 02 · Card Deck === */
function deck(stage, S) {
  stage.innerHTML = `
    <div class="oo__deck">${S.map((s, i) => `<div class="oo__card" style="--i:${i}">${stepHTML(s)}<span class="oo__corner">${s.no} / 04</span></div>`).join('')}</div>
    <ol class="oo__count" aria-hidden="true">${S.map((s) => `<li>${s.no}</li>`).join('')}</ol>`;
  const cards = $$('.oo__card', stage), count = $$('.oo__count li', stage);
  return {
    len: 3,
    update(p) {
      const t = p * 3.4;                                // card i leaves between i and i + 1 (the last stays)
      cards.forEach((c, i) => {
        const out = i < 3 ? sm(i + 0.25, i + 0.95, t) : 0;
        const depth = Math.max(0, i - t);               // how far down the pile it still is
        c.style.transform = `translate3d(${(out * -8).toFixed(2)}vw, ${(-out * 115 + depth * 2.2).toFixed(2)}vh, 0) rotate(${(out * -9 + (i % 2 ? 1.4 : -1.2) * Math.min(depth, 1)).toFixed(2)}deg) scale(${(1 - Math.min(depth, 3) * 0.04).toFixed(3)})`;
        c.style.zIndex = String(10 - i);
        c.style.filter = `brightness(${(1 - Math.min(depth, 3) * 0.05).toFixed(3)})`;
      });
      const on = Math.min(3, Math.floor(t + 0.3));
      count.forEach((li, i) => li.classList.toggle('is-on', i === on));
    },
  };
}

/* ===================================================== 03 · Order Ticket === */
function ticket(stage, S) {
  stage.innerHTML = `
    <div class="oo__slip">
      <header class="oo__sh"><b>KVELD</b><span>Order slip · Room 01, Halden</span><i>No. 0417</i></header>
      <ol class="oo__lines">${S.map((s, i) => `
        <li class="oo__line" data-i="${i}">
          <span class="oo__box"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4L16.5 5"/></svg></span>
          <span class="oo__no">${s.no}</span>
          <div><h3 class="oo__title">${s.title}</h3><p class="oo__text">${s.text}</p></div>
          <span class="oo__meta">${s.meta}</span>
        </li>`).join('')}
      </ol>
      <footer class="oo__sf"><span>Signed</span><svg class="oo__sig" viewBox="0 0 220 50" aria-hidden="true"><path d="M6 36c10-18 18-26 24-20s-8 22 2 20 14-26 22-24-4 26 6 24 12-18 20-18 2 14 10 14 16-10 26-10 14 8 24 6 20-8 30-12"/></svg><span class="oo__stamp">Bench reserved</span></footer>
    </div>`;
  const lines = $$('.oo__line', stage), sig = $('.oo__sig path', stage), stamp = $('.oo__stamp', stage);
  const L = sig.getTotalLength(); sig.style.strokeDasharray = L;
  return {
    len: 2.6,
    update(p) {
      lines.forEach((li, i) => {
        const e = sm(0.05 + i * 0.18, 0.2 + i * 0.18, p);
        li.style.setProperty('--w', e.toFixed(3));       // the words write in (a clip from the left)
        li.classList.toggle('is-done', p > 0.2 + i * 0.18 + 0.05);
      });
      sig.style.strokeDashoffset = (L * (1 - sm(0.8, 0.92, p))).toFixed(1);
      const st = sm(0.93, 0.97, p);
      stamp.style.opacity = st.toFixed(3);
      stamp.style.transform = `rotate(-8deg) scale(${(1.8 - 0.8 * st).toFixed(3)})`;
    },
  };
}
