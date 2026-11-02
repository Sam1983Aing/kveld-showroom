// Automatic quality (V7, 2026-11-02): a machine that cannot hold the frame rate gets a lower render resolution,
// one step at a time, and stays there. The look is the same, only softer. A fast machine never sees it.
// It reads the gaps between frames: two windows of a second each averaging over 28 ms (under about 36 fps) make a
// step. A window with one long gap in it (a tab switch, a guitar arriving) does not count.
//   watchQuality(start, apply): start is the pixel ratio now, apply(ratio) sets a new one.
const { gsap } = window;
const STEPS = [2, 1.5, 1.25, 1, 0.85];

export function watchQuality(start, apply) {
  let ratio = start, last = 0, sum = 0, n = 0, long = false, bad = 0, wait = 2;      // wait: whole windows to skip
  const state = { get ratio() { return ratio; }, steps: 0 };
  gsap.ticker.add(() => {
    const now = performance.now(), gap = now - last;
    last = now;
    if (document.hidden || gap > 1000) { sum = 0; n = 0; long = false; bad = 0; return; }
    if (gap > 300) long = true;
    sum += gap; n++;
    if (sum < 1000) return;
    const avg = sum / n, counted = !long && wait === 0;
    if (wait > 0) wait--;
    sum = 0; n = 0; long = false;
    if (!counted) return;
    bad = avg > 28 ? bad + 1 : 0;
    if (bad < 2) return;
    bad = 0; wait = 2;
    const next = STEPS.find((s) => s < ratio - 0.01);
    if (next === undefined) return;
    ratio = next; state.steps++;
    apply(ratio);
  });
  return state;
}
