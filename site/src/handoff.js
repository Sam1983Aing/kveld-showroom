// The hand-offs (V7 final, 2026-10-31). Sam's idea for the workshop, "the sheet", now the way every section
// after the room arrives: it comes up over the one before, which is held in place and sinks back under it,
// and its top corners flatten as it lands. One move, one curve (the scroll itself), so the page reads as one
// thing and not as panels. Each section holds a screen longer than it used to for the next to come up over.
//   riseOver(next, prev, { onRise })    made before next's own pin, because pins are made in page order
//   handoff.rise                        0..1 how far the latest one is up. The sound reads it (ambience.js)
const { ScrollTrigger } = window;
export const handoff = { rise: 0 };

export function riseOver(next, prev, { onRise } = {}) {
  const set = (p) => {
    next.style.setProperty('--rise', (1 - p).toFixed(3));
    if (prev) { prev.style.setProperty('--sink', p.toFixed(3)); prev.classList.toggle('is-under', p > 0); }
    handoff.rise = p > 0 && p < 1 ? p : p >= 1 ? 1 : 0;
    onRise?.(p);
  };
  return ScrollTrigger.create({ trigger: next, start: 'top bottom', end: 'top top',
    onUpdate: (st) => set(st.progress), onLeave: () => set(1), onLeaveBack: () => set(0) });
}
