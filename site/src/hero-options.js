// Hero v2, three directions for session 3, picked with ?hero=<slug>.
// Without the parameter nothing here runs and the room is exactly as before.
//
// All three share the brief's fixed parts: a clean glass floor instead of the
// blurred stone, far fewer circles, and glow that is evened out per colour so
// the blue guitar lights the room as strongly as the warm ones. They differ in
// where the camera stands and where the light lives.
//
//   ?hero=step     Step In      the room as it is, the camera walked in close
//   ?hero=glass    Black Glass  a low product shot on a mirror-black floor,
//                               the halo swapped for a wash of colour on the wall
//   ?hero=breathe  Breathe      close at rest; each turn pulls the camera back
//                               to show the ring, then pushes in on the next one
import * as THREE from 'three';

// ------------------------------------------------------------ glass floor ----
// Sharp reflection (a four-tap soften only, for the half-res target's edges),
// a strong Fresnel so it reads as glossy glass, and the light pool.
const GLASS_FRAG = /* glsl */`
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  uniform vec3 uCam;
  uniform float uStrength;
  uniform float uBlur;
  uniform vec3 uPool;
  uniform float uPoolR;
  uniform float uFres0;
  varying vec4 vUv;
  varying vec3 vWorld;
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    vec2 uv = vUv.xy / vUv.w;
    vec3 refl = texture2D(tDiffuse, uv).rgb * 0.52;
    refl += texture2D(tDiffuse, uv + vec2(uBlur, 0.0)).rgb * 0.12;
    refl += texture2D(tDiffuse, uv - vec2(uBlur, 0.0)).rgb * 0.12;
    refl += texture2D(tDiffuse, uv + vec2(0.0, uBlur)).rgb * 0.12;
    refl += texture2D(tDiffuse, uv - vec2(0.0, uBlur)).rgb * 0.12;
    vec3 V = normalize(uCam - vWorld);
    float fres = uFres0 + (1.0 - uFres0) * pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
    float fade = smoothstep(10.0, 1.2, length(vWorld.xz - vec2(0.0, -1.2)));
    float pool = exp(-dot(vWorld.xz, vWorld.xz) / uPoolR);
    vec3 col = color + uPool * pool + refl * uStrength * fres * fade;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function glassFloor(room, { strength = 1.0, fres0 = 0.3, poolR = 0.9, res = 0.8 } = {}) {
  const m = room.floor.material;
  m.fragmentShader = GLASS_FRAG;
  m.uniforms.uStrength.value = strength;
  m.uniforms.uBlur = { value: 0.0007 };
  m.uniforms.uPoolR = { value: poolR };
  m.uniforms.uFres0 = { value: fres0 };
  m.uniforms.color.value.set('#050506');
  m.needsUpdate = true;
  room.floorRes = res;
}

// --------------------------------------------------------------- glow gain ----
// Perceived brightness differs a lot between the seven colours: the blue of
// Scree has about 40% of the luminance of Floe's ice blue. Each glow is scaled
// towards the same luminance, gently (square root), so none of them flattens.
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const gainOf = (c) => THREE.MathUtils.clamp(Math.pow(0.5 / Math.max(lum(c), 0.05), 0.55), 0.8, 1.7);

function evenGlow(room) {
  const g = gainOf(room.cone.material.uniforms.uColor.value);
  room.halo.children.forEach((m) => m.material.color.multiplyScalar(g));
  room.stage.children.forEach((m) => m.material.color.multiplyScalar(g));
  room.seams[0].material.color.multiplyScalar(g);   // the seams share one material
  room.cone.material.uniforms.uColor.value.multiplyScalar(g);
  room.dust.material.color.multiplyScalar(g);
  room.floor.material.uniforms.uPool.value.multiplyScalar(g);
  room.items.forEach((it, i) => {
    const k = room.gains[i];
    it.ringMat.color.multiplyScalar(k);
  });
}

// what every option does: glass, fewer circles, even glow
const base = {
  init(room) {
    room.stage.children.forEach((m, i) => { m.visible = i === 0; });
  },
  layout(room, portrait, w, h, pr) {
    const k = room.floorRes || 0.8;
    room.floor.getRenderTarget().setSize(Math.round(w * pr * k), Math.round(h * pr * k));
  },
  loaded(room) {
    room.gains = room.palette.map(gainOf);
    room.items.forEach((it) => { it.baseMat.visible = false; it.pedestal.children[2].visible = false; });
    if (room.track) room.track.visible = false;
    room.trackMat.visible = false;
  },
  frame(room) { evenGlow(room); },
};

// ------------------------------------------------------------------ 01 Step In
// The same room, the camera walked in. The centre guitar fills well over half
// the height, the neighbours sit at the frame's edges. One ring on the floor.
const step = {
  ...base,
  slug: 'step',
  init(room) {
    base.init(room);
    glassFloor(room, { strength: 1.05, fres0: 0.28 });
  },
  layout(room, portrait, w, h, pr) {
    base.layout(room, portrait, w, h, pr);
    room.path = portrait
      ? [[0, 0], [0.74, -0.7], [1.35, -1.8], [1.95, -3.0], [2.5, -4.5]]
      : [[0, 0], [0.98, -0.5], [1.86, -1.36], [2.7, -2.6], [3.5, -4.1]];
    room.camBase = portrait
      ? { pos: new THREE.Vector3(0, 1.12, 3.9), target: new THREE.Vector3(0, 0.76, -0.1), fov: 30 }
      : { pos: new THREE.Vector3(0, 1.08, 3.75), target: new THREE.Vector3(0, 0.74, -0.3), fov: 22 };
  },
};

// -------------------------------------------------------------- 02 Black Glass
// A low camera, just above the pedestal tops, looking slightly up. The floor
// is a black mirror, so the guitar stands on its own reflection. No rings on
// the floor at all; the colour moves off the halo into a soft wash of light on
// the wall behind, with the dust drifting through it.
const WASH = {
  uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */`
    uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
    void main() {
      vec2 p = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.35);
      float d = length(p);
      float a = exp(-d * d * 22.0) * 0.8 + exp(-d * d * 90.0) * 0.4;
      a *= smoothstep(0.0, 0.25, vUv.y) * 0.75;
      gl_FragColor = vec4(uColor * a * uAlpha, 1.0);
    }`,
};

const glass = {
  ...base,
  slug: 'glass',
  init(room) {
    base.init(room);
    room.stage.children.forEach((m) => { m.visible = false; });
    room.halo.visible = false;
    glassFloor(room, { strength: 1.25, fres0: 0.45, poolR: 0.6, res: 0.9 });
    const wash = room.wash = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4),
      new THREE.ShaderMaterial({ ...WASH, uniforms: THREE.UniformsUtils.clone(WASH.uniforms), transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending }));
    wash.position.set(0, 0.95, -1.7);
    room.scene.add(wash);
  },
  layout(room, portrait, w, h, pr) {
    base.layout(room, portrait, w, h, pr);
    room.path = portrait
      ? [[0, 0], [0.82, -0.8], [1.5, -2.0], [2.1, -3.3], [2.6, -4.7]]
      : [[0, 0], [1.08, -0.62], [2.0, -1.6], [2.8, -2.9], [3.5, -4.3]];
    room.camBase = portrait
      ? { pos: new THREE.Vector3(0, 0.4, 3.75), target: new THREE.Vector3(0, 0.6, 0), fov: 32 }
      : { pos: new THREE.Vector3(0, 0.36, 3.5), target: new THREE.Vector3(0, 0.5, 0), fov: 26 };
  },
  loaded(room) {
    base.loaded(room);
    // the pedestals become low plinths, so the floor shows round them
    room.items.forEach((it) => { it.pedestal.scale.y = 0.4; it.spinner.position.y = 0.22 * 0.4 + 0.028; });
    // on phones the button sits on the plinth's front face, which is lower now
    room.stageScreenY = function () {
      this.camera.updateMatrixWorld();
      const v = new THREE.Vector3(0, 0.045, 0.325).project(this.camera);
      return (1 - (v.y * 0.5 + 0.5)) * (this.canvas.clientHeight || innerHeight);
    };
  },
  frame(room, dt) {
    base.frame(room, dt);
    const c = room.cone.material.uniforms.uColor.value;   // already evened out
    const L = room.lights, F = room.focus;
    room.wash.material.uniforms.uColor.value.copy(c);
    room.wash.material.uniforms.uAlpha.value = 0.3 * THREE.MathUtils.smoothstep(L, 0.2, 1) * (1 - 0.8 * F);
  },
};

// ----------------------------------------------------------------- 03 Breathe
// Close at rest, closer than Step In. When the ring turns, the camera pulls
// back and leans into the turn, so for a moment you see the whole room move,
// then it pushes in on the guitar that arrives. The pull-back follows how fast
// the ring is moving, so a drag or a fling breathes the same way.
const breathe = {
  ...step,
  slug: 'breathe',
  init(room) {
    base.init(room);
    glassFloor(room, { strength: 1.05, fres0: 0.28 });
    room.breath = 0; room.lean = 0; room.lastU = room.u;
  },
  layout(room, portrait, w, h, pr) {
    base.layout(room, portrait, w, h, pr);
    room.path = portrait
      ? [[0, 0], [0.74, -0.7], [1.35, -1.8], [1.95, -3.0], [2.5, -4.5]]
      : [[0, 0], [0.98, -0.5], [1.86, -1.36], [2.7, -2.6], [3.5, -4.1]];
    room.camBase = portrait
      ? { pos: new THREE.Vector3(0, 1.0, 3.3), target: new THREE.Vector3(0, 0.78, 0), fov: 30 }
      : { pos: new THREE.Vector3(0, 0.98, 3.05), target: new THREE.Vector3(0, 0.76, -0.2), fov: 22 };
    room.camWide = portrait
      ? { pos: new THREE.Vector3(0, 1.45, 5.6), target: new THREE.Vector3(0, 0.66, -0.4) }
      : { pos: new THREE.Vector3(0, 1.42, 6.0), target: new THREE.Vector3(0, 0.66, -0.8) };
  },
  camera(room, pos, tgt, dt) {
    if (!dt) return;
    const v = (room.u - room.lastU) / dt;       // ring speed, guitars per second
    room.lastU = room.u;
    const want = Math.min(Math.abs(v) / 0.9, 1);
    // out quickly, in slowly: the push-in lands after the guitar does
    room.breath += (want - room.breath) * Math.min(dt * (want > room.breath ? 5 : 2.2), 1);
    room.lean += (THREE.MathUtils.clamp(v * 0.35, -0.5, 0.5) - room.lean) * Math.min(dt * 3, 1);
    const k = room.breath * room.breath * (3 - 2 * room.breath);
    const W = room.camWide;
    pos.x += (W.pos.x - room.camBase.pos.x) * k + room.lean * 0.5;
    pos.y += (W.pos.y - room.camBase.pos.y) * k;
    pos.z += (W.pos.z - room.camBase.pos.z) * k;
    tgt.x += room.lean * 0.25;
    tgt.y += (W.target.y - room.camBase.target.y) * k;
    tgt.z += (W.target.z - room.camBase.target.z) * k;
  },
};

// ------------------------------------------------- 04 Breathe on Glass
// Sam's mix after the first round: Breathe's close framing and its zoom, with
// Black Glass's mirror floor. At rest it is close on the guitar under its
// halo; on a turn the camera pulls back and drops low, so the plinths and the
// guitars stand on their reflections, then it rises and pushes in again.
// The halo sits lower, round the guitar rather than above it, and the
// platform has one soft ring instead of the floor ring plus the bright top.
const wrapS = (s) => ((((s + 3.5) % 7) + 7) % 7) - 3.5;
const breatheGlass = {
  ...breathe,
  slug: 'breatheglass',
  init(room) {
    base.init(room);
    room.stage.children.forEach((m) => { m.visible = false; });
    glassFloor(room, { strength: 1.25, fres0: 0.45, poolR: 0.6, res: 0.9 });
    room.halo.position.y = 0.5;
    room.breath = 0; room.lean = 0; room.lastU = room.u;
  },
  layout(room, portrait, w, h, pr) {
    base.layout(room, portrait, w, h, pr);
    room.floorRes = 0.9;
    room.halo.scale.setScalar(portrait ? 0.74 : 0.94);
    room.path = portrait
      ? [[0, 0], [0.82, -0.8], [1.5, -2.0], [2.1, -3.3], [2.6, -4.7]]
      : [[0, 0], [1.08, -0.62], [2.0, -1.6], [2.8, -2.9], [3.5, -4.3]];
    room.camBase = portrait
      ? { pos: new THREE.Vector3(0, 0.8, 3.35), target: new THREE.Vector3(0, 0.6, 0), fov: 30 }
      : { pos: new THREE.Vector3(0, 0.78, 3.0), target: new THREE.Vector3(0, 0.58, -0.2), fov: 22 };
    room.camWide = portrait
      ? { pos: new THREE.Vector3(0, 0.42, 5.9), target: new THREE.Vector3(0, 0.5, -0.6) }
      : { pos: new THREE.Vector3(0, 0.4, 5.6), target: new THREE.Vector3(0, 0.48, -0.9) };
  },
  loaded(room) {
    glass.loaded(room);
  },
  frame(room, dt) {
    base.frame(room, dt);
    // the platform ring: soft on the guitar in front, as before on the sides
    room.items.forEach((it, i) => {
      const a = Math.abs(wrapS(i - room.u));
      it.ringMat.color.multiplyScalar(0.32 + 0.68 * THREE.MathUtils.smoothstep(a, 0, 1));
    });
  },
};

const OPTIONS = { step, glass, breathe, breatheglass: breatheGlass };

// The closer camera puts the headstock where the model name was, so on wide
// screens the name and View guitar move to the right edge, level with the
// guitar. The button no longer rides on the pedestal, which also keeps it
// off the arrows.
const CSS = `
@media (min-width: 901px) {
  .hero-opt .room__title { left: auto; right: var(--gutter); top: 50%; transform: translateY(-62%); text-align: right;
    text-shadow: 0 0 28px rgba(5, 4, 4, 0.95), 0 0 8px rgba(5, 4, 4, 0.8); }
  .hero-opt .room__name { padding-left: 0; margin-right: -0.16em; }
  .hero-opt .room__view { left: auto; right: calc(var(--gutter) - 4px); top: calc(50% + 34px); transform: none; }
}`;

export function heroOption(slug) {
  const o = OPTIONS[slug];
  if (!o) return null;
  document.documentElement.classList.add('hero-opt');
  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
  return o;
}
