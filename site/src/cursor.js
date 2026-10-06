// The pointer: a plectrum. Its tip is the hot spot. It takes the colour of the
// guitar in the centre of the room, swings a little with the hand's speed and
// gives when pressed, like a pick against a string. Over the room it says Drag,
// because the ring turns under the hand. Mouse only: touch screens and pens
// keep what they have. Styles: "pointer" in styles.css.
const { gsap } = window;

export function initCursor({ room, draft, reduced }) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<svg viewBox="-13 -2 26 34"><path d="M0 0C3.4 5 9.6 12 10.6 19 11.4 25 6.6 29.4 0 29.4-6.6 29.4-11.4 25-10.6 19-9.6 12-3.4 5 0 0Z"/></svg><span>Drag</span>';
  document.body.appendChild(el);
  const svg = el.firstChild;
  let x = 0, y = 0, sx = 0, sy = 0, tilt = 0, shown = false, state = '', paper = false, n = 0;

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!shown) {                                      // the native pointer only goes once ours is on screen
      shown = true; sx = x; sy = y;
      document.documentElement.classList.add('has-cursor');
      el.classList.add('is-on');
    }
  }, { passive: true });
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => { shown = false; el.classList.remove('is-on'); });

  gsap.ticker.add(() => {
    if (!shown) return;
    // a short lag, so the pick trails the hand and leans into its speed
    const k = reduced ? 1 : 0.42, nx = sx + (x - sx) * k, ny = sy + (y - sy) * k, vx = nx - sx;
    sx = nx; sy = ny;
    tilt += ((reduced ? 0 : Math.max(-18, Math.min(18, vx * 1.5))) - tilt) * 0.16;
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    svg.style.rotate = `${(-30 + tilt).toFixed(1)}deg`;
    if (n++ % 4) return;                               // what is under it: a few times a second is plenty
    const t = document.elementFromPoint(x, y), r = room();
    let s = '';
    if (t && t.closest('a, button, label, summary, [role="button"]')) s = 'link';
    else if (t && t.classList.contains('room__gl')) s = t.style.cursor === 'pointer' ? 'link' : r && !r.walkState ? 'drag' : '';
    if (s !== state) { el.classList.remove('is-link', 'is-drag'); if (s) el.classList.add(`is-${s}`); state = s; }
    // over the cream sheet (the ink chapter) or a light chapter the pick is drawn in ink
    const d = draft(), p = !!((d && d.S && d.S.paper > 0.5) || (t && t.closest('[data-theme="light"]')));
    if (p !== paper) { paper = p; el.classList.toggle('on-paper', p); }
  });
}
