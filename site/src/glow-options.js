// The hero's glow and particles, three options behind ?glow=fade|embers|corona (V7, 2026-11-02, demo-options
// round). Sam: the arch "cuts too abruptly", he wants it to fade and blend into the background without the
// fade starting straight away, and the particles to move more. Without the switch nothing here loads.
//   fade    01 Long Fade: the arch runs on past the arrows, thins and goes out, its glow widening as it goes.
//           The motes turn slowly round the guitar, in depth, some of them soft and out of focus.
//   embers  02 Ember Run: light runs down the arch from the top, and sparks run with it, fall off the two
//           ends and go out before the glass. The arch fades into its own falling sparks.
//   corona  03 Corona: a soft crown of slow rays off the arch, like an eclipse, fading into the dark. The motes
//           stream out through it.
// All three draw the arch in one plane, in polar coordinates, inside the room's `halo` group, so it follows
// the colour, the lights and the close-up as the arch always has (showroom.js sets `.color` every frame).
import * as THREE from 'three';

const R = 0.6, R2 = 0.635;                 // the arch's two lines, metres, as they were
const D2R = Math.PI / 180;

const ARCH = /* glsl */`
  uniform vec3 color; uniform float uTime, uHold, uEnd, uGlow, uWiden, uPulse, uCorona, uBreath;
  varying vec2 vP;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { return 0.55 * noise(p) + 0.3 * noise(p * 2.07 + 4.1) + 0.15 * noise(p * 4.3 + 9.2); }
  void main() {
    float r = length(vP), a = abs(atan(vP.x, vP.y));        // a: 0 at the top of the arch, PI at the bottom
    float t = clamp((a - uHold) / (uEnd - uHold), 0.0, 1.0);  // 0 while it holds, 1 where it has gone out
    float tail = 1.0 - t * t * (3.0 - 2.0 * t);               // the fade, with no edge at either end
    float breath = 1.0 + uBreath * sin(uTime * 0.9);
    float aa = fwidth(r) * 1.2;
    // the two lines, thinning as they go out
    float w1 = mix(0.0042, 0.0012, t), w2 = mix(0.0030, 0.0008, t);
    float core = (1.0 - smoothstep(w1 - aa * 0.5, w1 + aa, abs(r - ${R.toFixed(3)})));
    float t2 = clamp((a - uHold * 0.85) / (uEnd * 0.92 - uHold * 0.85), 0.0, 1.0);
    float second = (1.0 - smoothstep(w2 - aa * 0.5, w2 + aa, abs(r - ${R2.toFixed(3)}))) * (1.0 - t2 * t2 * (3.0 - 2.0 * t2));
    // the glow round them: wider and fainter towards the ends, so it dissolves rather than stops
    float d = r - 0.605, s = mix(0.05, 0.05 + uWiden, t);
    float glow = exp(-d * d / (s * s)) * mix(1.0, 0.55, t);
    float wide = exp(-d * d / (s * s * 12.0)) * 0.34;
    // light running down the arch from the top, on both sides
    float pulse = 0.0;
    if (uPulse > 0.0) for (int i = 0; i < 2; i++) {
      float at = fract(uTime * 0.085 + float(i) * 0.5) * (uEnd + 0.25) - 0.1, g = (a - at) / 0.13;
      pulse += exp(-g * g);
    }
    // the crown: rays that drift, longest over the top, fading far out into the dark
    float crown = 0.0;
    if (uCorona > 0.0) {
      // outside the arch only: inside, rays would meet at the guitar like a starburst
      float out0 = max(r - 0.61, 0.0);
      float n = fbm(vec2(atan(vP.x, vP.y) * 7.0, r * 1.4 - uTime * 0.07));
      float n2 = fbm(vec2(atan(vP.x, vP.y) * 19.0 + 3.0, r * 2.2 - uTime * 0.12));
      float rays = smoothstep(0.3, 0.8, 0.6 * n + 0.4 * n2);
      crown = rays * exp(-out0 * 8.5) * smoothstep(0.6, 0.625, r);
    }
    // nothing soft reaches the glass with a line: the glow fades before the floor
    float glass = smoothstep(-0.6, -0.3, vP.y);
    vec3 hot = color * (core * 3.0 * (1.0 + 1.6 * uPulse * pulse) + second * 0.6);
    vec3 soft = color * ((glow * 0.26 + wide * 0.13) * uGlow * breath * (1.0 + 0.9 * uPulse * pulse));
    gl_FragColor = vec4(hot * tail + soft * tail * glass + color * crown * uCorona * tail * glass * breath, 1.0);
  }`;

function archPlane(opts, size = 1.5) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color() }, uTime: { value: 0 }, uHold: { value: opts.hold * D2R }, uEnd: { value: opts.end * D2R }, uGlow: { value: opts.glow ?? 1 },
      uWiden: { value: opts.widen ?? 0.08 }, uPulse: { value: opts.pulse ?? 0 }, uCorona: { value: opts.corona ?? 0 }, uBreath: { value: opts.breath ?? 0 } },
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: ARCH,
  });
  mat.color = mat.uniforms.color.value;     // the room's frame sets .color on every child of the halo
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), mat);
  m.userData.k = 1;
  return m;
}

// A cloud of motes moved entirely in the vertex shader, one short function of time per option. Drawn additive.
const MOTE_FRAG = /* glsl */`
  uniform vec3 color; varying float vA;
  void main() { vec2 p = gl_PointCoord - 0.5; float d = dot(p, p) * 4.0; if (d > 1.0) discard;
    float k = (1.0 - d); gl_FragColor = vec4(color * k * k * vA, 1.0); }`;
function motes(n, move) {
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) seed[i] = Math.random();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color() }, uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec4 aSeed; uniform float uTime, uPx; varying float vA;
      const float PI = 3.14159265;
      ${move}
      void main() {
        vec3 p; float size, alpha; mote(aSeed, uTime, p, size, alpha);
        vA = alpha;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = max(size * uPx / -mv.z, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: MOTE_FRAG,
  });
  mat.color = mat.uniforms.color.value;
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.k = 1;
  return pts;
}

// 01: slowly round the guitar, in depth: near ones large, soft and quick, far ones small. They rise a little.
const TURN = /* glsl */`
  void mote(vec4 s, float t, out vec3 p, out float size, out float alpha) {
    float depth = s.z;                                  // 0 far, 1 near
    float rad = mix(0.2, 0.84, sqrt(s.x));
    float a = s.y * 6.2832 + t * (0.05 + 0.13 * depth) * (s.w > 0.5 ? 1.0 : 0.82);
    float life = fract(s.w * 7.0 + t * (0.018 + 0.02 * s.x));
    p = vec3(cos(a) * rad, sin(a) * rad * 0.82 + (life - 0.5) * 0.5, mix(-0.25, 0.95, depth));
    p.x += sin(t * 0.4 + s.y * 20.0) * 0.012;
    size = mix(0.013, depth > 0.9 ? 0.04 : 0.02, depth);
    float tw = 0.65 + 0.35 * sin(t * (0.8 + 1.6 * s.x) + s.w * 40.0);
    alpha = tw * sin(PI * life) * (depth > 0.9 ? 0.22 : 0.85);
  }`;

// 02: down the arch from the top, then off the end, falling and going out before the glass
const RUN = /* glsl */`
  const float END = ${(132 * D2R).toFixed(4)}, FLOOR = -0.62;
  void mote(vec4 s, float t, out vec3 p, out float size, out float alpha) {
    float side = s.x > 0.5 ? 1.0 : -1.0;
    float life = fract(s.y + t * (0.05 + 0.05 * s.z));
    float run = 0.62;                                   // the share of its life on the arch
    float jitter = (s.w - 0.25) * 0.03;      // a little off the line, or the bright line hides them
    if (life < run) {
      float u = life / run, a = pow(u, 1.25) * END;
      float rr = 0.603 + jitter + sin(u * 30.0 + s.w * 50.0) * 0.003;
      p = vec3(side * sin(a) * rr, cos(a) * rr, 0.0);
      alpha = smoothstep(0.0, 0.12, u) * mix(0.55, 1.0, s.z);
      size = mix(0.011, 0.02, s.z);
    } else {
      float u = (life - run) / (1.0 - run), tt = u * 2.1;
      vec2 a0 = vec2(side * sin(END) * 0.603, cos(END) * 0.603);
      vec2 v = vec2(side * cos(END), -sin(END)) * 0.2 + vec2(side * (s.w - 0.3) * 0.12, 0.0);
      vec2 q = a0 + v * tt + vec2(sin(tt * 5.0 + s.w * 30.0) * 0.007, -0.1 * tt * tt);
      p = vec3(q, (s.z - 0.5) * 0.05 * tt);
      alpha = (1.0 - u) * (1.0 - u) * mix(0.55, 1.0, s.z) * smoothstep(FLOOR, FLOOR + 0.14, q.y);
      size = mix(0.009, 0.018, s.z) * (1.0 - 0.45 * u);
    }
  }`;

// 03: out from the arch through the crown, slowing and going out in the dark
const STREAM = /* glsl */`
  void mote(vec4 s, float t, out vec3 p, out float size, out float alpha) {
    float a = (s.x - 0.5) * ${(250 * D2R).toFixed(4)} + sin(t * 0.09 + s.w * 20.0) * 0.05;
    float life = fract(s.y + t * (0.035 + 0.05 * s.z));
    float inward = s.w < 0.22 ? -1.0 : 1.0;
    float reach = inward > 0.0 ? mix(0.16, 0.42, s.z) : 0.2;
    float rr = 0.6 + inward * reach * (1.0 - pow(1.0 - life, 2.0));
    p = vec3(sin(a) * rr, cos(a) * rr, (s.w - 0.5) * 0.5);
    float tw = 0.7 + 0.3 * sin(t * 2.0 + s.w * 60.0);
    alpha = tw * smoothstep(0.0, 0.08, life) * pow(1.0 - life, 1.4) * mix(0.7, 1.0, s.z);
    size = mix(0.012, 0.026, s.z);
  }`;

const SCORES = {
  fade: { arch: { hold: 88, end: 146, glow: 1.12, widen: 0.12, breath: 0.05 }, n: 260, move: TURN, gain: 1.05 },
  embers: { arch: { hold: 96, end: 134, glow: 1, widen: 0.07, pulse: 1 }, n: 300, move: RUN, gain: 1.55 },
  corona: { arch: { hold: 96, end: 150, glow: 1.05, widen: 0.14, corona: 0.85, breath: 0.09 }, n: 260, move: STREAM, gain: 1.15, size: 1.5 },
};

export function buildGlow(slug, room) {
  const S = SCORES[slug];
  if (!S) return false;
  const [line, outer] = room.halo.children;
  line.visible = false; outer.visible = false;       // the old arch stays on the books, the new one draws in its place
  const arch = archPlane(S.arch, S.size || 1.5);
  const cloud = motes(room.mobile ? Math.round(S.n * 0.6) : S.n, S.move);
  room.halo.add(arch, cloud);
  // the room's dust is still there for the tour. In the hero the new motes take over from it
  room.keepAlive = true;                             // they keep moving when the page is left alone, at half the frames
  room.onFrame = () => {
    const t = room.time, on = line.material.color;  // the old arch's colour is still set every frame, at k = 3
    arch.material.uniforms.uTime.value = t;
    cloud.material.uniforms.uTime.value = t;
    cloud.material.uniforms.uPx.value = room.renderer.domElement.height * 0.9;
    // the frame set `.color` on the new children from the accent, the lights and the close-up
    cloud.material.color.multiplyScalar(S.gain * 1.4);
    const lit = on.r + on.g + on.b > 0.002;
    arch.visible = cloud.visible = lit;
  };
  return true;
}
