// The seven voices (V7, 2026-10-23): a short phrase per guitar for 02 · Hear them, synthesized in the
// browser. No recordings: each string is a plucked-string model (Karplus-Strong with a damping filter,
// a fractional-delay allpass for tuning, the pick position and the pickup position as combs), then a
// small rig per guitar renders it offline: the pickup's resonance, how hard the amp is driven, a
// cabinet, and the room as a reverb. Rendered once per guitar on first play and kept.
//
//   const v = createVoices()
//   v.play(id)      start a guitar's phrase (needs a user gesture before the first one, browser rules)
//   v.stop()        fade out
//   v.wave(out)     fills a Float32Array with what is playing now (for the halo), returns the level
//   v.render(id)    the rendered AudioBuffer (tools use it to write the phrases to files)
//
// Everything that shapes a voice is in RIG and PHRASE below.

const SR = 44100;
const OPEN = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];      // E A D G B e, string 6 first

// The rig per guitar. pick, pickup: positions along the string (0 bridge, 0.5 middle). humbucker: two
// coils side by side. s: how much each pass of the string loses its highs (0.5 dull, 0.1 bright).
// res: the pickup's resonant peak. drive: amp gain before the clipper. sustain: seconds to fade 60 dB
// on the low E. room: reverb send. body: resonances of a hollow body.
const RIG = {
  floe:  { pick: 0.16, pickup: 0.09, humbucker: false, s: 0.28, res: [4300, 6, 1.6], lp: 7800, drive: 2.2, sustain: 3.0, room: 0.16 },
  sedge: { pick: 0.13, pickup: 0.11, humbucker: true,  s: 0.33, res: [2600, 4, 1.1], lp: 5400, drive: 11, sustain: 3.6, room: 0.12 },
  scree: { pick: 0.14, pickup: 0.12, humbucker: true,  s: 0.34, res: [2200, 5, 1.2], lp: 5000, drive: 8, sustain: 3.6, room: 0.14 },
  moss:  { pick: 0.2,  pickup: 0.19, humbucker: false, s: 0.3,  res: [3300, 3, 1.2], lp: 6400, drive: 1.4, sustain: 3.8, room: 0.38 },
  fjord: { pick: 0.26, pickup: 0.24, humbucker: true,  s: 0.42, res: [1700, 3, 0.9], lp: 3600, drive: 1.5, sustain: 3.2, room: 0.22, body: [[190, 5, 3], [440, 3, 2.5]], soft: true },
  rowan: { pick: 0.22, pickup: 0.23, humbucker: true,  s: 0.36, res: [2000, 4, 1.0], lp: 4600, drive: 16, sustain: 5.5, room: 0.2 },
  heath: { pick: 0.15, pickup: 0.1,  humbucker: false, quack: 0.2, s: 0.27, res: [4000, 4, 1.4], lp: 7200, drive: 1.6, sustain: 3.0, room: 0.2 },
};

// The phrases, in beats. c: a chord, frets from the low E (null: not played), strummed down ('d') or up
// ('u'). n: single notes as [string 6..1, fret]. len: how long it rings, in beats. v: how hard.
const PHRASE = {
  floe: { bpm: 112, ev: [            // a twangy country turn round G, on the bridge pickup
    { t: 0, c: [3, 2, 0, 0, 0, 3], d: 'd', v: 0.9, len: 1.5 },
    { t: 1.5, n: [[3, 4]], v: 0.85, len: 0.25 }, { t: 1.75, n: [[3, 5]], v: 0.8, len: 0.25 },
    { t: 2, n: [[2, 3], [1, 3]], v: 0.95, len: 0.5 }, { t: 2.5, n: [[2, 5], [1, 5]], v: 0.85, len: 0.5 },
    { t: 3, n: [[2, 3], [1, 3]], v: 0.9, len: 0.5 }, { t: 3.5, n: [[3, 4]], v: 0.8, len: 0.5 },
    { t: 4, c: [3, 2, 0, 0, 0, 3], d: 'd', v: 1, len: 3 },
  ] },
  sedge: { bpm: 126, ev: [           // palm-muted chugs, two power chords, let the last one ring
    { t: 0, c: [0, 2, 2, null, null, null], d: 'd', v: 0.9, len: 0.2 }, { t: 0.5, c: [0, 2, 2, null, null, null], d: 'd', v: 0.75, len: 0.2 },
    { t: 1, c: [0, 2, 2, null, null, null], d: 'd', v: 0.9, len: 0.2 }, { t: 1.5, c: [0, 2, 2, null, null, null], d: 'd', v: 0.75, len: 0.2 },
    { t: 2, c: [3, 5, 5, null, null, null], d: 'd', v: 1, len: 0.45 }, { t: 2.5, c: [5, 7, 7, null, null, null], d: 'd', v: 1, len: 0.95 },
    { t: 3.5, c: [0, 2, 2, null, null, null], d: 'd', v: 0.85, len: 0.2 },
    { t: 4, c: [0, 2, 2, 1, 0, 0], d: 'd', v: 1, len: 3.5 },
  ] },
  scree: { bpm: 108, ev: [           // a riff down low in A minor, then the chord
    { t: 0, c: [null, 0, 2, 2, null, null], d: 'd', v: 1, len: 0.5 },
    { t: 0.5, n: [[5, 3]], v: 0.9, len: 0.25 }, { t: 0.75, n: [[4, 0]], v: 0.85, len: 0.25 },
    { t: 1, n: [[4, 2]], v: 0.95, len: 0.5 }, { t: 1.5, n: [[5, 3]], v: 0.85, len: 0.25 }, { t: 1.75, n: [[5, 0]], v: 0.9, len: 0.25 },
    { t: 2, n: [[6, 3]], v: 0.95, len: 0.5 }, { t: 2.5, n: [[6, 5]], v: 1, len: 0.5 },
    { t: 3, c: [null, 0, 2, 2, 1, 0], d: 'd', v: 1, len: 3.5 },
  ] },
  moss: { bpm: 84, ev: [             // a clean arpeggio that rings into a big room
    ...[[6, 0], [5, 2], [4, 4], [3, 0], [2, 0], [1, 0]].map(([s, f], k) => ({ t: k * 0.5, n: [[s, f]], v: 0.75 + 0.05 * (k % 2), len: 6 - k * 0.5 })),
    ...[[5, 3], [4, 2], [3, 0], [2, 0], [1, 0]].map(([s, f], k) => ({ t: 3 + k * 0.5, n: [[s, f]], v: 0.75, len: 4 - k * 0.5 })),
  ] },
  fjord: { bpm: 92, ev: [            // soft jazz chords on the neck pickup
    { t: 0, c: [null, 3, 2, 4, 0, 0], d: 'd', v: 0.65, len: 1.8 },
    { t: 2, c: [null, 0, 2, 0, 1, 0], d: 'd', v: 0.6, len: 1 },
    { t: 3, c: [null, null, 0, 2, 1, 1], d: 'd', v: 0.6, len: 1 },
    { t: 4, c: [3, null, 3, 4, 3, null], d: 'd', v: 0.65, len: 3 },
  ] },
  rowan: { bpm: 96, ev: [            // an overdriven blues line that sustains
    { t: 0, n: [[2, 5]], v: 0.95, len: 0.5 }, { t: 0.5, n: [[1, 5]], v: 1, len: 0.5 },
    { t: 1, n: [[1, 8]], v: 1, len: 0.75 }, { t: 1.75, n: [[1, 5]], v: 0.9, len: 0.25 },
    { t: 2, n: [[2, 8]], v: 0.95, len: 0.5 }, { t: 2.5, n: [[2, 5]], v: 0.9, len: 0.5 },
    { t: 3, n: [[3, 7]], v: 0.95, len: 0.5 }, { t: 3.5, n: [[3, 5]], v: 0.9, len: 0.25 }, { t: 3.75, n: [[3, 7]], v: 0.9, len: 0.25 },
    { t: 4, n: [[2, 5]], v: 1, len: 3.5 },
  ] },
  heath: { bpm: 104, ev: [           // short glassy stabs, then a ringing A
    { t: 0, c: [null, 7, 6, 7, 7, null], d: 'd', v: 0.9, len: 0.18 }, { t: 0.75, c: [null, 7, 6, 7, 7, null], d: 'u', v: 0.7, len: 0.18 },
    { t: 1.5, c: [null, 7, 6, 7, 7, null], d: 'd', v: 0.9, len: 0.18 }, { t: 2, c: [null, 9, 8, 9, 9, null], d: 'd', v: 0.95, len: 0.4 },
    { t: 2.75, c: [null, 7, 6, 7, 7, null], d: 'u', v: 0.7, len: 0.18 },
    { t: 3.5, c: [null, 0, 2, 2, 2, 0], d: 'd', v: 1, len: 3 },
  ] },
};

// a small seeded random, so a voice sounds the same every time it is rendered
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; }

/** One plucked string added into `out` (mono, the pickup's signal). */
function pluck(out, at, freq, ring, vel, R, rand) {
  const N = SR / freq, S = R.s;
  const L = Math.max(2, Math.floor(N - S - 0.05)), d = N - S - L;
  const C = (1 - d) / (1 + d);                                      // allpass: the fraction of a sample left
  const g = Math.pow(10, (-3 * (N / SR)) / (R.sustain * Math.pow(82.41 / freq, 0.45)));   // loss per pass
  const line = new Float32Array(L);
  // the pluck: noise, darker when soft, combed at where the pick meets the string
  const soft = R.soft ? 0.72 : 0.35 + 0.4 * (1 - vel);
  const ex = new Float32Array(L);
  let lp = 0;
  for (let i = 0; i < L; i++) { lp += (1 - soft) * (rand() - lp); ex[i] = lp; }
  const pk = Math.max(1, Math.round(L * R.pick));
  let mean = 0;
  for (let i = 0; i < L; i++) { line[i] = ex[i] - (i >= pk ? ex[i - pk] : 0); mean += line[i]; }
  mean /= L;
  let e = 0;
  for (let i = 0; i < L; i++) { line[i] -= mean; e += line[i] * line[i]; }
  const norm = vel / Math.sqrt(e / L + 1e-9) * 0.3;
  for (let i = 0; i < L; i++) line[i] *= norm;
  // the pickups read the string at their place: a comb (two for a humbucker, a second coil for the quack)
  const m1 = Math.max(1, Math.round(L * R.pickup)), m2 = R.humbucker ? Math.max(1, Math.round(L * R.pickup * 1.35)) : R.quack ? Math.max(1, Math.round(L * R.quack)) : 0;
  const total = Math.min(Math.round(ring * SR), out.length - at), fade = Math.round(0.03 * SR);
  let p = 0, prev = 0, apX = 0, apY = 0;
  for (let i = 0; i < total; i++) {
    const x = line[p];
    const y = g * ((1 - S) * x + S * prev);
    prev = x;
    const ap = C * y + apX - C * apY;
    apX = y; apY = ap;
    line[p] = ap;
    let o = x - line[(p + m1) % L];
    if (m2) o = 0.5 * (o + (x - line[(p + m2) % L]) * (R.quack ? -0.8 : 1));
    // a quick damp at the end of the note (a palm or the next chord)
    const env = i > total - fade ? (total - i) / fade : 1;
    out[at + i] += o * env;
    p = p + 1 === L ? 0 : p + 1;
  }
}

/** The dry signal of a phrase, mono, at the pickup. */
function dry(id) {
  const P = PHRASE[id], R = RIG[id], beat = 60 / P.bpm;
  const end = Math.max(...P.ev.map((e) => e.t + e.len)) * beat + 0.2;
  const out = new Float32Array(Math.ceil((end + 2.4) * SR));
  const rand = rng([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  for (const e of P.ev) {
    const notes = e.c ? e.c.map((f, k) => (f === null ? null : [6 - k, f])).filter(Boolean) : e.n;
    const order = e.d === 'u' ? [...notes].reverse() : notes;
    order.forEach(([s, f], k) => {
      const at = Math.round((e.t * beat + k * (e.c ? (e.d === 'u' ? 0.009 : 0.013) : 0) + 0.004 * rand()) * SR);
      const v = e.v * (e.d === 'u' ? 0.8 : 1) * (1 - 0.06 * k * (e.c ? 1 : 0)) * (0.96 + 0.04 * rand());
      pluck(out, Math.max(0, at), OPEN[6 - s] * Math.pow(2, f / 12), e.len * beat + (e.len > 1 ? 0.6 : 0.02), v, R, rand);
    });
  }
  return out;
}

// the room: a stereo tail of noise that darkens as it fades
function roomImpulse(ctx, seconds = 2.2) {
  const n = Math.round(seconds * SR), ir = ctx.createBuffer(2, n, SR);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c), rand = rng(99 + c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, k = 0.25 + 0.7 * Math.min(t / seconds, 1);
      lp += (1 - k) * (rand() - lp);
      d[i] = (t < 0.012 ? 0 : lp) * Math.exp(-t * 3.6);
    }
  }
  return ir;
}

/** Render a guitar's phrase through its rig. Returns an AudioBuffer (stereo). */
async function renderVoice(id) {
  const R = RIG[id], src = dry(id);
  const ctx = new OfflineAudioContext(2, src.length, SR);
  const b = ctx.createBuffer(1, src.length, SR); b.copyToChannel(src, 0);
  const s = ctx.createBufferSource(); s.buffer = b;
  const hp = Object.assign(ctx.createBiquadFilter(), { type: 'highpass' }); hp.frequency.value = 70;
  const res = Object.assign(ctx.createBiquadFilter(), { type: 'peaking' }); [res.frequency.value, res.gain.value, res.Q.value] = R.res;
  const lp = Object.assign(ctx.createBiquadFilter(), { type: 'lowpass' }); lp.frequency.value = R.lp; lp.Q.value = 0.6;
  let chain = [hp, res, lp];
  for (const [f, gdb, q] of R.body || []) { const pk = Object.assign(ctx.createBiquadFilter(), { type: 'peaking' }); pk.frequency.value = f; pk.gain.value = gdb; pk.Q.value = q; chain.push(pk); }
  // the amp: gain, a soft clipper, back down
  const pre = ctx.createGain(); pre.gain.value = R.drive;
  const clip = ctx.createWaveShaper(); clip.oversample = '4x';
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  clip.curve = curve;
  const post = ctx.createGain(); post.gain.value = 1 / Math.sqrt(R.drive);
  // the cabinet: no fizz above 5 kHz, a little less box in the low mids
  const cabLp = Object.assign(ctx.createBiquadFilter(), { type: 'lowpass' }); cabLp.frequency.value = R.drive > 4 ? 4800 : 6500; cabLp.Q.value = 0.8;
  const cabHp = Object.assign(ctx.createBiquadFilter(), { type: 'highpass' }); cabHp.frequency.value = 85;
  const box = Object.assign(ctx.createBiquadFilter(), { type: 'peaking' }); box.frequency.value = 420; box.gain.value = -2.5; box.Q.value = 1;
  chain = [...chain, pre, clip, post, cabHp, box, cabLp];
  s.connect(chain[0]);
  chain.reduce((a, n) => (a.connect(n), n));
  const last = chain[chain.length - 1];
  // the room
  const wet = ctx.createGain(); wet.gain.value = R.room;
  const verb = ctx.createConvolver(); verb.buffer = roomImpulse(ctx);
  const dryG = ctx.createGain(); dryG.gain.value = 1;
  last.connect(dryG); last.connect(verb); verb.connect(wet);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
  dryG.connect(comp); wet.connect(comp); comp.connect(ctx.destination);
  s.start();
  const out = await ctx.startRendering();
  // the same loudness for all seven (-15 dB RMS over the part that sounds), the peaks then rounded off
  // above 0.8 so a stab never clips
  let e = 0, n = 0;
  for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 1e-3) { e += d[i] * d[i]; n++; } }
  const k = n ? Math.pow(10, -15 / 20) / Math.sqrt(e / n) : 1;
  for (let c = 0; c < 2; c++) {
    const d = out.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const x = d[i] * k, a = Math.abs(x); d[i] = a <= 0.8 ? x : Math.sign(x) * (0.8 + 0.19 * Math.tanh((a - 0.8) / 0.19)); }
  }
  return out;
}

export function createVoices() {
  let ctx = null, master = null, analyser = null, playing = null;
  const cache = new Map();
  const buffer = (id) => cache.get(id) || cache.set(id, renderVoice(id)).get(id);
  const ensure = () => {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR, latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = 0.8;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.6;
    master.connect(analyser); analyser.connect(ctx.destination);
    return ctx;
  };
  const time = new Float32Array(2048);
  return {
    get ready() { return !!ctx && ctx.state === 'running'; },
    /** call from a click or a tap: browsers only let sound start from one */
    unlock() { ensure(); if (ctx.state !== 'running') ctx.resume(); },
    async play(id) {
      if (!RIG[id]) return;
      ensure();
      if (ctx.state !== 'running') await ctx.resume();
      const buf = await buffer(id);
      this.stop(0.08);
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.005);
      src.start();
      playing = { src, g, id };
      src.onended = () => { if (playing?.src === src) playing = null; };
    },
    stop(fade = 0.35) {
      if (!playing || !ctx) return;
      const { src, g } = playing, t = ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
      src.stop(t + fade + 0.02);
      playing = null;
    },
    get playing() { return playing?.id || null; },
    /** what is sounding now, -1..1, into `out` (resampled to its length). Returns the level 0..1. */
    wave(out) {
      if (!analyser) { out.fill(0); return 0; }
      analyser.getFloatTimeDomainData(time);
      let e = 0;
      for (let i = 0; i < out.length; i++) { const v = time[Math.floor((i / out.length) * time.length)]; out[i] = v; e += v * v; }
      return Math.min(Math.sqrt(e / out.length) * 3.2, 1);
    },
    render: (id) => buffer(id),
  };
}

export const VOICE_IDS = Object.keys(RIG);
