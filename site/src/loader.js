// The loader: Halo (V7, picked by Sam on 2026-10-24 from three: "simple and creative". Tuning Up and
// First Line are under the tag alt/v7-loaders, behind ?loader=). The hero's arch of light draws itself
// round as the page loads, KVELD and the count inside it. When the page is ready the arch opens out to
// about the size of the hero's halo and the dark opens with it, so the room appears through the arch.
// The markup is in index.html, so the arch's track is on screen before any script has loaded.
//   createLoader(el).progress(p)        the real progress, 0..1 (downloads to 0.8, then the page's own steps)
//   .exit({ intro, done, reduced })      once the page is ready: intro() turns the room's lights on
// The arc moves at a steady pace over at least MIN seconds, but never past 80% before the downloads are
// in, nor past the real progress after that. So it reads on a fast connection, and on a slow one it
// neither jumps (the models arrive in one go) nor sits at 100 while the page finishes its own steps.
const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);
const MIN = 2.4;

export function createLoader(el) {
  const arc = $('.loader__arc', el), tip = $('.loader__tip', el), count = $('[data-count]', el), ring = $('.loader__ring', el);
  const len = arc.getTotalLength();
  arc.style.strokeDasharray = `${len} ${len}`;
  const draw = (p) => {
    count.textContent = String(Math.round(p * 100)).padStart(3, '0');
    arc.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
    const P = arc.getPointAtLength(len * p);
    tip.setAttribute('cx', P.x.toFixed(1)); tip.setAttribute('cy', P.y.toFixed(1));
    tip.style.opacity = p > 0.01 && p < 0.995 ? 1 : 0;
  };
  const t0 = performance.now();
  let real = 0, raf = 0, waiting = null;
  const tick = () => {
    const pace = (performance.now() - t0) / 1000 / MIN;
    const shown = Math.min(pace, 1, real >= 1 ? 1 : Math.min(Math.max(real, 0.8), Math.max(real, 0.85 * pace)));
    draw(shown);
    if (waiting && shown >= 1) { const w = waiting; waiting = null; w(); return; }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  function open(intro, done) {
    // the arch opens out to about the size of the hero's halo, and the dark opens with it
    const o = { r: 0 }, far = Math.hypot(innerWidth, innerHeight) * 0.6;
    gsap.timeline()
      .to($('.loader__in', el), { opacity: 0, y: -10, duration: 0.4, ease: 'expo.in' })
      .add(intro, 0.15)
      .to(ring, { scale: () => Math.min(innerWidth, innerHeight) * 0.92 / ring.offsetWidth, duration: 1.4, ease: 'expo.inOut' }, 0.1)
      .to(o, { r: far, duration: 1.5, ease: 'expo.inOut', onUpdate: () => {
        const m = `radial-gradient(circle at 50% 52%, transparent ${o.r.toFixed(0)}px, #000 ${(o.r + 60).toFixed(0)}px)`;
        el.style.webkitMaskImage = m; el.style.maskImage = m;
      } }, 0.25)
      .to(ring, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 1.0)
      .add(() => { el.remove(); done(); }, 1.75);
  }

  return {
    progress(p) { real = Math.max(real, p); },
    exit({ intro, done, reduced }) {
      real = 1;
      // reduced motion: the arch is drawn whole and the loader simply goes
      if (reduced) { cancelAnimationFrame(raf); draw(1); intro(); el.remove(); done(); return; }
      waiting = () => open(intro, done);
    },
  };
}
