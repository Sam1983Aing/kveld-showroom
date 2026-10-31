// The one sound switch (V7 final, 2026-10-31). It lives in the header, and Hear them's button is another
// view of it. Off until someone turns it on: browsers only let sound start from a gesture, and a page
// that makes noise unasked is rude. It holds the one audio context, shared by the voices (voices.js) and
// the room (ambience.js), so turning it off silences both in one go. The choice is not remembered across
// visits on purpose: every visit starts quiet.
let ctx = null, bus = null, on = false;
const SR = 44100, subs = new Set();

export const sound = {
  get on() { return on; },
  /** the context, made on first use. Call from a click or a tap the first time. */
  ctx() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR, latencyHint: 'interactive' });
    bus = ctx.createGain();
    bus.connect(ctx.destination);
    return ctx;
  },
  /** where everything sounds into. Off fades this, so nothing clicks */
  bus() { this.ctx(); return bus; },
  set(v) {
    if (v === on) return;
    on = v;
    const c = this.ctx(), t = c.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setTargetAtTime(v ? 1 : 0, t, v ? 0.05 : 0.18);
    if (v) c.resume();
    else setTimeout(() => { if (!on) c.suspend(); }, 900);     // nothing runs while it is off
    subs.forEach((f) => f(on));
  },
  toggle() { this.set(!on); },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
};
