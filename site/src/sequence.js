// The walk: the scroll sequence that lifts the guitar in the centre off its
// plinth and takes the camera along it, stop by stop (stops.js).
//
// Everything here is a pure function of one number, the scroll position in
// screen heights (`at`). The showroom asks for the shot at `at` every frame,
// so scrolling back up plays it all in reverse for free.
//
// A shot is: where the guitar's centre is, how it is turned (a quaternion),
// and a camera described in the guitar's own frame (aim point, direction,
// distance, roll, lens). Because the camera rides in the guitar's frame, a
// stop can turn the guitar under the key light and the framing still holds.
import * as THREE from 'three';
import { STOPS, workshopStops } from './stops.js';

// Scroll budget, in screen heights. The page sets the pinned section's
// length from `Walk.length` so the two always agree.
export const BEATS = { lift: 1.2, travel: 0.8, hold: 1.0, outro: 1.5 };
export const LIFT = 0.3;               // metres the guitar rises off its plinth

const V = (a) => new THREE.Vector3(...a);
const D2R = Math.PI / 180;
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);   // cubic in-out
const smooth = (u) => u * u * (3 - 2 * u);

// The guitar's own frame: the GLB's root (tail at the origin, +y up the
// neck, +z out of the top). Boxes are measured from the vertices, in that
// frame, whatever the guitar is doing in the room at the time.
function partBox(root, names) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4();
  for (const n of names) {
    const obj = root.getObjectByName(n);
    if (!obj) continue;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
    });
  }
  return box;
}

export class Walk {
  constructor() {
    this.plans = new Map();
  }

  /** Stops for a guitar: its own list, or the workshop walk for a maquette. */
  stopsFor(info) {
    return STOPS[info.id] || workshopStops(info);
  }

  /** Total scroll length in screen heights, for a guitar's list. */
  length(info) {
    const n = this.stopsFor(info).length;
    return BEATS.lift + n * (BEATS.travel + BEATS.hold) + BEATS.outro;
  }

  /** Reduced motion: the middle of the nearest hold, so the walk cuts. */
  snap(info, at) {
    const { lift, travel, hold } = BEATS;
    const n = this.stopsFor(info).length;
    if (at < lift * 0.5) return 0;
    const i = Math.round((at - lift - travel - hold / 2) / (travel + hold));
    if (i >= n) return this.length(info);
    return lift + Math.max(i, 0) * (travel + hold) + travel + hold / 2;
  }

  /** The resolved shots for one guitar, measured once from its model.
   *  Tall screens get longer lenses and an upright last shot. */
  plan(item, portrait) {
    const key = `${item.info.id}:${portrait ? 'p' : 'l'}`;
    if (this.plans.has(key)) return this.plans.get(key);
    const root = item.guitar;
    const all = partBox(root, root.children.map((c) => c.name).filter(Boolean));
    if (all.isEmpty()) root.traverse((o) => o.isMesh && all.expandByObject(o));
    const centre = all.getCenter(new THREE.Vector3());
    const size = all.getSize(new THREE.Vector3());
    const stops = this.stopsFor(item.info);

    const shot = (o) => ({
      turn: (o.turn || 0) * D2R, tilt: (o.tilt || 0) * D2R, lay: (o.lay || 0) * D2R,
      aim: o.aim, dir: o.dir.clone().normalize(), radius: o.radius, roll: (o.roll || 0) * D2R,
      lens: (o.lens || 24) * (portrait ? 1.35 : 1), shift: o.shift ?? 1, dof: o.dof ?? 1,
    });

    // 0: lifted, the whole guitar, a quarter turn to the light
    const shots = [shot({ aim: centre.clone(), dir: V([0.28, 0.02, 1]), radius: size.y * 0.5, turn: -18, roll: 0, shift: 0, dof: 0.25 })];
    for (const s of stops) {
      const box = partBox(root, s.parts);
      const b = box.isEmpty() ? all : box;
      const aim = s.aim
        ? new THREE.Vector3(...s.aim.map((f, k) => b.min.getComponent(k) + f * (b.max.getComponent(k) - b.min.getComponent(k))))
        : b.getCenter(new THREE.Vector3());
      const radius = s.radius || b.getSize(new THREE.Vector3()).length() * 0.5;
      const arrive = shot({ ...s, aim, radius, dir: V(s.view) });
      // the hold drifts: a slow push in and a few degrees round, so the
      // frame never stands still while the copy is read
      const leave = { ...arrive, radius: radius * 0.86, roll: arrive.roll + 2 * D2R,
        dir: arrive.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 5 * D2R) };
      shots.push(arrive, leave);
    }
    // last: laid flat and straight on, the way the drawing below shows it
    // (upright on a phone, where a guitar lying down would be tiny)
    const flat = shot({ aim: centre.clone(), dir: V([0, 0, 1]), radius: size.y * 0.5, lay: portrait ? 0 : -90, turn: 0, shift: 0, dof: 0, lens: 14 });
    shots.push(flat);

    const p = { stops, shots, centre, size };
    this.plans.set(key, p);
    return p;
  }

  /**
   * The state at scroll position `at` (screen heights into the pinned room).
   * Returns the two shots to blend, the blend, the lift (0..1, rest to
   * lifted), the active stop and how present its copy should be.
   */
  sample(plan, at) {
    const { lift, travel, hold, outro } = BEATS;
    const n = plan.stops.length;
    const out = { lift: 0, a: plan.shots[0], b: plan.shots[0], k: 0, stop: -1, copy: 0, outro: 0 };
    if (at <= lift) { out.lift = ease(Math.max(at, 0) / lift); return out; }
    out.lift = 1;
    let t = at - lift;
    for (let i = 0; i < n; i++) {
      const A = plan.shots[2 * i], arrive = plan.shots[2 * i + 1], leave = plan.shots[2 * i + 2];
      if (t < travel) {
        Object.assign(out, { a: A, b: arrive, k: ease(t / travel) });
        // the copy arrives with the camera's last stretch and leaves with its first
        out.stop = i;
        out.copy = smooth(Math.max(0, (t / travel - 0.55) / 0.45));
        if (i > 0 && t / travel < 0.4) { out.stop = i - 1; out.copy = 1 - smooth(t / travel / 0.4); }
        return out;
      }
      t -= travel;
      if (t < hold) { Object.assign(out, { a: arrive, b: leave, k: smooth(t / hold), stop: i, copy: 1 }); return out; }
      t -= hold;
    }
    const last = plan.shots[2 * n], end = plan.shots[2 * n + 1];
    const u = Math.min(t / (outro * 0.8), 1);
    Object.assign(out, { a: last, b: end, k: ease(u), outro: ease(Math.min(t / outro, 1)) });
    if (u < 0.3) { out.stop = n - 1; out.copy = 1 - smooth(u / 0.3); }
    return out;
  }
}

// ----------------------------------------------------------- blending ----
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), e = new THREE.Euler();

/** The guitar's turn for a shot: turned round y, then laid over round z. */
export function shotQuat(s, out = new THREE.Quaternion()) {
  e.set(s.tilt, s.turn, 0, 'YXZ');
  out.setFromEuler(e);
  return s.lay ? out.multiply(qa.setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.lay)) : out;
}

/** Direction slerp that copes with opposite vectors (front to back). */
function slerpDir(a, b, k, out) {
  const d = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (d > 0.9995) return out.copy(a).lerp(b, k).normalize();
  let axis = new THREE.Vector3().crossVectors(a, b);
  if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0);
  return out.copy(a).applyAxisAngle(axis.normalize(), Math.acos(d) * k);
}

/** Blend two shots into one, in place on `out`. */
export function blendShots(a, b, k, out = {}) {
  out.quat = shotQuat(a, out.quat || new THREE.Quaternion()).slerp(shotQuat(b, qb), k);
  out.aim = (out.aim || new THREE.Vector3()).copy(a.aim).lerp(b.aim, k);
  out.dir = slerpDir(a.dir, b.dir, k, out.dir || new THREE.Vector3());
  out.radius = Math.exp(Math.log(a.radius) + (Math.log(b.radius) - Math.log(a.radius)) * k);   // even zoom speed
  out.roll = a.roll + (b.roll - a.roll) * k;
  out.lens = a.lens + (b.lens - a.lens) * k;
  out.shift = a.shift + (b.shift - a.shift) * k;
  out.dof = a.dof + (b.dof - a.dof) * k;
  return out;
}
