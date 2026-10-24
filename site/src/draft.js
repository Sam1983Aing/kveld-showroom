// The drawing comes first (Ink on Paper, Sam's pick of 2026-10-06).
//
// Scrolling past the room, the guitar in the centre lies down on a cream sheet,
// its plan is inked line by line from the same numbers that built the model,
// the lines lift into section lines at the surface's real height, and the
// finish bleeds out from the bridge. Then the sheet goes dark and the guitar
// stands up into the walk's first shot.
//
//   ?g=rowan       open on that guitar
//
// This file patches the room from the outside (walk.length, walk.sample, update,
// swapIn). The chapter takes the place of the walk's lift: LEN screen heights
// from the room at rest to the walk's first shot, then the walk carries on.
//
// Everything is drawn from data the build already writes: the plan lines come
// from assets/data/<id>.json, and their heights from a depth map of the model
// rendered straight down (so a line rises to exactly where the surface is).
//
// The two options that were not picked (Contour Stack, Lights Down) still have
// their branches in here (`mode === 'stack'`, `dark`). They cannot be reached
// any more and can be cut in a cleanup pass. Both run in versions/v32 with
// ?draft=stack and ?draft=dark.
import * as THREE from 'three';
import { createDraftName } from './draft-name.js';
import { BEATS } from './sequence.js';
import { LINEUP } from './data.js';

const Q = new URLSearchParams(location.search);
const MODE = 'ink';
const IN = 0.0254;
const LEN = 5.5;                       // screen heights, room at rest to the walk's first shot
export const DRAFT = { len: LEN, hold: 2.2 };   // for the page: the chapter's length, and where the inked plan rests
const FILL = 0.9;                      // showroom.js: how much of the frame a shot's radius takes
const D2R = Math.PI / 180;
const BIG = 1e3;

// The chapter's beats, in screen heights. The recordings hold at 2.2, 3.5 and 4.8.
const T = {
  lift: [0, 0.9],                      // the guitar leaves the plinth and lies down (or stays up, in the dark)
  room: [0.08, 0.5],                   // the room goes out
  paper: [0.5, 0.95],                  // the sheet comes up
  ghost: [0.85, 1.55],                 // the guitar fades into the sheet as the ink goes down
  draw: [0.72, 2.0],
  dims: [1.55, 2.15],
  rise: [2.3, 3.4],
  fill: [3.6, 4.72],
  back: [4.8, 5.5],                    // the sheet goes dark, the guitar stands up into the walk
};

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const ramp = (a, b, x) => clamp01((x - a) / (b - a));
const sm = (a, b, x) => { const t = ramp(a, b, x); return t * t * (3 - 2 * t); };
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// ---------------------------------------------------------------- colour ----
// The frame is tone mapped after the bloom (ACES, OutputPass), so a colour
// meant to land on screen as a given hex has to be put into the scene as the
// value that maps to it. Same curve as three's ACESFilmicToneMapping.
function aces(c, exposure) {
  const r = c[0] * exposure / 0.6, g = c[1] * exposure / 0.6, b = c[2] * exposure / 0.6;
  const i = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b];
  const f = i.map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081));
  return [1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2], -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2], -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2]]
    .map(clamp01);
}
function toScene(hex, exposure) {
  const t = new THREE.Color(hex);                      // linear display target
  const want = [t.r, t.g, t.b];
  let c = want.slice();
  for (let n = 0; n < 80; n++) {
    const got = aces(c, exposure);
    c = c.map((v, k) => Math.min(Math.max(v * (want[k] + 1e-5) / (got[k] + 1e-5), 1e-5), 60));
  }
  return new THREE.Color().setRGB(c[0], c[1], c[2]);
}

// ------------------------------------------------------------ depth maps ----
// The model seen straight down (and straight up), one float per millimetre:
// the height of the surface in the guitar's own frame. Lines read their
// heights here, the sections and slices are cut from it.
function isIdentity(m) {
  const e = m.elements;
  return Math.abs(e[0] - 1) < 1e-6 && Math.abs(e[5] - 1) < 1e-6 && Math.abs(e[10] - 1) < 1e-6 &&
    Math.abs(e[12]) < 1e-6 && Math.abs(e[13]) < 1e-6 && Math.abs(e[14]) < 1e-6 &&
    Math.abs(e[1]) < 1e-6 && Math.abs(e[2]) < 1e-6 && Math.abs(e[4]) < 1e-6 &&
    Math.abs(e[6]) < 1e-6 && Math.abs(e[8]) < 1e-6 && Math.abs(e[9]) < 1e-6;
}

function renderMaps(renderer, root) {
  const px = 0.001, pad = 0.012;
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const model = root.children.find((c) => c.name && c.children.length) || root;
  const parts = model.children.filter((c) => c.name);
  const box = new THREE.Box3(), boxes = {}, v = new THREE.Vector3(), m = new THREE.Matrix4();
  for (const p of parts) {
    const b = boxes[p.name] = new THREE.Box3();
    p.traverse((o) => {
      if (!o.isMesh) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      if (isIdentity(m)) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        b.union(o.geometry.boundingBox);
        return;
      }
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m));
    });
    box.union(b);
  }
  const x0 = box.min.x - pad, y0 = box.min.y - pad;
  const w = Math.ceil((box.max.x - box.min.x + 2 * pad) / px), h = Math.ceil((box.max.y - box.min.y + 2 * pad) / px);
  const W = w * px, H = h * px, cx = x0 + W / 2, cy = y0 + H / 2;
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.01, box.max.z - box.min.z + 0.3);
  cam.matrixAutoUpdate = false;
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: { uRootInv: { value: inv } },
    vertexShader: 'uniform mat4 uRootInv; varying float vZ; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vZ = (uRootInv * wp).z; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'varying float vZ; void main(){ gl_FragColor = vec4(vZ, 1.0, 0.0, 1.0); }',
  });
  const buf = new Float32Array(w * h * 4);
  const shoot = (names, below) => {
    const t = new THREE.Matrix4();
    if (below) t.makeRotationY(Math.PI).setPosition(cx, cy, box.min.z - 0.1); else t.makeTranslation(cx, cy, box.max.z + 0.1);
    cam.matrix.multiplyMatrices(root.matrixWorld, t);
    cam.updateMatrixWorld(true);
    const shown = parts.map((p) => p.visible), swapped = [];
    parts.forEach((p) => { p.visible = !names || names.includes(p.name); });
    model.traverse((o) => { if (o.isMesh) { swapped.push([o, o.material]); o.material = mat; } });
    const target = renderer.getRenderTarget(), colour = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha(), auto = renderer.autoClear;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.autoClear = true;
    renderer.render(model, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    renderer.setRenderTarget(target); renderer.setClearColor(colour, alpha); renderer.autoClear = auto;
    swapped.forEach(([o, mm]) => { o.material = mm; });
    parts.forEach((p, i) => { p.visible = shown[i]; });
    const z = new Float32Array(w * h).fill(NaN);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const s = (j * w + (below ? w - 1 - i : i)) * 4;
      if (buf[s + 1] > 0.5) z[j * w + i] = buf[s];
    }
    return z;
  };
  const has = (n) => parts.some((p) => p.name === n);
  const wood = ['Body', 'Neck', 'Fretboard'].filter(has);
  const neck = ['Neck', 'Fretboard', 'Frets', 'Nut', 'Dots', 'SkunkStripe'].filter(has);
  const maps = {
    all: shoot(null, false), body: shoot(['Body'], false), neck: shoot(neck, false), wood: shoot(wood, false),
    bodyBack: shoot(['Body'], true), woodBack: shoot(wood, true),
  };
  rt.dispose(); mat.dispose();

  /** Height at a point of the root frame. `r` widens the search to the
   *  nearest covered millimetres (an outline sits right on the edge). */
  const at = (name, x, y, r = 0, low = false) => {
    const z = maps[name], i = Math.round((x - x0) / px - 0.5), j = Math.round((y - y0) / px - 0.5);
    for (let rr = r; rr <= Math.max(r * 4, 0); rr *= 2) {
      let best = NaN;
      for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
        const q = z[jj * w + ii];
        if (q === q && (best !== best || (low ? q < best : q > best))) best = q;
      }
      if (best === best) return best;
      if (!r) break;
    }
    return NaN;
  };
  return { maps, at, w, h, px, x0, y0, box, boxes };
}

// ------------------------------------------------------------- fat lines ----
// Screen-space lines with a real width: one quad per segment. Each end knows
// its place on the flat sheet (x, y), the height it rises to (z), where it
// falls in the draw-on order (g) and when it rises (k).
class LineSet {
  constructor() { this.pos = []; this.b = []; this.e = []; this.g = []; this.k = []; this.p = []; this.idx = []; this.n = 0; }

  seg(A, B, gA, gB, kA, kB, width, alpha, accent = 0) {
    for (const [end, side] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
      this.pos.push(A[0], A[1], A[2]); this.b.push(B[0], B[1], B[2]); this.e.push(end, side);
      this.g.push(gA, gB); this.k.push(kA, kB); this.p.push(width, alpha, accent);
    }
    const n = this.n; this.idx.push(n, n + 1, n + 2, n + 2, n + 1, n + 3); this.n += 4;
  }

  /** A polyline of [x, y, z] points. g0..g1 is its stretch of the draw-on, kOf its rise key. */
  poly(pts, closed, g0, g1, kOf, width, alpha, accent = 0) {
    const n = pts.length; if (n < 2) return;
    const len = [0];
    for (let i = 1; i <= (closed ? n : n - 1); i++) { const a = pts[i - 1], b = pts[i % n]; len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = len[len.length - 1] || 1;
    for (let i = 1; i < len.length; i++) {
      const a = pts[i - 1], b = pts[i % n];
      this.seg(a, b, g0 + (g1 - g0) * len[i - 1] / total, g0 + (g1 - g0) * len[i] / total, kOf(a), kOf(b), width, alpha, accent);
    }
  }

  mesh(material) {
    const geo = new THREE.BufferGeometry();
    const set = (name, arr, size) => geo.setAttribute(name, new THREE.Float32BufferAttribute(arr, size));
    set('position', this.pos, 3); set('aB', this.b, 3); set('aE', this.e, 2); set('aG', this.g, 2); set('aK', this.k, 2); set('aP', this.p, 3);
    geo.setIndex(this.idx);
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    return mesh;
  }
}

const LINE_VERT = /* glsl */`
  uniform vec2 uRes; uniform float uZ0, uRise, uRiseW, uExplode, uPR, uFadeRise;
  attribute vec3 aB; attribute vec2 aE; attribute vec2 aG; attribute vec2 aK; attribute vec3 aP;
  varying float vG; varying float vA; varying float vC; varying vec3 vP;
  float rs(float k) { float a = k * (1.0 - uRiseW); return smoothstep(a, a + uRiseW, uRise); }
  void main() {
    float rA = rs(aK.x), rB = rs(aK.y);
    vec3 A = vec3(position.xy, mix(uZ0, uZ0 + (position.z - uZ0) * uExplode, rA));
    vec3 B = vec3(aB.xy, mix(uZ0, uZ0 + (aB.z - uZ0) * uExplode, rB));
    vec4 cA = projectionMatrix * modelViewMatrix * vec4(A, 1.0);
    vec4 cB = projectionMatrix * modelViewMatrix * vec4(B, 1.0);
    vec2 d = (cB.xy / cB.w - cA.xy / cA.w) * uRes * 0.5;
    float l = length(d); d = l > 1e-4 ? d / l : vec2(1.0, 0.0);
    float w = aP.x * uPR;
    vec4 c = mix(cA, cB, aE.x);
    vec2 off = vec2(-d.y, d.x) * aE.y * w * 0.5 + d * (aE.x * 2.0 - 1.0) * w * 0.3;
    c.xy += off / (uRes * 0.5) * c.w;
    gl_Position = c;
    vG = mix(aG.x, aG.y, aE.x);
    vA = aP.y * mix(1.0, smoothstep(0.0, 0.3, mix(rA, rB, aE.x)), uFadeRise);
    vC = aP.z;
    vP = mix(A, B, aE.x);
  }`;
const LINE_FRAG = /* glsl */`
  uniform vec3 uColor, uColor2, uC; uniform vec4 uAxis; uniform float uDraw, uOpacity, uSweep, uFw;
  varying float vG; varying float vA; varying float vC; varying vec3 vP;
  void main() {
    if (vG > uDraw) discard;
    // the lines stay ahead of the finish and go as it passes
    float m = dot(vP, uAxis.xyz) + uAxis.w * length(vP.xy - uC.xy);
    float a = vA * uOpacity * smoothstep(uSweep - uFw, uSweep, m);
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uColor, uColor2, vC), a);
  }`;
function lineMaterial(additive) {
  return new THREE.ShaderMaterial({
    vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) }, uPR: { value: 1 }, uZ0: { value: 0 }, uRise: { value: 0 }, uRiseW: { value: 0.4 },
      uExplode: { value: 1 }, uFadeRise: { value: 0 }, uDraw: { value: 0 }, uOpacity: { value: 1 }, uSweep: { value: -BIG }, uFw: { value: 0.02 },
      uAxis: { value: new THREE.Vector4(0, 1, 0, 0) }, uC: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() },
    },
  });
}

// -------------------------------------------------------- reveal patch ----
// Every material of a real guitar gets a cut: fragments past the sweep are
// dropped, so the model can arrive along any measure (out from a point, up
// through its depth, along its length). uGhost fades it into the background
// colour, which is how it leaves before the drawing goes down.
const REV_HEAD = /* glsl */`
  uniform float uSweep, uGhost, uCapOn, uEdgeW; uniform vec4 uAxis; uniform vec3 uC, uNz, uBg, uCap, uEdge;
  varying vec3 vRp;
  float dHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float dNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;
const REV_CUT = /* glsl */`
  float dM = -1e4;
  if (uSweep < 500.0) {
    dM = dot(vRp, uAxis.xyz) + uAxis.w * length(vRp.xy - uC.xy) + (dNoise(vRp * uNz.x) - 0.5) * uNz.y;
    if (dM > uSweep + (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uNz.z) discard;
  }
`;
const REV_TAIL = /* glsl */`
  if (uSweep < 500.0) {
    if (uCapOn > 0.5 && !gl_FrontFacing) gl_FragColor.rgb = uCap;
    gl_FragColor.rgb += uEdge * (1.0 - smoothstep(0.0, uEdgeW, uSweep - dM));
  }
  if (uGhost > 0.001) gl_FragColor.rgb = mix(gl_FragColor.rgb, uBg, uGhost);
`;
function revealUniforms() {
  return {
    uRootInv: { value: new THREE.Matrix4() }, uSweep: { value: BIG }, uGhost: { value: 0 }, uCapOn: { value: 0 }, uEdgeW: { value: 0.01 },
    uAxis: { value: new THREE.Vector4(0, 1, 0, 0) }, uC: { value: new THREE.Vector3() }, uNz: { value: new THREE.Vector3(1, 0, 0) },
    uBg: { value: new THREE.Color() }, uCap: { value: new THREE.Color() }, uEdge: { value: new THREE.Color(0, 0, 0) },
  };
}
function addReveal(material, U, doubleSided) {
  if (material.userData.reveal) return;
  material.userData.reveal = true;
  const before = material.onBeforeCompile, key = material.customProgramCacheKey(), wood = /^(Body|Neck|Board|Binding|Veneer)/.test(material.name);
  material.onBeforeCompile = (shader, r) => {
    before.call(material, shader, r);
    Object.assign(shader.uniforms, U, wood ? null : { uCapOn: { value: 0 } });
    shader.vertexShader = 'uniform mat4 uRootInv; varying vec3 vRp;\n' + shader.vertexShader.replace(
      '#include <project_vertex>', '#include <project_vertex>\nvRp = (uRootInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = REV_HEAD + shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + REV_CUT)
      .replace('#include <dithering_fragment>', REV_TAIL + '\n#include <dithering_fragment>');
  };
  material.customProgramCacheKey = () => key + 'reveal';
  if (doubleSided) material.side = THREE.DoubleSide;     // the stack shows the cut face from above
  material.needsUpdate = true;
}

// ------------------------------------------------------------ plan data ----
const circle = (cx, cy, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cy + Math.sin(i / n * Math.PI * 2) * r]);
function rrect(cx, cy, w, h, rad, deg = 0) {
  const pts = [], r = Math.min(rad, w / 2, h / 2), c = Math.cos(deg * D2R), s = Math.sin(deg * D2R);
  for (const [ox, oy, a0] of [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]])
    for (let i = 0; i <= 6; i++) { const a = (a0 + i * 15) * D2R, x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r; pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return pts;
}

/** The drawing as paths in the sheet's own inches (x along, bass at +y), the
 *  way blueprint.js plots Floe, for whatever the guitar's json holds.
 *  cls 1 outline, 2 hardware, 3 fine, 4 contour (accent ink). */
function planPaths(D) {
  const P = [];
  const add = (pts, cls, map, g0, g1, closed = true, r = 1) => { if (pts && pts.length > 1) P.push({ pts, cls, map, g: [g0, g1], closed, r }); };
  add(D.body_outline, 1, 'body', 0, 0.42, true, 4);
  add(D.neck, 1, 'neck', 0.14, 0.56, true, 4);
  let g = 0.4;
  const hw = (pts, closed = true) => { add(pts, 2, 'all', g, g + 0.16, closed); g += 0.035; };
  hw(D.pickguard); hw(D.pickguard_slot); hw(D.bridge_plate); hw(D.bridge_pickup); hw(D.control_plate);
  (D.soundholes || []).forEach((s) => hw(s));
  if (D.neck_pickup) hw(rrect(D.neck_pickup[0][0], D.neck_pickup[0][1], 0.58, 2.58, 0.29));
  for (const p of D.pickups || []) {
    if (p.kind === 'humbucker') { hw(rrect(p.x, p.y, 1.62, 3.45, 0.14, p.angle)); hw(rrect(p.x, p.y, 1.38, 2.72, 0.1, p.angle)); }
    else if (p.kind === 'soapbar') hw(rrect(p.x, p.y, 1.55, 3.6, 0.3, p.angle));
    else hw(rrect(p.x, p.y, 0.7, 2.75, 0.35, p.angle));
  }
  for (const bar of [[D.bridge, 0.46], [D.tailpiece, 0.56]]) {
    const [b, wd] = bar; if (!b) continue;
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2, len = Math.hypot(b[0][0] - b[1][0], b[0][1] - b[1][1]);
    hw(rrect(cx, cy, wd, len + 0.5, wd / 2, Math.atan2(b[1][0] - b[0][0], b[0][1] - b[1][1]) / D2R));
  }
  add([[D.nut[0], -D.nut[2]], [D.nut[1], -D.nut[2]], [D.nut[1], D.nut[2]], [D.nut[0], D.nut[2]]], 2, 'neck', 0.5, 0.6);
  D.fret_x.forEach((x, i) => add([[x, D.fret_span[i][0]], [x, D.fret_span[i][1]]], 3, 'neck', 0.5 + 0.3 * i / D.fret_x.length, 0.58 + 0.3 * i / D.fret_x.length, false));
  D.strings.forEach((s, i) => add(s, 3, 'all', 0.6 + i * 0.02, 0.86 + i * 0.02, false));
  (D.dots || []).forEach((d, i) => add(circle(d[0], d[1], 0.125, 14), 3, 'neck', 0.7 + i * 0.012, 0.8 + i * 0.012));
  (D.posts || []).forEach((d, i) => add(circle(d[0], d[1], 0.17, 16), 2, 'all', 0.72 + i * 0.015, 0.84 + i * 0.015));
  (D.knobs || []).forEach((d, i) => add(circle(d[0], d[1], 0.37, 24), 2, 'all', 0.74 + i * 0.02, 0.88 + i * 0.02));
  if (D.switch) add(circle(D.switch[0], D.switch[1], 0.2, 16), 2, 'all', 0.8, 0.9);
  // the carve, where the sheet draws it: height lines, a carve line, bevel lines
  const curves = [...(D.isolines || D.arch || []).map((c) => [c.loop, true]), ...(D.carve_line ? [[D.carve_line, false]] : []),
    ...Object.values(D.bevels || {}).map((b) => [b, false])];
  curves.forEach(([pts, closed], i) => add(pts, 4, 'body', 0.7 + 0.2 * i / curves.length, 0.82 + 0.18 * i / curves.length, closed, 2));
  return P;
}

const BRIDGE_NOTE = { floe: 'Three brass saddles', heath: 'Six-saddle vibrato', moss: 'Floating bridge and vibrato', scree: 'Slanted bridge, stopbar',
  fjord: 'Slanted bridge, stopbar', rowan: 'Slanted bridge, stopbar', sedge: 'String-through hardtail' };

// ================================================================ a kit ====
// What one guitar needs for the chapter: its lines in its own frame (so they
// ride on the guitar and line up with the model to the millimetre), the
// dimension layer and the soft shadow on the sheet.
class Kit {
  constructor(draft, item, D) {
    this.draft = draft; this.item = item; this.D = D; this.info = item.info;
    const root = this.root = item.guitar;
    const M = this.M = renderMaps(draft.room.renderer, root);
    this.tail = Math.min(...D.body_outline.map((p) => p[0]));
    this.tip = Math.max(...D.neck.map((p) => p[0]));
    this.halfW = D.body.width / 2;
    this.zBack = M.boxes.Body ? M.boxes.Body.min.z : M.box.min.z;
    this.z0 = this.zBack - 0.001;                                  // the sheet lies under the body's back
    this.yMax = M.box.max.y;
    // a set neck's head leans back, so seen from above it is shorter than on the flat sheet
    const nutY = (D.nut[0] - this.tail) * IN, headTop = (M.boxes.Neck || M.box).max.y;
    this.fold = clamp01((headTop - nutY) / ((this.tip - D.nut[0]) * IN));
    this.centre = new THREE.Vector3(0, (0 - this.tail) * IN + 0.04, 0);   // near the bridge: where the finish starts
    this.reach = Math.hypot(this.yMax - this.centre.y, 0.06) + 0.03;

    this.group = new THREE.Group();
    this.group.visible = false;
    root.add(this.group);
    this.layers = {};
    this.buildLines();
  }

  /** Sheet inches to the guitar's frame (metres; bass at -x, y up the neck). */
  xy(p) {
    const nut = this.D.nut[0], x = p[0] > nut ? nut + (p[0] - nut) * this.fold : p[0];
    return [-p[1] * IN, (x - this.tail) * IN];
  }

  buildLines() {
    const { D, M, draft } = this, mode = draft.mode, dark = mode === 'dark';
    const kOf = (p) => clamp01(p[1] / this.yMax) * 0.9;
    const WIDTH = [0, 1.7, 1.15, 1.0, 1.05], ALPHA = dark ? [0, 1, 0.75, 0.5, 0.75] : [0, 1, 0.66, 0.46, 0.8];
    // 1) the plan, each point with the height it rises to
    const plan = new LineSet();
    for (const path of planPaths(D)) {
      // resample to 6 mm so a line can follow the surface between its drawn points
      const src = path.pts.map((p) => this.xy(p)), n = src.length, pts = [];
      for (let i = 0; i < (path.closed ? n : n - 1); i++) {
        const a = src[i], b = src[(i + 1) % n], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.006));
        for (let s = 0; s < steps; s++) pts.push([a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps]);
      }
      if (!path.closed) pts.push(src[n - 1]);
      let last = this.zBack;
      const lifted = pts.map(([x, y]) => {
        let z = M.at(path.map, x, y, path.r);
        if (z !== z) z = M.at('all', x, y, 6);
        if (z !== z) z = last;
        last = z;
        return [x, y, z + 0.0006];
      });
      plan.poly(lifted, path.closed, path.g[0], path.g[1], kOf, WIDTH[path.cls], ALPHA[path.cls], path.cls === 4 ? 1 : 0);
    }
    this.plan = plan.mesh(lineMaterial(dark));
    this.plan.renderOrder = 6;
    this.group.add(this.plan);

    // 2) the structure the plan stands up into
    const st = new LineSet();
    if (mode === 'stack') this.buildSlices(st, kOf); else this.buildSections(st, kOf);
    this.struct = st.mesh(lineMaterial(dark));
    this.struct.renderOrder = 5;
    this.group.add(this.struct);
    for (const m of [this.plan, this.struct]) { m.material.uniforms.uZ0.value = this.z0; m.material.uniforms.uC.value.copy(this.centre); }
  }

  /** Lofting lines: the back outline, ribs up to the top edge, and a section
   *  through the wood every 28 mm, cut from the depth maps. */
  buildSections(st, kOf) {
    const { D, M } = this, { w, px, x0, y0 } = M, top = M.maps.wood, bot = M.maps.woodBack;
    const out = D.body_outline.map((p) => this.xy(p));
    const back = out.map(([x, y]) => [x, y, (M.at('bodyBack', x, y, 4, true) || this.zBack) + 0.0004]);
    st.poly(back, true, 0, 0, kOf, 1.15, 0.6);
    for (let i = 0; i < out.length; i += 9) {
      const [x, y] = out[i], zt = M.at('body', x, y, 4);
      if (zt === zt) st.seg(back[i], [x, y, zt], 0, 0, kOf(back[i]), kOf(back[i]), 1.0, 0.42);
    }
    for (let y = 0.014; y < this.yMax; y += 0.028) {
      const j = Math.round((y - y0) / px - 0.5);
      let run = null;
      const flush = () => {
        if (run && run.length > 3) {
          const smooth = (arr, k) => arr.map((p, i) => [p[0], y, (arr[Math.max(i - 1, 0)][k] + 2 * p[k] + arr[Math.min(i + 1, arr.length - 1)][k]) / 4]);
          const loop = [...smooth(run, 1), ...smooth(run, 2).reverse()];
          st.poly(loop, true, 0, 0, kOf, 1.0, 0.5, 1);
        }
        run = null;
      };
      for (let i = 0; i < w; i += 2) {
        const zt = top[j * w + i], zb = bot[j * w + i];
        if (zt === zt && zb === zb) (run ||= []).push([x0 + (i + 0.5) * px, zt, zb]); else flush();
      }
      flush();
    }
  }

  /** Contour slices: the solid cut level by level (marching squares on the
   *  two depth maps), chained into loops and eased. On the sheet they lie
   *  nested like a contour map; each rises to its own level. */
  buildSlices(st) {
    const { M } = this, { w, h, px, x0, y0 } = M, top = M.maps.wood, bot = M.maps.woodBack;
    const step = 2, gw = Math.floor(w / step), gh = Math.floor(h / step), CAP = 0.004;
    let zMin = Infinity, zMax = -Infinity;
    for (let i = 0; i < top.length; i++) { if (top[i] === top[i]) { zMax = Math.max(zMax, top[i]); zMin = Math.min(zMin, bot[i]); } }
    this.zMin = zMin; this.zMax = zMax;
    const levels = [], gap = Math.max(0.003, (zMax - zMin) / 34);
    for (let z = zMin + 0.0012; z < zMax - 0.0006; z += gap) levels.push(z);
    const f = new Float32Array(gw * gh);
    levels.forEach((z, li) => {
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const s = j * step * w + i * step, t = top[s], b = bot[s];
        f[j * gw + i] = t === t && b === b ? Math.max(Math.min(t - z, z - b, CAP), -CAP) : -CAP;
      }
      // segments between grid edges; an edge's id is its lower-left node and its direction
      const segs = [], ends = new Map();
      const cross = (i, j, dir) => {
        const a = f[j * gw + i], b = dir ? f[(j + 1) * gw + i] : f[j * gw + i + 1], t = a / (a - b);
        return [x0 + ((i + (dir ? 0 : t)) * step + 0.5) * px, y0 + ((j + (dir ? t : 0)) * step + 0.5) * px];
      };
      const link = (e1, e2) => { const n = segs.length; segs.push([e1, e2]); for (const e of [e1, e2]) (ends.get(e) || ends.set(e, []).get(e)).push(n); };
      for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
        const a = f[j * gw + i] > 0, b = f[j * gw + i + 1] > 0, c = f[(j + 1) * gw + i + 1] > 0, d = f[(j + 1) * gw + i] > 0;
        const code = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const B = (j * gw + i) * 2, R = (j * gw + i + 1) * 2 + 1, Tp = ((j + 1) * gw + i) * 2, L = (j * gw + i) * 2 + 1;   // bottom, right, top, left
        switch (code) {
          case 1: case 14: link(L, B); break;
          case 2: case 13: link(B, R); break;
          case 3: case 12: link(L, R); break;
          case 4: case 11: link(R, Tp); break;
          case 6: case 9: link(B, Tp); break;
          case 7: case 8: link(L, Tp); break;
          case 5: link(L, Tp); link(B, R); break;
          default: link(L, B); link(R, Tp);
        }
      }
      const point = (e) => { const dir = e & 1, n = e >> 1; return cross(n % gw, Math.floor(n / gw), dir); };
      const used = new Uint8Array(segs.length), k = li / Math.max(levels.length - 1, 1) * 0.92;
      for (let s0 = 0; s0 < segs.length; s0++) {
        if (used[s0]) continue;
        const chain = [segs[s0][0], segs[s0][1]]; used[s0] = 1;
        for (let grow = true; grow;) {
          grow = false;
          const next = (ends.get(chain[chain.length - 1]) || []).find((n) => !used[n]);
          if (next !== undefined) { used[next] = 1; const [a, b] = segs[next]; chain.push(a === chain[chain.length - 1] ? b : a); grow = true; }
        }
        const closed = chain[0] === chain[chain.length - 1];
        if (closed) chain.pop();
        if (chain.length < 6) continue;
        let pts = chain.map(point);
        for (let pass = 0; pass < 3; pass++) pts = pts.map((p, i) => {
          const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
          if (!closed && (i === 0 || i === pts.length - 1)) return p;
          return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
        });
        pts = pts.filter((_, i) => i % 2 === 0).map((p) => [p[0], p[1], z]);
        st.poly(pts, closed, 0.62 + 0.3 * k, 0.72 + 0.3 * k, () => k, 1.1, 0.78, 1);
      }
    });
  }

  // ------------------------------------------------- the sheet's layers ----
  /** Dimension layer and shadow for a layout ('flat': guitar lying along the
   *  screen; 'upright': standing). Built once per layout. */
  layer(layout) {
    if (this.layers[layout]) return this.layers[layout];
    const { D, tail, tip, halfW, draft } = this, flat = layout === 'flat';
    const box = flat ? { x: [tail - 3.3, tip + 1.9], y: [-11.2, 9.6] } : { x: [tail - 3.6, tip + 1.4], y: [-(halfW + 3.4), halfW + 3.4] };
    const long = box.x[1] - box.x[0], across = box.y[1] - box.y[0];
    const s = 2304 / long;                                             // canvas pixels per inch
    const cv = document.createElement('canvas');
    cv.width = Math.round((flat ? long : across) * s); cv.height = Math.round((flat ? across : long) * s);
    const c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
    c.globalCompositeOperation = 'lighter';                            // red: dimension ink, green: note ink
    // sheet inches -> canvas. flat: along runs right, bass up. upright: along runs up, bass left.
    const P = (x, y) => (flat ? [(x - box.x[0]) * s, (box.y[1] - y) * s] : [(box.y[1] - y) * s, (box.x[1] - x) * s]);
    const DIMC = 'rgb(255,0,0)', INKC = 'rgb(0,255,0)';
    const ts = flat ? 0.62 : 0.86, ls = flat ? 0.52 : 0.7, lw = (flat ? 0.07 : 0.095) * s;
    const line = (a, b, col = DIMC, width = lw, dash) => { c.strokeStyle = col; c.lineWidth = width; c.setLineDash(dash || []); c.beginPath(); c.moveTo(...P(...a)); c.lineTo(...P(...b)); c.stroke(); };
    const text = (str, at, dir, gap, size, col, align = 'center') => {
      const p = P(...at), q = P(at[0] + dir[0], at[1] + dir[1]);
      let dx = q[0] - p[0], dy = q[1] - p[1]; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      if (dx < -1e-6 || (Math.abs(dx) < 1e-6 && dy > 0)) { dx = -dx; dy = -dy; }           // never upside down
      c.save(); c.translate(p[0] + dy * gap * s, p[1] - dx * gap * s); c.rotate(Math.atan2(dy, dx));
      c.font = `400 ${(size * s).toFixed(1)}px "Martian Mono", ui-monospace, monospace`; c.letterSpacing = `${(size * s * 0.14).toFixed(1)}px`;
      c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(str.toUpperCase(), 0, 0); c.restore();
    };
    const tick = (x, y) => line([x - 0.14, y - 0.14], [x + 0.14, y + 0.14]);
    const dimAlong = (xa, xb, y, label, ea, eb) => {
      const over = y > 0 ? 0.28 : -0.28;
      if (ea !== undefined) line([xa, ea], [xa, y + over]);
      if (eb !== undefined) line([xb, eb], [xb, y + over]);
      line([xa, y], [xb, y]); tick(xa, y); tick(xb, y);
      text(label, [(xa + xb) / 2, y], [1, 0], 0.26, ts, DIMC);
    };
    const dimAcross = (x, ya, yb, label) => { line([x, ya], [x, yb]); tick(x, ya); tick(x, yb); text(label, [x, (ya + yb) / 2], [0, 1], 0.26, ts, DIMC); };
    const callout = (x, y, tx, ty, str, end) => {
      const a = P(x, y), b = P(tx, ty), dir = end ? -1 : 1;
      c.strokeStyle = INKC; c.lineWidth = lw * 0.8; c.setLineDash([]); c.globalAlpha = 0.55;
      c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(b[0] + dir * 0.55 * s, b[1]); c.stroke(); c.globalAlpha = 1;
      c.font = `400 ${(ls * s).toFixed(1)}px "Martian Mono", ui-monospace, monospace`; c.letterSpacing = `${(ls * s * 0.14).toFixed(1)}px`;
      c.fillStyle = INKC; c.textAlign = end ? 'right' : 'left'; c.textBaseline = 'middle'; c.fillText(str.toUpperCase(), b[0] + dir * 0.75 * s, b[1]);
    };
    const neckEnd = Math.max(...D.body_outline.map((p) => p[0]));
    c.globalAlpha = 0.75; line([tail - 1.7, 0], [tip + 1.2, 0], DIMC, lw * 0.75, [0.62 * s, 0.2 * s, 0.1 * s, 0.2 * s]); c.globalAlpha = 1;
    if (flat) {
      dimAlong(tail, tip, -10.2, `Overall ${(tip - tail).toFixed(2)}`, -1.0, -1.4);
      dimAlong(tail, neckEnd, -8.7, `Body ${D.body.length.toFixed(2)}`, -0.6, -1.2);
      dimAlong(0, D.scale, 8.2, `Scale ${D.scale.toFixed(2)}`, 1.3, 1.0);
      dimAlong(D.nut[0], tip, 4.3, `Head ${D.headstock_length.toFixed(2)}`, 1.0, 1.0);
      dimAcross(tail - 1.5, -halfW, halfW, D.body.width.toFixed(2));
      callout(neckEnd - 3.2, halfW * 0.74, neckEnd + 1.3, 5.6, `${this.info.woods.split(',')[0]} · ${D.body.depth.toFixed(2)} deep`);
      callout(-0.1, -0.9, 1.6, -7.5, BRIDGE_NOTE[this.info.id] || 'Bridge');
      callout(D.scale * 0.6, 0.45, D.scale * 0.56, -3.4, `${D.frets} frets · ${D.radius} radius`);
      callout(D.nut[0] + 3.4, -0.75, D.nut[0] + 1.5, -5.2, `${D.brand} headstock`, true);
      callout(D.nut[0] + 0.06, 0.72, D.nut[0] - 2.2, 3.2, `Nut ${D.nut_width.toFixed(2)}`, true);
      // title block, bottom right
      const bx = tip - 11.4, by = -7.0, bw = 12.4, bh = 2.9;
      c.strokeStyle = INKC; c.lineWidth = lw * 0.7; c.globalAlpha = 0.5;
      c.strokeRect(...P(bx, by), bw * s, bh * s); c.beginPath(); c.moveTo(...P(bx, by - bh / 2)); c.lineTo(...P(bx + bw, by - bh / 2)); c.stroke(); c.globalAlpha = 1;
      text(`${D.brand} · ${D.model} · Plan`, [bx + 0.45, by - 0.98], [1, 0], 0, ts, DIMC, 'left');
      text('Inches · shown reduced', [bx + 0.45, by - 2.38], [1, 0], 0, ls, INKC, 'left');
    } else {
      dimAlong(tail, tip, halfW + 1.9, `Overall ${(tip - tail).toFixed(2)}`, 1.0, 1.4);
      dimAlong(0, D.scale, -(halfW + 1.9), `Scale ${D.scale.toFixed(2)}`, -1.3, -1.0);
      dimAcross(tail - 1.6, -halfW, halfW, D.body.width.toFixed(2));
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = draft.room.renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    // the layer lies on the sheet: its four corners in the guitar's frame
    const corner = (x, y) => [-y * IN, (x - tail) * IN, this.z0];
    const quad = flat
      ? [corner(box.x[0], box.y[0]), corner(box.x[1], box.y[0]), corner(box.x[0], box.y[1]), corner(box.x[1], box.y[1])]   // bl br tl tr
      : [corner(box.x[0], box.y[1]), corner(box.x[0], box.y[0]), corner(box.x[1], box.y[1]), corner(box.x[1], box.y[0])];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(quad.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    geo.setIndex([0, 1, 2, 2, 1, 3]);
    const dark = draft.mode === 'dark';
    const dims = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: tex }, uInk: { value: new THREE.Color() }, uDim: { value: new THREE.Color() }, uOpacity: { value: 0 }, uReveal: { value: 0 }, uAlong: { value: flat ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform sampler2D map; uniform vec3 uInk, uDim; uniform float uOpacity, uReveal, uAlong; varying vec2 vUv;
        void main(){ vec4 t = texture2D(map, vUv);
          float u = mix(1.0 - vUv.y, vUv.x, uAlong), cov = t.r + t.g * 0.8;
          float a = min(cov * 1.25, 1.0) * uOpacity * (1.0 - smoothstep(uReveal * 1.3 - 0.3, uReveal * 1.3, u));
          if (a < 0.004) discard;
          gl_FragColor = vec4(mix(uInk, uDim, t.r / max(t.r + t.g, 1e-4)), a); }`,
    }));
    dims.renderOrder = 4; dims.frustumCulled = false; dims.visible = false;
    this.group.add(dims);

    // a soft shadow under the guitar, from its own silhouette in the depth map
    const M = this.M, sw = M.w >> 1, sh = M.h >> 1, sc = document.createElement('canvas'); sc.width = sw; sc.height = sh;
    const sx = sc.getContext('2d'), img = sx.createImageData(sw, sh), all = M.maps.all;
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) { const k = ((sh - 1 - j) * sw + i) * 4, v = all[(j * 2) * M.w + (i * 2)]; img.data[k + 3] = v === v ? 255 : 0; }
    sx.putImageData(img, 0, 0);
    const soft = document.createElement('canvas'); soft.width = sw; soft.height = sh;
    const fx = soft.getContext('2d'); fx.filter = 'blur(4.5px)'; fx.drawImage(sc, 0, 0); fx.filter = 'blur(11px)'; fx.globalAlpha = 0.6; fx.drawImage(sc, 0, 0);
    const stex = new THREE.CanvasTexture(soft); stex.colorSpace = THREE.NoColorSpace;
    const off = flat ? [0.012, -0.006] : [-0.006, -0.012];            // away from the key light, down the screen
    const x0 = M.x0 + off[0], y0 = M.y0 + off[1], x1 = x0 + M.w * M.px, y1 = y0 + M.h * M.px, z = this.z0 + 0.0002;
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x0, y1, z, x1, y1, z], 3));
    sgeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    sgeo.setIndex([0, 1, 2, 2, 1, 3]);
    const shadow = new THREE.Mesh(sgeo, new THREE.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { map: { value: stex }, uColor: { value: new THREE.Color(0, 0, 0) }, uOpacity: { value: 0 }, uSweep: { value: BIG }, uC: { value: this.centre.clone() }, uRadial: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`uniform sampler2D map; uniform vec3 uColor, uC; uniform float uOpacity, uSweep, uRadial; varying vec2 vUv; varying vec3 vP;
        void main(){ float gate = mix(1.0, 1.0 - smoothstep(uSweep - 0.05, uSweep + 0.01, length(vP.xy - uC.xy)), uRadial);
          float a = texture2D(map, vUv).a * uOpacity * gate; if (a < 0.003) discard; gl_FragColor = vec4(uColor, a); }`,
    }));
    shadow.renderOrder = 3; shadow.frustumCulled = false; shadow.visible = false;
    this.group.add(shadow);
    return (this.layers[layout] = { dims, shadow, box, flat });
  }
}

// ============================================================ the chapter ====
class Draft {
  constructor(room) {
    this.room = room; this.mode = MODE;
    this.kits = new Map(); this.data = new Map(); this.reveal = new Map();
    this.S = { stamp: -1 };
    this.dark = new THREE.Color('#050404');
    const ex = room.renderer.toneMappingExposure;
    this.paper = toScene('#ece6da', ex);
    this.ink = toScene('#1c1712', ex);
    this.cap = toScene('#cdb590', ex);
    this.wall = room.scene.children.find((o) => o.isMesh && o.geometry.type === 'CylinderGeometry' && o.material.isMeshStandardMaterial);
    this.wallColour = this.wall?.material.color.clone();

    // the vignette eases off on the sheet (the grain pass darkens the corners to 55%)
    const g = room.grain;
    g.material.fragmentShader = g.material.fragmentShader.replace('uniform float uGrain;', 'uniform float uGrain; uniform float uVig;').replace('mix(0.55, 1.0, v)', 'mix(uVig, 1.0, v)');
    g.uniforms.uVig = { value: 0.55 };
    g.material.needsUpdate = true;

    // the chapter stands where the walk's lift was
    const walk = room.walk, length = walk.length.bind(walk), sample = walk.sample.bind(walk);
    walk.length = (info) => length(info) + (info.real ? LEN - BEATS.lift : 0);
    walk.sample = (plan, at) => {
      const it = room.items[room.index];
      if (!it.info.real) return sample(plan, at);
      if (at >= LEN) return sample(plan, at - LEN + BEATS.lift);
      const kit = this.kit(it);
      if (!kit) { const s = sample(plan, at / LEN * BEATS.lift); s.outro = 1; return s; }   // model still loading: a slow lift
      return this.sample(plan, at, kit);
    };
    const update = room.update.bind(room);
    room.update = (dt) => { update(dt); this.frame(); };
    const swapIn = room.swapIn.bind(room);
    room.swapIn = (i, root) => { swapIn(i, root); this.patch(room.items[i]); };
    room.items.forEach((it) => { if (it.ready) this.patch(it); });

    // the words: the guitar's name and two inked headlines (draft-name.js)
    this.words = createDraftName(document.querySelector('.room'));
    const gi = LINEUP.findIndex((x) => x.id === Q.get('g'));
    if (gi > 0) { room.u = room.lastU = gi; room.update(0); room.emitChange(); }
  }

  patch(it) {
    const U = revealUniforms();
    this.reveal.set(it.info.id, U);
    it.guitar.traverse((o) => { if (o.isMesh) addReveal(o.material, U, this.mode === 'stack'); });
    this.kits.delete(it.info.id);
    if (!this.data.has(it.info.id)) fetch(`assets/data/${it.info.id}.json`).then((r) => r.json()).then((D) => this.data.set(it.info.id, D));
  }

  kit(it) {
    const id = it.info.id;
    if (this.kits.has(id)) return this.kits.get(id);
    if (!it.ready || !this.data.has(id)) return null;
    const kit = new Kit(this, it, this.data.get(id));
    this.kits.set(id, kit);
    return kit;
  }

  // ----------------------------------------------------------- shots ----
  /** The chapter's camera stops, in the walk's own shot format, framed for the screen as it is now. */
  shots(plan, kit) {
    const room = this.room, aspect = room.camera.aspect, portrait = room.portrait, dark = this.mode === 'dark';
    const upright = dark || portrait, layout = upright ? 'upright' : 'flat';
    const key = `${layout}:${aspect.toFixed(3)}`;
    if (kit.shotKey === key) return kit.shotSet;
    const L = kit.layer(layout), box = L.box, cz = plan.centre.z;
    // the sheet's middle and half sizes, in the guitar's frame
    const mx = -(box.y[0] + box.y[1]) / 2 * IN, my = ((box.x[0] + box.x[1]) / 2 - kit.tail) * IN;
    const hx = (box.y[1] - box.y[0]) / 2 * IN, hy = (box.x[1] - box.x[0]) / 2 * IN;
    const fit = (lens, X, Y, fx, fy) => {
      const hv = lens * D2R / 2, hh = Math.atan(Math.tan(hv) * aspect);
      const dist = Math.max(X / (fx * Math.tan(hh)), Y / (fy * Math.tan(hv)));
      return { radius: dist * FILL * Math.tan(Math.min(hv, hh)), halfW: dist * Math.tan(hh), halfH: dist * Math.tan(hv) };
    };
    const mk = (o) => ({ turn: 0, tilt: 0, lay: 0, roll: 0, shift: 0, dof: 0, ...o, dir: new THREE.Vector3(...o.dir).normalize() });
    let A, C, E2;
    if (!upright) {
      // lying along the screen, the copy in a column on the left
      const lens = 14, f = fit(lens, hy, hx, 0.7, 0.9), aim = new THREE.Vector3(mx, my - 0.27 * f.halfW, cz);
      A = mk({ lay: -90 * D2R, aim, dir: [0, 0, 1], radius: f.radius, lens });
      const mid = aim.clone().lerp(new THREE.Vector3(0, plan.centre.y - 0.2 * f.halfW, cz), 0.6);
      const stack = this.mode === 'stack';
      C = mk({ lay: -90 * D2R, aim: mid, dir: stack ? [1.05, -0.3, 1] : [0.68, -0.26, 1], radius: f.radius * 0.86, lens: 17, roll: 2.5 * D2R });
      E2 = mk({ lay: -90 * D2R, aim: mid, dir: stack ? [0.62, -0.46, 1] : [0.5, -0.46, 1], radius: f.radius * 0.8, lens: 19, roll: 4.5 * D2R });
    } else if (portrait) {
      // standing, the copy under it
      const lens = 19, f = fit(lens, hx, hy, 0.94, 0.68), aim = new THREE.Vector3(mx, my - 0.17 * f.halfH, cz);
      A = mk({ aim, dir: [0, 0, 1], radius: f.radius, lens });
      const mid = aim.clone().lerp(new THREE.Vector3(0, plan.centre.y - 0.16 * f.halfH, cz), 0.6);
      C = mk({ aim: mid, dir: dark ? [0.72, 0.05, 1] : this.mode === 'stack' ? [0.9, -0.34, 1] : [0.62, -0.3, 1], radius: f.radius * 0.9, lens: 22, roll: dark ? 0 : -2 * D2R, turn: dark ? -18 * D2R : 0 });
      E2 = mk({ aim: mid, dir: dark ? [-0.3, 0.04, 1] : [0.46, -0.5, 1], radius: f.radius * 0.86, lens: 24, turn: dark ? -18 * D2R : 0 });
    } else {
      // standing in the dark room, wide screen
      const lens = 19, f = fit(lens, hx, hy, 0.5, 0.88), aim = new THREE.Vector3(mx - 0.16 * f.halfW, my, cz);
      A = mk({ aim, dir: [0, 0, 1], radius: f.radius, lens });
      const mid = aim.clone().lerp(new THREE.Vector3(-0.14 * f.halfW, plan.centre.y, cz), 0.6);
      C = mk({ aim: mid, dir: [0.74, 0.05, 1], radius: f.radius * 0.9, lens: 21, turn: -18 * D2R });
      E2 = mk({ aim: mid, dir: [-0.32, 0.04, 1], radius: f.radius * 0.88, lens: 22, turn: -18 * D2R });
    }
    const B = { ...A, radius: A.radius * 0.965 };
    kit.shotKey = key;
    return (kit.shotSet = { A, B, C, E: E2, layout });
  }

  /** The chapter at scroll position `at`: a walk state for the showroom, and
   *  the chapter's own numbers for frame(). */
  sample(plan, at, kit) {
    const Z = this.shots(plan, kit), S = this.S, dark = this.mode === 'dark';
    const out = { lift: ease(ramp(...T.lift, at)), a: Z.A, b: Z.B, k: 0, stop: -1, copy: 0, outro: 1 - sm(...T.back, at) };
    if (at < T.rise[0]) out.k = sm(T.lift[1], T.rise[0], at);
    else if (at < T.rise[1]) Object.assign(out, { a: Z.B, b: Z.C, k: ease(ramp(...T.rise, at)) });
    else if (at < T.back[0]) Object.assign(out, { a: Z.C, b: Z.E, k: sm(T.rise[1], T.back[0], at) });
    else Object.assign(out, { a: Z.E, b: plan.shots[0], k: ease(ramp(...T.back, at)) });

    S.stamp = this.room.time; S.kit = kit; S.layout = Z.layout; S.at = at;
    S.back = sm(...T.back, at);
    S.roomK = dark ? 1 : 1 - sm(...T.room, at) + sm(T.back[0] + 0.45, T.back[1], at);
    S.paper = dark ? 0 : sm(...T.paper, at) - sm(T.back[0], T.back[0] + 0.5, at);
    S.ghost = dark ? sm(0.25, 0.8, at) : sm(...T.ghost, at);
    S.draw = ramp(...T.draw, at);
    // the sheet keeps its numbers under the finished guitar; in the dark they go as it arrives
    S.dims = sm(...T.dims, at) * (1 - (dark ? sm(T.fill[0], T.fill[0] + 0.7, at) : sm(T.back[0], T.back[0] + 0.3, at)));
    S.rise = ramp(...T.rise, at);
    S.fill = ramp(...T.fill, at);
    S.lines = 1 - sm(T.fill[1] - 0.12, T.fill[1] + 0.1, at);
    S.beat = at < 2.45 ? 0 : 1;
    S.copy = S.beat === 0 ? sm(1.0, 1.45, at) * (1 - sm(2.2, 2.45, at)) : sm(2.55, 3.0, at) * (1 - sm(4.45, 4.75, at));
    return out;
  }

  // ----------------------------------------------------------- frame ----
  frame() {
    const room = this.room, S = this.S, on = S.stamp === room.time;
    if (!on) { if (this.live) this.rest(); this.words.hide(); this.warm(); return; }
    this.live = true;
    const kit = S.kit, m = this.mode, dark = m === 'dark', paper = S.paper;
    const L = kit.layer(S.layout), U = this.reveal.get(kit.info.id), root = kit.root;
    const accent = room.palette[room.index];

    // the room: out before the sheet comes up, back after it has gone dark
    const bg = room.scene.background.copy(this.dark).lerp(this.paper, Math.pow(paper, 2.2));
    const rk = S.roomK, gone = rk < 0.002;
    if (!dark) {
      for (const o of [room.floor, this.wall, room.halo, room.cone, room.dust, ...room.seams]) if (o) o.visible = !gone;
      room.items.forEach((it, i) => {
        if (i === room.index) { it.pedestal.visible = !gone; it.ringMat.color.multiplyScalar(rk); } else { it.group.visible = !gone; it.dim.value *= rk; it.ringMat.color.multiplyScalar(rk); }
      });
      room.seams[0].material.color.multiplyScalar(rk);
      room.cone.material.uniforms.uAlpha.value *= rk;
      room.dust.material.opacity *= rk;
      room.halo.children.forEach((h) => h.material.color.multiplyScalar(rk));
      room.floor.material.uniforms.uStrength.value = 1.25 * rk;
      room.floor.material.uniforms.uPool.value.multiplyScalar(rk);
      if (this.wall) this.wall.material.color.copy(this.wallColour).multiplyScalar(rk);
      room.bloom.strength *= Math.pow(1 - paper, 3);        // no glow until the sheet has really gone dark
      room.grain.uniforms.uVig.value = 0.55 + 0.33 * paper;
      // on the sheet the guitar is lit like a product on a table, not a spot in a dark room
      room.scene.environmentIntensity *= 1 + 0.9 * paper;
      room.top.intensity += 1.6 * paper;
    } else {
      // lights down: the halo and the plinth ring stay as a faint frame, the floor keeps its mirror
      const low = 1 - 0.75 * sm(0.2, 0.8, S.at) * (1 - sm(T.fill[0], T.back[1], S.at));
      room.seams[0].material.color.multiplyScalar(low);
      room.items[room.index].ringMat.color.multiplyScalar(0.4 + 0.6 * low);
    }

    // the model: fades into the background, stays away while the ink goes down, comes back by the sweep
    root.updateWorldMatrix(true, false);
    U.uRootInv.value.copy(root.matrixWorld).invert();
    U.uBg.value.copy(bg);
    U.uC.value.copy(kit.centre);
    const filling = S.fill > 0;
    let sweep = BIG, fw = 0.02;
    const axis = U.uAxis.value;
    if (m === 'ink') {
      // out from the bridge, with a wandering edge
      axis.set(0, 0, 0, 1); U.uNz.value.set(26, 0.05, 0.007);
      sweep = -0.03 + Math.pow(S.fill, 1.3) * (kit.reach + 0.09); fw = 0.035;
    } else if (m === 'stack') {
      // up through the depth, a clean cut with the wood showing in it
      axis.set(0, 0, 1, 0); U.uNz.value.set(1, 0, 0.0006);
      sweep = kit.zMin - 0.002 + sm(0.3, 1, S.fill) * (kit.M.box.max.z - kit.zMin + 0.004); fw = 0.0035;
      U.uCapOn.value = S.fill < 1 ? 1 : 0; U.uCap.value.copy(this.cap);
    } else {
      // along the length, tail first, with a lit edge
      axis.set(0, 1, 0, 0); U.uNz.value.set(60, 0.006, 0.004);
      sweep = kit.M.box.min.y - 0.01 + S.fill * (kit.yMax - kit.M.box.min.y + 0.03); fw = 0.03;
      U.uEdge.value.copy(accent).multiplyScalar(5 * (1 - sm(0.92, 1, S.fill)) * sm(0, 0.05, S.fill)); U.uEdgeW.value = 0.014;
    }
    U.uSweep.value = filling ? (S.fill >= 1 ? BIG : sweep) : BIG;
    U.uGhost.value = filling ? 0 : S.ghost;
    root.children.forEach((c) => { if (c !== kit.group) c.visible = filling || S.ghost < 0.999; });

    // the lines
    kit.group.visible = true;
    const size = room.renderer.getDrawingBufferSize(this._v2 ||= new THREE.Vector2()), pr = room.renderer.getPixelRatio();
    const inkAccent = this._c1 ||= new THREE.Color();
    if (dark) inkAccent.copy(accent); else inkAccent.copy(toSceneCached(this, accent));
    const explode = m === 'stack' ? 1 + 1.9 * sm(0, 0.5, S.rise) * (1 - sm(0, 0.3, S.fill)) : 1;
    for (const [mesh, isPlan] of [[kit.plan, true], [kit.struct, false]]) {
      const u = mesh.material.uniforms;
      u.uRes.value.copy(size); u.uPR.value = pr;
      u.uRise.value = S.rise; u.uExplode.value = explode; u.uRiseW.value = m === 'stack' ? 0.3 : 0.45;
      u.uAxis.value.copy(axis); u.uSweep.value = filling ? sweep : -BIG; u.uFw.value = fw;
      if (dark) { u.uColor.value.copy(accent).multiplyScalar(isPlan ? 1.15 : 0.6); u.uColor2.value.copy(accent).multiplyScalar(isPlan ? 0.7 : 0.6); }
      else { u.uColor.value.copy(this.ink); u.uColor2.value.copy(inkAccent); }
      if (isPlan) { u.uDraw.value = S.draw * 1.02; u.uOpacity.value = S.lines; u.uFadeRise.value = 0; }
      else if (m === 'stack') { u.uDraw.value = S.draw * 1.02; u.uOpacity.value = S.lines; u.uFadeRise.value = 0; }
      else { u.uDraw.value = 2; u.uOpacity.value = S.lines * sm(0, 0.12, S.rise); u.uFadeRise.value = 1; }
    }

    // the sheet's own layers
    for (const k in kit.layers) { const on2 = kit.layers[k] === L; kit.layers[k].dims.visible = on2 && S.dims > 0.002; kit.layers[k].shadow.visible = on2 && !dark && S.fill > 0.01 && S.back < 0.999; }
    const du = L.dims.material.uniforms;
    du.uOpacity.value = S.dims; du.uReveal.value = sm(0, 0.8, S.dims);
    if (dark) { du.uInk.value.copy(accent).multiplyScalar(0.6); du.uDim.value.copy(accent).multiplyScalar(1.0); }
    else { du.uInk.value.copy(this.ink); du.uDim.value.copy(inkAccent); }
    const su = L.shadow.material.uniforms;
    su.uRadial.value = m === 'ink' ? 1 : 0; su.uSweep.value = sweep;
    su.uOpacity.value = 0.34 * (m === 'ink' ? sm(0, 0.15, S.fill) : sm(0.3, 1, S.fill)) * (1 - S.back) * paper;

    // the words
    const accentHex = paper > 0.5 ? `#${new THREE.Color(accent).lerp(new THREE.Color('#1a1612'), 0.42).getHexString()}` : `#${accent.getHexString()}`;
    this.words.frame(S, { info: kit.info, D: kit.D, mode: this.mode, paper, accent: accentHex });
  }

  /** While the room is at rest, get the guitar in front ready (depth maps, lines, the sheet's
   *  layers), so the first scroll does not wait for them. */
  warm(force = false) {
    const room = this.room, it = room.items[room.index];
    if (!it || !it.info.real || (!force && (!room.allReady || room.lights < 0.9)) || this.warmed === it.info.id || Math.abs(room.u - Math.round(room.u)) > 0.01) return;
    const kit = this.kit(it);
    if (!kit) return;
    this.warmed = it.info.id;
    this.shots(room.walk.plan(it, room.portrait), kit);
    kit.group.visible = false;
  }

  /** Back to the room exactly as the page has it. */
  rest() {
    this.live = false;
    const room = this.room;
    room.scene.background.copy(this.dark);
    for (const o of [room.floor, this.wall, room.halo, room.cone, room.dust, ...room.seams]) if (o) o.visible = true;
    room.items.forEach((it) => { it.group.visible = true; it.pedestal.visible = true; });
    room.floor.material.uniforms.uStrength.value = 1.25;
    if (this.wall) this.wall.material.color.copy(this.wallColour);
    room.grain.uniforms.uVig.value = 0.55;
    for (const kit of this.kits.values()) {
      kit.group.visible = false;
      kit.root.children.forEach((c) => { if (c !== kit.group) c.visible = true; });
    }
    for (const U of this.reveal.values()) { U.uSweep.value = BIG; U.uGhost.value = 0; U.uEdge.value.set(0, 0, 0); }
    this.words.hide();
  }
}

// the guitar's colour, deepened to an ink for the sheet, as a scene colour
function toSceneCached(draft, accent) {
  const key = accent.getHexString();
  if (draft._inkKey !== key) {
    draft._inkKey = key;
    const c = accent.clone().lerp(new THREE.Color('#1a1612'), 0.42);
    draft._ink = toScene(`#${c.getHexString()}`, draft.room.renderer.toneMappingExposure);
  }
  return draft._ink;
}

/** Called once the room has loaded. Null with reduced motion: the walk then keeps its plain lift. */
export function initDraft(room) {
  if (!MODE || !room || room.reduced) return null;
  return (window.__draft = new Draft(room));
}
