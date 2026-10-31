// The sound of the scroll (V7 final, 2026-10-31, Sam's ask: "something that feels like a music shop about
// guitars. Subtle, not too much guitar"). Synthesized in the browser like voices.js: no recordings, nothing
// to license. It starts off (browsers only let sound start from a gesture, and a page that makes noise
// unasked is rude). The one switch is in the header (sound.js), shared with Hear them, and the whole bed
// ducks under a phrase from Hear them.
//
// THE LEVEL FOR SAM'S EAR: LEVEL below. 1 is what was measured and set by numbers, not by ear. 0.7 is about
// 3 dB quieter, 1.4 about 3 dB louder. Every sound here goes through it. It can be tried without editing
// anything: add ?ambience=1.4 to the address, or type __ambience.level(1.4) in the console.
//
// What plays:
//   the room     air and a far-off amp's 50 Hz hum, always there, each section with its own mix (SCENES)
//   strings      now and then one string rings on its own, far off, the way they do in a shop
//   the drawing  a pen on paper, only while the plan is being drawn: the scroll is the hand
//   the tour     one open string, softly, as the camera settles on each stop: low E at the head, up to high e
//   the bench    the saw on the cut, a tap for each fret, a rag for the finish, small clicks of hardware,
//                and one quiet chord when it is strung. All scroll-driven, so it runs backwards too
//   hand-offs    air rising as one section comes up over the last, and a soft low pluck when it lands
//   the slip     a pen on the signature, a thud for the stamp
//   the footer   a last low chord as the lights come up
//
// Cost: three looping noise buffers and a few oscillators, rendered once when sound is first turned on. Audio
// runs on its own thread, and with the switch off the context is suspended and nothing here runs at all.
import { pluck, rng, roomImpulse, OPEN } from './voices.js';

export const LEVEL = 1;
const URL_LEVEL = parseFloat(new URLSearchParams(location.search).get('ambience'));

// The mix per layer, as linear gains before LEVEL. Measured with tools/record_sound.mjs and tools/sound_stats.py.
const GAIN = { air: 0.02, hum: 0.011, hiss: 0.0026, ring: 0.045, pen: 0.04, saw: 0.05, tap: 0.075, cue: 0.05, swell: 0.022 };
// How much of the room each section has: air, the amp's hum, how often a string rings by itself
const SCENES = {
  room:     { air: 1,    hum: 1,    rings: 1 },     // the hero: the shop, the amp left on
  drawing:  { air: 0.7,  hum: 0.25, rings: 0.3 },   // quieter: you hear the pen
  closeup:  { air: 0.75, hum: 0.7,  rings: 0 },     // the stops bring their own string
  workshop: { air: 0.85, hum: 0.12, rings: 0 },     // another room: bench, wood, no amp
  hear:     { air: 0.8,  hum: 1.1,  rings: 0 },     // by the amps. The voices have this section
  order:    { air: 0.5,  hum: 0.15, rings: 0.3 },   // paper, the counter
  visit:    { air: 1.1,  hum: 0.8,  rings: 0.7 },   // the whole room again
};
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

// ---------------------------------------------------------------- buffers, rendered once ----
const SR = 44100;
/** Stereo pink-ish noise that loops without a seam (a crossfade over its last half second). */
function noiseLoop(ctx, seconds, seed, tilt = 0.985) {
  const n = Math.round(seconds * SR), x = Math.round(0.5 * SR), b = ctx.createBuffer(2, n, SR);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c), rand = rng(seed + c * 17), raw = new Float32Array(n + x);
    let l = 0, h = 0;
    for (let i = 0; i < n + x; i++) { const w = rand(); l = tilt * l + (1 - tilt) * w; h = 0.85 * h + 0.15 * w; raw[i] = l * 6 + h * 0.5; }
    for (let i = 0; i < n; i++) d[i] = i < x ? raw[i] * (i / x) + raw[n + i] * (1 - i / x) : raw[i];
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] /= peak;
  }
  return b;
}
/** What a nib or a saw blade does to noise: a nib catches the paper's tooth in short grains, a blade's teeth
 *  come past at a steady rate that wanders a little. Baked into a loop, so it costs nothing while it plays. */
function textureLoop(ctx, seconds, seed, kind) {
  const n = Math.round(seconds * SR), b = ctx.createBuffer(2, n, SR);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c), rand = rng(seed + c * 13);
    let env = 0, target = 0, left = 0, ph = 0, rate = 150, hp = 0;
    for (let i = 0; i < n; i++) {
      const w = rand();
      hp = w - hp * 0.2;
      if (kind === 'nib') {
        if (left-- <= 0) { left = Math.round((0.006 + Math.abs(rand()) * 0.03) * SR); const r = Math.abs(rand()); target = r * r; }
        env += (target - env) * 0.012;
        d[i] = hp * env * 1.6;
      } else {
        if (i % 2000 === 0) rate = 130 + Math.abs(rand()) * 60;
        ph += (2 * Math.PI * rate) / SR;
        const tooth = Math.pow(Math.abs(Math.sin(ph)), 3);
        d[i] = hp * (0.28 + 0.72 * tooth);
      }
      const fade = Math.min(i, n - i, 2000) / 2000;       // no seam where the loop meets
      d[i] *= 0.2 + 0.8 * fade;
    }
  }
  return b;
}
/** A soft plucked note with its room, from the Hear them string model. Quiet, dark and far away. */
function stringNote(ctx, freq, seconds, soft, seed) {
  const n = Math.round(seconds * SR), mono = new Float32Array(n), R = { s: soft, sustain: seconds * 0.7, pick: 0.31, pickup: 0.27, soft: true };
  pluck(mono, 0, freq, seconds, 0.7, R, rng(seed));
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mono[i]));
  const b = ctx.createBuffer(1, n, SR), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (mono[i] / peak) * Math.min(i / 90, 1) * Math.min((n - i) / 4000, 1);
  return b;
}
/** A chord of those notes, a slow strum, for the bench and the footer. */
function chord(ctx, freqs, seconds) {
  const n = Math.round(seconds * SR), b = ctx.createBuffer(1, n, SR), d = b.getChannelData(0);
  freqs.forEach((f, k) => { const s = stringNote(ctx, f, seconds - k * 0.05, 0.42, 40 + k).getChannelData(0), at = Math.round(k * 0.05 * SR); for (let i = 0; i < s.length && at + i < n; i++) d[at + i] += s[i] * (1 - k * 0.06); });
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] /= peak;
  return b;
}
/** A knock on wood: a click into two short resonances. `f` sets the size of the wood. */
function knock(ctx, f, decay, seed) {
  const n = Math.round(decay * 6 * SR), b = ctx.createBuffer(1, n, SR), d = b.getChannelData(0), rand = rng(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp += 0.35 * (rand() - lp);
    d[i] = (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 2.31 * t + 0.6) * 0.3) * Math.exp(-t / decay) + lp * Math.exp(-t / 0.004) * 0.9;
  }
  return b;
}
/** The stamp: a dull thump with the paper's slap on top. */
function thud(ctx) {
  const n = Math.round(0.28 * SR), b = ctx.createBuffer(1, n, SR), d = b.getChannelData(0), rand = rng(5);
  let lp = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; lp += 0.5 * (rand() - lp); d[i] = Math.sin(2 * Math.PI * (92 - 60 * t) * t) * Math.exp(-t / 0.05) * 0.9 + lp * Math.exp(-t / 0.012) * 0.45; }
  return b;
}

// ------------------------------------------------------------------------------ the graph ----
/** Everything that sounds, on any audio context (the real one, or an offline one to measure it). */
export async function buildBed(ctx, destination) {
  // the buffers are rendered a piece at a time, so turning the sound on never stalls a frame (it was 227 ms in one go)
  const breathe = () => new Promise((ok) => setTimeout(ok, 0));
  const gain = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const filter = (type, f, q, to) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; if (to) n.connect(to); return n; };

  // the whole bed: LEVEL, then the duck, then a limiter that should never be working (a guard, measured)
  const master = gain(1), duck = gain(1), fuse = ctx.createDynamicsCompressor();
  fuse.threshold.value = -8; fuse.knee.value = 4; fuse.ratio.value = 12; fuse.attack.value = 0.003; fuse.release.value = 0.15;
  master.connect(duck); duck.connect(fuse); fuse.connect(destination);
  // the shop itself: everything that happens in the room passes through it
  const verb = ctx.createConvolver(); verb.buffer = roomImpulse(ctx, 2.2, SR);
  const wet = gain(0.5, master), dry = gain(1, master);
  verb.connect(wet);
  const send = gain(0.34, verb);
  const bus = gain(1, dry); bus.connect(send);

  // the room: air, low and wide. Slow noise, so it never reads as hiss
  await breathe();
  const air = ctx.createBufferSource(); air.buffer = noiseLoop(ctx, 11, 3); air.loop = true;
  await breathe();
  const airG = gain(0), airHp = filter('highpass', 60, 0.5), airLp = filter('lowpass', 900, 0.4, airG);
  air.connect(airHp); airHp.connect(airLp); airG.connect(master);
  // the amp across the room: 50 Hz and its family (Norway's mains), and a thread of valve hiss
  const humG = gain(0, master), humLp = filter('lowpass', 420, 0.6, humG);
  const oscs = [[50, 1], [100, 0.7], [150, 0.34], [200, 0.16], [250, 0.09], [350, 0.04]].map(([f, a]) => { const o = ctx.createOscillator(); o.frequency.value = f; const g = gain(a, humLp); o.connect(g); return o; });
  const wob = ctx.createOscillator(); wob.frequency.value = 0.13; const wobG = gain(0.06); wob.connect(wobG); wobG.connect(humLp.gain);
  const hiss = ctx.createBufferSource(); hiss.buffer = noiseLoop(ctx, 7, 11, 0.2); hiss.loop = true;
  await breathe();
  const hissG = gain(0, master), hissHp = filter('highpass', 3200, 0.5), hissLp = filter('lowpass', 8000, 0.5, hissG);
  hiss.connect(hissHp); hissHp.connect(hissLp);

  // a pen, a saw and a rag are one noise loop each, shaped by what the scroll is doing
  const rough = noiseLoop(ctx, 5, 23, 0.1);
  await breathe();
  const nib = textureLoop(ctx, 4, 31, 'nib');
  await breathe();
  const teeth = textureLoop(ctx, 4, 41, 'teeth');
  await breathe();
  const voice = (type, f, q, buffer = rough) => {
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true; src.playbackRate.value = 1;
    const flt = filter(type, f, q), g = gain(0), body = filter('highpass', 200, 0.5);
    src.connect(flt); flt.connect(body); body.connect(g); g.connect(bus); src.start();
    return { src, flt, g };
  };
  const pen = voice('bandpass', 3400, 0.9, nib), saw = voice('bandpass', 1500, 1.1, teeth), rag = voice('bandpass', 900, 0.6);
  // the rising air of a hand-off
  const swellSrc = ctx.createBufferSource(); swellSrc.buffer = air.buffer; swellSrc.loop = true; swellSrc.playbackRate.value = 1.4;
  const swellLp = filter('lowpass', 300, 0.8), swellG = gain(0); swellSrc.connect(swellLp); swellLp.connect(swellG); swellG.connect(bus);

  const start = () => { air.start(); oscs.forEach((o) => o.start()); wob.start(); hiss.start(); swellSrc.start(); };
  const clips = {
    tap: [knock(ctx, 1320, 0.012, 1), knock(ctx, 1480, 0.011, 2), knock(ctx, 1210, 0.013, 3)],
    tool: [knock(ctx, 2300, 0.008, 4), knock(ctx, 820, 0.022, 6)],
    bench: knock(ctx, 240, 0.05, 7), thud: thud(ctx), strings: [],
  };
  for (let k = 0; k < OPEN.length; k++) { await breathe(); clips.strings.push(stringNote(ctx, OPEN[k], 5.5, 0.44, 60 + k)); }
  await breathe(); clips.low = stringNote(ctx, OPEN[0], 6, 0.48, 77);
  clips.tick = stringNote(ctx, OPEN[4] * 2, 0.5, 0.5, 79);
  await breathe(); clips.open = chord(ctx, [82.41, 123.47, 164.81, 207.65, 246.94, 329.63], 7);       // E major, open
  await breathe(); clips.last = chord(ctx, [73.42, 110, 146.83, 220, 293.66, 369.99], 8.5);            // D, for the way out
  /** One sound, now. `to` is the bus it goes through, the room's by default. */
  const fire = (buf, g, rate = 1, pan = 0, when = 0) => {
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const a = gain(g), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; s.connect(a); a.connect(p); p.connect(bus); } else { s.connect(a); a.connect(bus); }
    s.start(ctx.currentTime + when);
    s.onended = () => { a.disconnect(); p?.disconnect(); };
  };
  const set = (param, v, tau = 0.08) => param.setTargetAtTime(v, ctx.currentTime, tau);
  return { master, duck, airG, humG, hissG, pen, saw, rag, swellG, swellLp, clips, fire, set, start };
}

// ------------------------------------------------------------------- reading the scroll ----
/**
 * A pure scroll-to-sound conductor. update(state) once a frame, with:
 *   where   which section (nav.js's keys)    dt  seconds since the last frame
 *   draw    0..1 how much of the plan is drawn, while in the drawing
 *   stop    the tour stop the camera is settled on (-1 between them), and n, how many there are
 *   bench   0..1 through the workshop, saw 0..1 through the cut, frets 0..n set, hardware 0..n set,
 *           sweep 0..1 through the finish, strung 0/1
 *   rise    0..1 how far a section is up over the last   sig 0..1 the signature's ink   stamp 0/1
 *   lit     0..1 how far the footer's lights are up     hot  a phrase is playing in Hear them
 */
export function createConductor(bed) {
  const { clips, fire, set } = bed;
  let scene = '', rings = 0, nextRing = 6, seed = 1;
  const rand = rng(37);
  const was = { draw: 0, saw: 0, frets: 0, hardware: 0, sweep: 0, stop: -1, rise: 0, sig: 0, stamp: 0, strung: 0, lit: 0, landed: true };
  const mix = (name) => {
    const M = SCENES[name] || SCENES.room;
    set(bed.airG.gain, GAIN.air * M.air, 0.9);
    set(bed.humG.gain, GAIN.hum * M.hum, 0.9);
    set(bed.hissG.gain, GAIN.hiss * M.hum, 0.9);
    rings = M.rings;
  };
  return {
    update(S) {
      const dt = Math.min(S.dt || 0, 0.1), rate = (v, p) => Math.abs(v - p) / Math.max(dt, 1 / 240);
      if (S.where !== scene) { scene = S.where; mix(scene); }

      // the room's own: a string that rings by itself, far off
      if (rings > 0) {
        nextRing -= dt * rings;
        if (nextRing <= 0) { nextRing = 11 + (rand() + 1) * 8; const k = Math.floor((rand() + 1) * 3) % 6; fire(clips.strings[k], GAIN.ring * 0.55, 1, rand() * 0.6); }
      }

      // the pen: as loud as the drawing is fast, with the grain of a nib on tooth
      // (and the same pen on the slip's signature)
      const penV = S.where === 'drawing' ? Math.min(rate(S.draw ?? was.draw, was.draw) * 3.5, 1)
        : S.where === 'order' ? Math.min(rate(S.sig || 0, was.sig) * 4, 1) * 0.9 : 0;
      const nib = 0.62 + 0.38 * Math.abs(Math.sin(((S.draw || 0) + (S.sig || 0)) * Math.PI * 60));
      set(bed.pen.g.gain, GAIN.pen * penV * nib, 0.04);
      was.draw = S.draw ?? was.draw;

      // the tour: settling on a stop plays that stop's open string, once, from either direction
      if (S.stop !== was.stop) {
        if (S.stop >= 0 && S.where === 'closeup') fire(clips.strings[Math.min(S.stop, 5)], GAIN.ring * (S.stop === 6 ? 0.5 : 1), S.stop === 6 ? 2 : 1, (S.stop / 6 - 0.5) * 0.5);
        was.stop = S.stop;
      }

      // the bench
      const on = S.where === 'workshop';
      const sawV = on && S.saw > 0 && S.saw < 1 ? Math.min(rate(S.saw, was.saw) * 2.4, 1) : 0;
      // the strokes: the blade runs up and down as the cut goes on, so it answers the scroll both ways
      const stroke = 0.16 + 0.84 * Math.pow(Math.abs(Math.sin((S.saw || 0) * Math.PI * 20)), 1.4);
      set(bed.saw.g.gain, GAIN.saw * sawV * stroke, 0.025);
      set(bed.saw.flt.frequency, 900 + 1500 * stroke, 0.03);
      if (S.saw !== undefined) was.saw = S.saw;
      if (on) {
        const f = Math.floor(S.frets || 0), fp = Math.floor(was.frets);
        if (f !== fp) { const c = clips.tap[Math.abs(f) % 3]; fire(c, GAIN.tap * (0.8 + 0.2 * (rand() + 1) / 2), 1 + (f / 24) * 0.5, (f / 24 - 0.5) * 0.7); }
        was.frets = S.frets || 0;
        const h = Math.floor(S.hardware || 0), hp = Math.floor(was.hardware);
        if (h !== hp) fire(clips.tool[Math.abs(h) % 2], GAIN.tap * 0.55, 1, (rand()) * 0.3);
        was.hardware = S.hardware || 0;
      }
      const ragV = on && S.sweep > 0 && S.sweep < 1 ? Math.min(rate(S.sweep, was.sweep) * 3.5, 1) : 0;
      set(bed.rag.g.gain, GAIN.pen * 0.42 * ragV, 0.12);
      if (S.sweep !== undefined) was.sweep = S.sweep;
      if (on && S.strung !== was.strung && S.strung) fire(clips.open, GAIN.ring * 1.2);
      if (S.strung !== undefined) was.strung = S.strung;
      // the blanks going down on the bench
      if (on && (S.bench || 0) > 0.012 && !was.benchDown) { was.benchDown = true; fire(clips.bench, GAIN.tap * 1.1); }
      if ((S.bench || 0) < 0.008) was.benchDown = false;

      // a section coming up over the last: the air lifts with it, and it lands on a low string
      const rise = S.rise ?? 0;
      const riseV = rise > 0.01 && rise < 0.99 ? Math.min(rate(rise, was.rise) * 1.6, 1) : 0;
      set(bed.swellG.gain, GAIN.swell * riseV, 0.25);
      set(bed.swellLp.frequency, 220 + 1000 * rise, 0.2);
      if (rise >= 0.99 && !was.landed) { was.landed = true; fire(clips.low, GAIN.cue, 1); }
      if (rise < 0.6) was.landed = false;
      was.rise = rise;

      // the slip: the pen on the signature and the stamp coming down
      if (S.where === 'order') {
        if (!was.stamp && S.stamp) fire(clips.thud, GAIN.tap * 1.1);
        was.stamp = S.stamp || 0;
      }
      was.sig = S.sig ?? was.sig;

      // the way out
      const lit = S.lit ?? 0;
      if (lit > 0.75 && was.lit <= 0.75) fire(clips.last, GAIN.ring * 1.1);
      was.lit = lit;

      // under a phrase from Hear them, the whole bed steps back 12 dB
      set(bed.duck.gain, S.hot ? 0.25 : 1, S.hot ? 0.08 : 0.8);
    },
    /** A touch on a string: the hover family's sound. Very quiet, only ever with the sound on. */
    touch(pan = 0) { fire(clips.tick, GAIN.cue * 0.32, 1, pan); },
  };
}

/** The page's bed, on the shared context. Built on the first switch-on, then kept. */
export function createAmbience(sound) {
  let bed = null, cond = null, level = Number.isFinite(URL_LEVEL) ? URL_LEVEL : LEVEL;
  const api = {
    get built() { return !!bed; },
    level(v) { level = v; if (bed) bed.set(bed.master.gain, level, 0.2); return level; },
    /** once a frame with the page's state (main.js). Nothing happens while the sound is off. */
    update(S) { if (sound.on && cond) cond.update(S); },
    touch(pan) { if (sound.on && cond) cond.touch(pan); },
    get bed() { return bed; },
  };
  let building = false;
  sound.subscribe(async (on) => {
    if (!on || bed || building) { if (on && bed) bed.set(bed.master.gain, level, 0.6); return; }
    building = true;
    const ctx = sound.ctx();
    bed = await buildBed(ctx, sound.bus());
    cond = createConductor(bed);
    bed.master.gain.setValueAtTime(0, ctx.currentTime);
    bed.master.gain.setTargetAtTime(level, ctx.currentTime, 0.8);       // the room comes up, it does not switch on
    bed.start();
  });
  return api;
}
