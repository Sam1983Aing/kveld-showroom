// Loader options (V7, 2026-10-24, demo-options round): ?loader=strings|ink|halo. Without the switch the
// page keeps its loader (KVELD, a bar and a counter). Each option takes over the .loader element:
//   strings  01 Tuning Up: six strings across the dark, plucked and lit one by one as the page loads,
//            low E first. At the end all six are strummed and the room comes up through them.
//   ink      02 First Line: Floe's outline drawn from its plan in one line as the page loads, its
//            measurements ticking in. At the end the line flares in the guitar's colour and lets go.
//   halo     03 Halo: the hero's arch of light draws itself round as the page loads. At the end it opens
//            out to the size of the hero's halo and the room appears through it.
// makeLoader(slug, el) returns null without a switch, else { progress(p), exit({ intro, done }) }.
// The shown progress runs at a steady pace over at least MIN seconds and waits short of the end for the
// real load, so the idea reads on a fast connection and does not jump on a slow one.
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const MIN = 2.4;

export function makeLoader(slug, el) {
  const make = { strings, ink, halo }[slug];
  if (!make || !el) return null;
  el.classList.add('ld', `ld--${slug}`);
  const opt = make(el);
  // the progress shown: the real one, but no faster than MIN seconds from 0 to 1
  const t0 = performance.now();
  let real = 0, shown = 0, raf = 0, waiting = null;
  const tick = () => {
    // a steady pace that never gets ahead of the real load at the end: while the real progress stalls
    // (models are fetched in one go) it moves on at most of the pace, and waits short of 1 for the real 1
    const cap = (performance.now() - t0) / 1000 / MIN;
    shown = Math.min(cap, 1, real >= 1 ? 1 : Math.min(0.92, Math.max(real, 0.85 * cap)));
    opt.draw(shown);
    if (waiting && shown >= 1) { const w = waiting; waiting = null; w(); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return {
    progress(p) { real = Math.max(real, p); },
    exit({ intro, done }) {
      real = 1;
      waiting = () => { cancelAnimationFrame(raf); opt.exit(intro, () => { el.remove(); done(); }); };
    },
  };
}

const pct = (p) => String(Math.round(p * 100)).padStart(3, '0');

/* ========================================================== 01 · Tuning Up === */
const NOTES = ['E', 'A', 'D', 'G', 'B', 'E'];
function strings(el) {
  el.innerHTML = `
    <p class="ld__mark">KVELD</p>
    <svg class="ld__strings" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
      <rect class="ld__nut" x="0" y="4" width="6" height="112"/>
      ${NOTES.map((_, i) => `<path class="ld__str" data-i="${i}" d="M8 ${100 - i * 17}H1000" style="stroke-width:${(2.4 - i * 0.32).toFixed(2)}"/>`).join('')}
    </svg>
    <ol class="ld__notes" aria-hidden="true">${NOTES.map((n, i) => `<li style="top:${((100 - i * 17) / 120 * 100).toFixed(1)}%">${n}</li>`).join('')}</ol>
    <p class="ld__count"><span data-c>000</span><i>Tuning</i></p>`;
  const paths = $$('.ld__str', el), notes = $$('.ld__notes li', el), c = $('[data-c]', el);
  const plucked = new Array(6).fill(-1);
  const wave = (i, amp, t) => {
    const y = 100 - i * 17;
    let d = `M8 ${y}`;
    for (let k = 1; k <= 50; k++) { const x = 8 + k * 19.84, env = Math.sin(Math.PI * k / 50); d += `L${x.toFixed(1)} ${(y + amp * env * Math.sin(k * 0.9 - t * (34 - i * 3))).toFixed(2)}`; }
    paths[i].setAttribute('d', d);
  };
  let strum = -1;
  return {
    draw(p) {
      const now = performance.now() / 1000;
      c.textContent = pct(p);
      paths.forEach((path, i) => {
        if (p >= (i + 0.6) / 6.6 && plucked[i] < 0) { plucked[i] = now; path.classList.add('is-on'); notes[i].classList.add('is-on'); }
        const since = plucked[i] < 0 ? -1 : now - plucked[i], s2 = strum < 0 ? -1 : now - strum;
        const a = (since >= 0 ? 9 * Math.exp(-since * 2.4) : 0) + (s2 >= 0 ? 12 * Math.exp(-s2 * 1.6) : 0);
        wave(i, a, now);
      });
    },
    exit(intro, done) {
      strum = performance.now() / 1000;
      const f = () => { this.draw(1); if (performance.now() / 1000 - strum < 1.6) requestAnimationFrame(f); };
      requestAnimationFrame(f);
      intro();
      gsap.to(el, { autoAlpha: 0, duration: 1.3, ease: 'expo.inOut', delay: 0.35, onComplete: done });
      gsap.to($('.ld__strings', el), { scaleY: 3.5, opacity: 0, duration: 1.4, ease: 'expo.in', delay: 0.2 });
    },
  };
}

/* ========================================================= 02 · First Line === */
function ink(el) {
  el.innerHTML = `
    <svg class="ld__plan" aria-hidden="true"><path class="ld__line"/><g class="ld__dims"></g></svg>
    <div class="ld__foot"><p class="ld__mark">KVELD</p><p class="ld__count"><span data-c>000</span><i>Drawing · sheet 1 of 1</i></p></div>`;
  const svg = $('svg', el), line = $('.ld__line', el), dims = $('.ld__dims', el), c = $('[data-c]', el);
  let len = 0, ready = false, D = null;
  fetch('assets/data/floe.json').then((r) => r.json()).then((d) => {
    D = d;
    const pts = [...d.body_outline, ...d.neck], xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = 1000 / (x1 - x0);
    const P = (p) => `${((p[0] - x0) * k).toFixed(1)} ${((y1 - p[1]) * k).toFixed(1)}`;
    line.setAttribute('d', `M${d.body_outline.map(P).join('L')}Z M${d.neck.map(P).join('L')}Z`);
    const H = (y1 - y0) * k;
    svg.setAttribute('viewBox', `-20 -60 1040 ${(H + 140).toFixed(0)}`);
    dims.innerHTML = `
      <path d="M0 ${H + 40}H1000M0 ${H + 30}v20M1000 ${H + 30}v20"/><text x="500" y="${H + 70}">OVERALL ${(x1 - x0).toFixed(2)}</text>
      <path d="M-14 0V${H}M-24 0h20M-24 ${H}h20"/><text x="-30" y="${H / 2}" transform="rotate(-90 -30 ${H / 2})">${(y1 - y0).toFixed(2)}</text>`;
    len = line.getTotalLength();
    line.style.strokeDasharray = `${len} ${len}`;
    ready = true;
  });
  return {
    draw(p) {
      c.textContent = pct(p);
      if (!ready) return;
      line.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
      dims.style.opacity = clamp01((p - 0.55) / 0.3).toFixed(3);
    },
    exit(intro, done) {
      el.classList.add('is-done');
      gsap.timeline()
        .to(svg, { scale: 1.06, duration: 0.6, ease: 'expo.out' })
        .add(intro, 0.35)
        .to(svg, { scale: 1.6, opacity: 0, duration: 1.2, ease: 'expo.in' }, 0.5)
        .to(el, { autoAlpha: 0, duration: 1.1, ease: 'expo.inOut', onComplete: done }, 0.6);
    },
  };
}

/* ============================================================== 03 · Halo === */
// the arch: open at the bottom by 0.68 of a turn, like the hero's (showroom.js halo)
function halo(el) {
  const SPAN = Math.PI * 1.32, R = 160;
  // from the bottom left, over the top, to the bottom right (the gap of 0.68 of a half turn at the bottom)
  const gap = 2 * Math.PI - SPAN, a0 = -Math.PI / 2 - gap / 2, a1 = -Math.PI / 2 + gap / 2;
  const sx = 200 + R * Math.cos(a0), sy = 200 - R * Math.sin(a0), ex = 200 + R * Math.cos(a1), ey = 200 - R * Math.sin(a1);
  el.innerHTML = `
    <div class="ld__ring">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <path class="ld__track" d="M${sx.toFixed(1)} ${sy.toFixed(1)}A${R} ${R} 0 1 1 ${ex.toFixed(1)} ${ey.toFixed(1)}"/>
        <path class="ld__arc" d="M${sx.toFixed(1)} ${sy.toFixed(1)}A${R} ${R} 0 1 1 ${ex.toFixed(1)} ${ey.toFixed(1)}"/>
        <circle class="ld__tip" r="4"/>
      </svg>
      <div class="ld__in"><p class="ld__mark">KVELD</p><p class="ld__count"><span data-c>000</span></p></div>
    </div>`;
  const arc = $('.ld__arc', el), tip = $('.ld__tip', el), c = $('[data-c]', el), ring = $('.ld__ring', el);
  const len = arc.getTotalLength();
  arc.style.strokeDasharray = `${len} ${len}`;
  return {
    draw(p) {
      c.textContent = pct(p);
      arc.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
      const P = arc.getPointAtLength(len * p);
      tip.setAttribute('cx', P.x); tip.setAttribute('cy', P.y);
      tip.style.opacity = p > 0.01 && p < 0.995 ? 1 : 0;
    },
    exit(intro, done) {
      // the arch opens out to about the size of the hero's halo, and the dark opens with it
      const o = { r: 0 };
      const vmax = Math.max(innerWidth, innerHeight);
      gsap.timeline()
        .to($('.ld__in', el), { opacity: 0, y: -10, duration: 0.4, ease: 'expo.in' })
        .add(intro, 0.15)
        .to(ring, { scale: () => Math.min(innerWidth, innerHeight) * 0.92 / ring.offsetWidth, duration: 1.4, ease: 'expo.inOut' }, 0.1)
        .to(o, { r: vmax * 0.75, duration: 1.5, ease: 'expo.inOut', onUpdate: () => {
          const m = `radial-gradient(circle at 50% 52%, transparent ${o.r.toFixed(0)}px, #000 ${(o.r + 60).toFixed(0)}px)`;
          el.style.webkitMaskImage = m; el.style.maskImage = m;
        } }, 0.25)
        .to(ring, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 1.0)
        .add(done, 1.75);
    },
  };
}
