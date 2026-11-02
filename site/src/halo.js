// The hero's arch of light, and the motes round it: Long Fade (V7, picked by Sam on 2026-11-02 from three. Ember
// Run and Corona are under the tag alt/v7-glow, behind ?glow=). He found the old arch "cuts too abruptly": it
// stopped at two bright blunt ends. Now it holds its full strength past the arrows, then thins and goes out by
// the plinth, and the glow round it widens as it dims, so it dissolves into the room.
//   makeArch()         one plane in the room's `halo` group, drawn in polar coordinates: the fade is a function
//                      of the angle. Its lines are bright enough to catch the bloom. The soft glow is not, and
//                      fades before the glass so it never leaves a line across the floor.
//   makeMotes(n)       motes turning slowly round the guitar in depth, near ones large and out of focus. They
//                      move in the vertex shader, one function of time, so moving them costs no CPU.
//   showroom.js sets `.color` on both every frame (accent, lights, close-up) and calls setTime(t, height).
import * as THREE from 'three';

const R = 0.6, R2 = 0.635;                  // the arch's two lines, metres
const D2R = Math.PI / 180;
const HOLD = 88 * D2R, END = 146 * D2R;     // from the top: full strength to just past the arrows, gone by the plinth

const ARCH_FRAG = /* glsl */`
  uniform vec3 color; uniform float uTime;
  varying vec2 vP;
  void main() {
    float r = length(vP), a = abs(atan(vP.x, vP.y));      // a: 0 at the top of the arch, PI at the bottom
    float t = clamp((a - ${HOLD.toFixed(4)}) / ${(END - HOLD).toFixed(4)}, 0.0, 1.0);
    float tail = 1.0 - t * t * (3.0 - 2.0 * t);           // no edge where it starts or where it ends
    float aa = fwidth(r) * 1.2;
    // the two lines, thinning as they go out. The outer one goes first
    float w1 = mix(0.0042, 0.0012, t), w2 = mix(0.0030, 0.0008, t);
    float line = 1.0 - smoothstep(w1 - aa * 0.5, w1 + aa, abs(r - ${R.toFixed(3)}));
    float t2 = clamp((a - ${(HOLD * 0.85).toFixed(4)}) / ${(END * 0.92 - HOLD * 0.85).toFixed(4)}, 0.0, 1.0);
    float outer = (1.0 - smoothstep(w2 - aa * 0.5, w2 + aa, abs(r - ${R2.toFixed(3)}))) * (1.0 - t2 * t2 * (3.0 - 2.0 * t2));
    // the glow round them: wider and fainter towards the ends
    float d = r - 0.605, s = 0.05 + 0.12 * t;
    float glow = exp(-d * d / (s * s)) * mix(1.0, 0.55, t) * 0.26 + exp(-d * d / (s * s * 12.0)) * 0.044;
    float breath = 1.0 + 0.05 * sin(uTime * 0.9);
    float glass = smoothstep(-0.6, -0.3, vP.y);
    gl_FragColor = vec4(color * ((line * 3.0 + outer * 0.6) * tail + glow * 1.12 * breath * tail * glass), 1.0);
  }`;

export function makeArch() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color() }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: ARCH_FRAG,
  });
  mat.color = mat.uniforms.color.value;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), mat);
  m.userData.k = 1;
  m.setTime = (t) => { mat.uniforms.uTime.value = t; };
  return m;
}

export function makeMotes(n) {
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
      void main() {
        vec4 s = aSeed; float t = uTime;
        float depth = s.z;                                // 0 far, 1 near
        float rad = mix(0.2, 0.84, sqrt(s.x));
        float a = s.y * 6.2832 + t * (0.05 + 0.13 * depth) * (s.w > 0.5 ? 1.0 : 0.82);
        float life = fract(s.w * 7.0 + t * (0.018 + 0.02 * s.x));
        vec3 p = vec3(cos(a) * rad + sin(t * 0.4 + s.y * 20.0) * 0.012, sin(a) * rad * 0.82 + (life - 0.5) * 0.5, mix(-0.25, 0.95, depth));
        float near = step(0.9, depth);
        float tw = 0.65 + 0.35 * sin(t * (0.8 + 1.6 * s.x) + s.w * 40.0);
        vA = tw * sin(3.14159265 * life) * mix(0.85, 0.22, near);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = max(mix(0.013, mix(0.02, 0.04, near), depth) * uPx / -mv.z, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 color; varying float vA;
      void main() { vec2 p = gl_PointCoord - 0.5; float d = dot(p, p) * 4.0; if (d > 1.0) discard;
        float k = 1.0 - d; gl_FragColor = vec4(color * k * k * vA, 1.0); }`,
  });
  mat.color = mat.uniforms.color.value;
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.k = 1.47;
  pts.setTime = (t, h) => { mat.uniforms.uTime.value = t; mat.uniforms.uPx.value = h * 0.9; };
  return pts;
}
