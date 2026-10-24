// The showroom: seven plinths on a curved track over a black glass floor,
// the centre one under a spot and a halo, the rest falling away into the dark. One continuous number, `u`,
// drives the whole ring: guitar i sits at slot s = wrap(i - u), and every
// visual (position, dimming, ring light, lift) is a function of s. Stepping,
// dragging and clicking all just move `u`.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildStandin } from './standins.js';
import { prepareGuitar, gltfLoader } from './guitar-look.js';
import { Walk, LIFT, blendShots } from './sequence.js';

const N = 7;
const ACCENT = new THREE.Color('#e7bd7f');   // the centre guitar's colour, set every frame (applyPalette)
const PED_TOP = 0.09;                  // plinth height, metres: low, so the glass floor shows round them
const HOVER = 0.028;                   // guitars float just clear of the top
const FILL = 0.9;                      // how much of the frame a walk stop's subject takes
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3();
const _hslA = { h: 0, s: 0, l: 0 }, _hslB = { h: 0, s: 0, l: 0 };

// ------------------------------------------------------------ tunables ----
export const LOOK = {
  exposure: 1.05,
  bloom: { strength: 0.62, radius: 0.55, threshold: 0.82 },
  envIntensity: 0.62,
  spot: 46,               // centre key light, candela
  rim: 16,
  spinSpeed: 0.16,        // rad/s, the centre guitar's slow turn
  stepDuration: 1.7,      // seconds per ring step
  grain: 0.035,
  dof: 0.0075,            // walk depth of field: blur per metre off focus, times 1/focus²
};

// View guitar: the close-up is a portrait of the body. The guitar lifts off its plinth and leans,
// the camera comes in on the body, and a lens shift puts it on the left (at the top where the
// sheet sits below it) so the sheet has the other side. It sways a few degrees so the light
// travels across the finish, and never makes a full turn on its own. The framing is the same for
// all seven, so changing guitar from the sheet turns the ring under a camera that stays put.
const D2R = Math.PI / 180;
export const CLOSE = {
  lift: 0.08,             // metres off the plinth: the lower bout has to clear it once it leans
  pivot: 0.22,            // metres up the guitar that the lean turns about (the middle of the body)
  aim: 0.27,              // metres up the guitar that the camera looks at
  // The angle it settles at and how far it sways either side, radians, and seconds per swing.
  // Between 0.4 and 0.65 the two rim lights behind the guitar mirror off the top straight into
  // the lens and the whole edge burns white (measured on all seven). So it rests past that, and
  // only crosses it on the way in, as one flash of light across the finish.
  yaw: 0.8, sway: 0.12, period: 14,
  // light once the camera is in: the arch stays lit, the bloom comes down and only the hottest
  // points keep it, the rims come up a little, the chrome is a touch less of a mirror
  light: { halo: 0.9, dust: 0.55, bloom: 0.5, threshold: 0.1, radius: 0.8, chrome: 0.08, rim: 1.25 },
  // the key and rim lights per finish, up close only: the pale one blows out under the light
  // that suits the others, and the dark ones disappear into the room
  gain: { floe: 0.78, scree: 1.7, moss: 1.1, heath: 1.08 },
  // lean: degrees. view: metres of height in frame at the guitar. minWidth: metres of width the
  // frame must keep on a narrow window. shift: where the body sits, in screen halves from the
  // centre (x to the right, y up). halo: the arch's radius as it looks round the body, metres.
  wide: { lean: -15, view: 0.74, minWidth: 1.12, dir: [0.04, 0.12, 1], fov: 22, shift: [-0.46, 0], halo: 0.3 },
  tall: { lean: -8, view: 0.9, minWidth: 0.5, dir: [0, 0.1, 1], fov: 30, shift: [0, 0.3], halo: 0.26 },
};

// Slot keyframes: |s| → dimming and ring-light level. Past 3.5 a guitar is
// fully dark, which is where it wraps round to the other end of the ring.
const DIM = [1.0, 0.55, 0.32, 0.16, 0.0];
const GLOW = [1.0, 0.42, 0.26, 0.14, 0.0];
function curve(arr, s) {
  const a = Math.min(Math.abs(s) * (arr.length - 1) / 3.6, arr.length - 1);
  const i = Math.floor(a), f = a - i;
  return i >= arr.length - 1 ? arr[arr.length - 1] : arr[i] + (arr[i + 1] - arr[i]) * f;
}
const wrap = (s) => ((((s + 3.5) % N) + N) % N) - 3.5;
// Perceived brightness differs a lot between the seven colours: Scree's blue
// has about 40% of the luminance of Floe's ice blue. Each glow is scaled
// towards the same luminance, gently (power 0.55), so none of them flattens.
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const glowGain = (c) => THREE.MathUtils.clamp(Math.pow(0.5 / Math.max(lum(c), 0.05), 0.55), 0.8, 1.7);
const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------- dim patch ----
// Every material in the ring gets a per-guitar uDim multiplier on its final
// colour, so a guitar can fade into the dark without transparency sorting.
function addDim(material, uniform) {
  if (material.userData.dim) return;        // shared by several meshes: patch once
  material.userData.dim = true;
  const before = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, r) => {
    before.call(material, shader, r);      // keep any patch already on it (the string winding)
    shader.uniforms.uDim = uniform;
    shader.fragmentShader = 'uniform float uDim;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>', 'gl_FragColor.rgb *= uDim;\n#include <dithering_fragment>');
  };
  material.customProgramCacheKey = () => key + 'dim';
}

// ------------------------------------------------------------- floor ----
// Black glass: a sharp reflection (a four-tap soften only, for the target's
// pixel edges) and a strong Fresnel, so it only reads as a mirror at a grazing
// angle. Seen from the resting camera the floor is dark; when the camera drops
// low for a turn (see `breathe` in update) the room appears in it.
const FloorShader = {
  name: 'FloorShader',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uCam: { value: new THREE.Vector3() }, uStrength: { value: 1.25 }, uBlur: { value: 0.0007 },
    uPool: { value: new THREE.Color('#2a1d10') }, uPoolR: { value: 0.6 }, uFres0: { value: 0.45 },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */`
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
      // the pool of light the spot leaves on the floor
      float pool = exp(-dot(vWorld.xz, vWorld.xz) / uPoolR);
      vec3 col = color + uPool * pool + refl * uStrength * fres * fade;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

// light cone over the centre: additive, fades to the edges and the top
const ConeShader = {
  uniforms: { uColor: { value: ACCENT.clone() }, uAlpha: { value: 0.0 } },
  vertexShader: /* glsl */`
    varying float vH; varying vec3 vN; varying vec3 vV;
    void main() {
      vH = uv.y;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uColor; uniform float uAlpha;
    varying float vH; varying vec3 vN; varying vec3 vV;
    void main() {
      float edge = pow(abs(dot(vN, vV)), 2.2);
      float a = edge * smoothstep(0.0, 0.3, vH) * smoothstep(0.78, 0.35, vH) * uAlpha;
      gl_FragColor = vec4(uColor * a, 1.0);
    }`,
};

// tone mapping + sRGB + film grain and vignette in one final pass to screen
const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: LOOK.grain } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.0) * 43758.5453); }
    void main() {
      gl_FragColor = texture2D(tDiffuse, vUv);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec4 c = gl_FragColor;
      float v = smoothstep(1.15, 0.35, length((vUv - 0.5) * vec2(1.25, 1.0)));
      c.rgb *= mix(0.55, 1.0, v);
      c.rgb += (h(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

// ========================================================================
export class Showroom {
  constructor(canvas, { onProgress, onChange } = {}) {
    this.canvas = canvas;
    this.onProgress = onProgress || (() => {});
    this.onChange = onChange || (() => {});
    this.u = 0;               // ring offset: which guitar is in front
    this.items = [];
    this.lights = 0;          // 0..1, the room coming on during the intro
    this.focus = 0;           // 0..1, close-up mode
    this.running = true;
    this.allReady = false;
    this.idleTime = 0;
    this.settledFrames = 0;
    this.time = 0;
    this.last = performance.now();
    this.pointer = new THREE.Vector2(10, 10);
    this.hover = -1;
    this.drag = null;
    this.closeYaw = 0;
    this.closeDist = 0;
    this.swayT = 0;           // seconds the close-up has been swaying
    this.parallax = new THREE.Vector2();
    this.mobile = matchMedia('(max-width: 760px)').matches;

    this.breath = 0;          // 0..1, how far the camera has pulled back for a turn
    this.lean = 0;            // sideways lean into the turn
    this.lastU = 0;
    this.glow = 1;            // glowGain of the centre colour

    // the walk (scroll sequence): `walkTo` is where the scroll is, in screen
    // heights into the pinned room; `walkAt` follows it with a little weight
    this.walk = new Walk();
    this.walkTo = 0;
    this.walkAt = 0;
    this.walkState = null;    // last sample, read by the page for the copy
    this.shot = {};
    this.initRenderer();
    this.initScene();
    this.layout();
    this.bind();
  }

  wake() {
    this.idleTime = 0;
    this.settledFrames = 0;
  }

  // ------------------------------------------------------------ setup ----
  initRenderer() {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = LOOK.exposure;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050404');
    this.scene.fog = new THREE.FogExp2('#050404', 0.075);
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(r, rt);
    // writeBuffer only receives 2D full-screen passes (BokehPass), so it needs no MSAA
    this.composer.renderTarget1.samples = 0;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // depth of field for the walk's close shots, off the rest of the time
    this.dof = new BokehPass(this.scene, this.camera, { focus: 1, aperture: 0, maxblur: 0.008 });
    this.dof.enabled = false;
    const dofRender = this.dof.render.bind(this.dof);
    this.dof.render = (...a) => {
      // the depth pass only needs the guitars: the mirror would re-render the room
      const hide = [this.floor, this.dust, this.cone, this.halo];
      hide.forEach((o) => { o.userData.v = o.visible; o.visible = false; });
      dofRender(...a);
      hide.forEach((o) => { o.visible = o.userData.v; });
    };
    this.composer.addPass(this.dof);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
    this.composer.addPass(this.bloom);
    this.grain = new ShaderPass(GrainShader);
    this.composer.addPass(this.grain);
  }

  initScene() {
    const { scene } = this;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    scene.environment = pmrem.fromScene(this.studioEnv(), 0.02).texture;
    scene.environmentIntensity = LOOK.envIntensity;

    // floor: black glass, a planar reflection of the whole room
    const floor = this.floor = new Reflector(new THREE.PlaneGeometry(40, 40), {
      textureWidth: 512, textureHeight: 512, clipBias: 0.002, shader: FloorShader, multisample: 0,
      color: new THREE.Color('#050506'),
    });
    const floorRender = floor.onBeforeRender.bind(floor);
    floor.onBeforeRender = (renderer, scn, cam) => {
      if (floor.material.uniforms.uStrength.value < 0.01) return;
      const dustVis = this.dust.visible;
      this.dust.visible = false;
      const hidden = [];
      for (const it of this.items) {
        if (!it.group.visible) continue;
        // Far side guitars (a > 1.75) reflect only their neon plinth ring on the dark glass
        if ((it.slotA || 0) > 1.75) {
          if (it.spinner.visible) { it.spinner.visible = false; hidden.push(it.spinner); }
          continue;
        }
        const hideList = (it.slotA || 0) > 0.65 ? it.guitar.userData.nonMacroMeshes : it.guitar.userData.fineMeshes;
        if (hideList) for (const m of hideList) if (m.visible) { m.visible = false; hidden.push(m); }
      }
      floorRender(renderer, scn, cam);
      for (const m of hidden) m.visible = true;
      this.dust.visible = dustVis;
    };
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    this.buildRoom();

    // lights: one key spot over the stage, two rims behind it, a whisper of top light
    const key = this.key = new THREE.SpotLight('#fff1dc', 0, 9, 0.21, 0.7, 2);
    key.position.set(0.55, 3.7, 2.1);
    key.target.position.set(0, 0.6, 0);
    this.keyRest = key.target.position.clone();
    this.keyAim = key.target.position.clone();
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1.5; key.shadow.camera.far = 6;
    key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015;
    scene.add(key, key.target);
    const rimL = this.rimL = new THREE.SpotLight('#cfdcff', 0, 8, 0.32, 0.9, 2);
    rimL.position.set(-1.5, 2.3, -2.0); rimL.target.position.set(0, 0.58, 0);
    const rimR = this.rimR = new THREE.SpotLight('#ffcf94', 0, 8, 0.32, 0.9, 2);
    rimR.position.set(1.7, 1.5, -1.8); rimR.target.position.set(0, 0.48, 0);
    scene.add(rimL, rimL.target, rimR, rimR.target);
    this.top = new THREE.DirectionalLight('#fff6ea', 0);
    this.top.position.set(0.3, 5, 1.4);
    scene.add(this.top);

    // light cone and dust in it
    // the beam reads as near-vertical from the camera, so it is drawn from a
    // point above the stage rather than from the real lamp position
    const apex = new THREE.Vector3(0.22, 3.7, 0.55), foot = new THREE.Vector3(0, PED_TOP, 0);
    const axis = apex.clone().sub(foot);
    const cone = this.cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.6, axis.length(), 64, 1, true),
      new THREE.ShaderMaterial({ ...ConeShader, uniforms: THREE.UniformsUtils.clone(ConeShader.uniforms), transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    cone.position.copy(foot).lerp(apex, 0.5);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    scene.add(cone);
    this.dust = this.makeDust();
    scene.add(this.dust);
  }

  studioEnv() {
    // a black box with a few softboxes: what the chrome and clear coat reflect
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: '#070605', side: THREE.BackSide })));
    const panel = (w, h, color, k, pos, look) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(...look); env.add(m);
    };
    panel(7, 1.6, '#fff4e4', 7, [0, 5.2, 1.2], [0, 0, 0]);
    panel(0.7, 6, '#ffd6a0', 3.2, [-5.5, 2, 1.5], [0, 1.5, 0]);
    panel(0.7, 6, '#ffe6c6', 2.2, [5.5, 2, 2.5], [0, 1.5, 0]);
    panel(5, 2.4, '#ffffff', 1.1, [0, 1.6, 7], [0, 1, 0]);
    panel(5, 0.4, '#ffbe78', 2.4, [0, 0.3, -6], [0, 0.5, 0]);
    return env;
  }

  buildRoom() {
    const { scene } = this;
    // a curved back wall of dark panels with thin vertical light seams
    const wallMat = new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.85, metalness: 0.1, side: THREE.BackSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 7, 120, 1, true, Math.PI * 0.62, Math.PI * 0.76), wallMat);
    wall.position.set(0, 3.2, 0.4);
    scene.add(wall);
    const seamMat = new THREE.MeshBasicMaterial({ color: ACCENT.clone().multiplyScalar(0.55) });
    for (let i = -7; i <= 7; i++) {
      const a = Math.PI + i * 0.095;
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 5.2), seamMat);
      seam.position.set(Math.sin(a) * 8.45, 2.6, 0.4 + Math.cos(a) * 8.45);
      seam.lookAt(0, 2.6, 0.4);
      scene.add(seam);
      (this.seams ||= []).push(seam);
    }

    // the halo: an open arch of light behind the centre guitar
    const arc = Math.PI * 1.32;
    this.halo = new THREE.Group();
    for (const [rad, k] of [[0.6, 3.0], [0.635, 0.6]]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.0042, 8, 320, arc), new THREE.MeshBasicMaterial({ color: ACCENT.clone().multiplyScalar(k) }));
      t.rotation.z = Math.PI / 2 - arc / 2;
      t.userData.k = k;
      this.halo.add(t);
    }
    // round the guitar rather than above it (scaled per screen shape in layout)
    this.halo.position.set(0, 0.5, -0.5);
    scene.add(this.halo);
  }

  // ---------------------------------------------------------- the path ----
  // Slot positions tuned so the seven spread evenly across the frame the
  // way the reference does, receding as they go out. Mirrored for -s.
  pathPoint(s, out = new THREE.Vector3()) {
    const P = this.path;
    const a = Math.abs(s);
    const i = Math.min(Math.floor(a), P.length - 2), f = a - i;
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    const cr = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f
      + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f);
    return out.set(Math.sign(s) * cr(0), 0, cr(1));
  }

  // ----------------------------------------------------------- guitars ----
  async load(lineup) {
    const clay = new THREE.MeshPhysicalMaterial({ color: '#6c665f', roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.4 });
    const graphite = new THREE.MeshStandardMaterial({ color: '#2d2a27', roughness: 0.42, metalness: 0.4 });
    const pedGeo = new THREE.LatheGeometry([
      [0, 0], [0.4, 0], [0.4, 0.012], [0.385, 0.016], [0.33, 0.016], [0.325, 0.022], [0.325, 0.078], [0.321, 0.085], [0.31, PED_TOP], [0, PED_TOP],
    ].map(([x, y]) => new THREE.Vector2(x, y)), 96);
    const ringGeo = new THREE.TorusGeometry(0.323, 0.0034, 8, 180);

    this.setPalette(lineup.map((g) => g.colour));
    this.loader = gltfLoader();
    this.chrome = [];
    // With Draco compression all seven models total 5.5 MB and decode in parallel
    // across worker threads behind the loader screen, so none swap in mid-animation.
    const realIdx = [0, 1, 6, 2, 5, 3, 4].filter((i) => i < lineup.length && lineup[i].real);
    const prog = new Array(realIdx.length).fill(0);
    const loadedScenes = await Promise.all(realIdx.map((idx, k) =>
      this.loader.loadAsync(lineup[idx].model, (e) => {
        if (e.total) {
          prog[k] = e.loaded / e.total;
          this.onProgress(prog.reduce((a, b) => a + b, 0) / realIdx.length);
        }
      }).then((g) => [idx, g.scene])
    ));

    lineup.forEach((info, i) => {
      const dim = { value: 1 };
      const group = new THREE.Group();
      const pedestal = new THREE.Group();
      // black glass, like the floor: a dark polished body under a full clear coat
      const pedMat = new THREE.MeshPhysicalMaterial({ color: '#060607', roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 });
      addDim(pedMat, dim);
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.receiveShadow = true;
      const ringMat = new THREE.MeshBasicMaterial({ color: ACCENT.clone().multiplyScalar(3.4) });
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = PED_TOP - 0.006;
      pedestal.add(ped, ring);

      const c = clay.clone(), gr = graphite.clone();
      addDim(c, dim); addDim(gr, dim);
      const guitar = info.shape ? buildStandin(info.shape, c, gr) : new THREE.Group();
      const spinner = new THREE.Group();
      spinner.add(guitar);
      spinner.position.y = PED_TOP + HOVER;
      group.add(pedestal, spinner);

      // cheap pick target
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.62; hit.userData.index = i;
      group.add(hit);

      this.scene.add(group);
      this.items.push({ info, group, pedestal, spinner, guitar, dim, ringMat, hit, spin: 0, spinV: 0, hoverK: 0, ready: false, cast: i === 0 });
    });
    for (const [idx, scn] of loadedScenes) this.swapIn(idx, scn);
    this.allReady = true;
    this.hits = this.items.map((it) => it.hit);
    this.update(0);
    this.emitChange();
  }

  /** Pre-upload all guitar geometries and compile shaders behind the loader curtain. */
  warmGPU() {
    for (const it of this.items) {
      it.group.visible = true;
      it.guitar.userData.meshes?.forEach((m) => { m.frustumCulled = false; });
    }
    this.composer.render(0);
    for (const it of this.items) {
      it.guitar.userData.meshes?.forEach((m) => { m.frustumCulled = true; });
    }
    this.update(0);
    this.composer.render(0);
  }

  /** Put a loaded model on its plinth in place of the maquette. */
  swapIn(i, root) {
    const it = this.items[i];
    prepareGuitar(root, this.renderer);
    const cast = it.cast ?? (i === 0);
    root.userData.shadowMeshes?.forEach((m) => { m.castShadow = cast; });
    root.userData.meshes?.forEach((m) => {
      addDim(m.material, it.dim);
      if (/^(Chrome|Nickel)$/.test(m.material.name) && !this.chrome.includes(m.material)) {
        m.material.userData.rough = m.material.roughness;
        this.chrome.push(m.material);
      }
    });
    const old = it.guitar;
    it.spinner.remove(old);
    old.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    it.spinner.add(root);
    it.guitar = root;
    it.ready = true;
    this.walk.forget(it.info.id);
    this.wake();
  }

  // ------------------------------------------------------------ layout ----
  layout() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;
    const portrait = this.portrait = aspect < 0.9;
    // wide screens: the whole ring; tall screens: the centre plus neighbours peeking in
    this.path = portrait
      ? [[0, 0], [0.82, -0.8], [1.5, -2.0], [2.1, -3.3], [2.6, -4.7]]
      : [[0, 0], [1.08, -0.62], [2.0, -1.6], [2.8, -2.9], [3.5, -4.3]];
    // camBase: close on the centre guitar, at rest. camWide: where a turn pulls
    // back to, low over the glass so the floor turns into a mirror
    this.camBase = portrait
      ? { pos: new THREE.Vector3(0, 0.8, 3.35), target: new THREE.Vector3(0, 0.6, 0), fov: 30 }
      : { pos: new THREE.Vector3(0, 0.78, 3.0), target: new THREE.Vector3(0, 0.58, -0.2), fov: 22 };
    this.camWide = portrait
      ? { pos: new THREE.Vector3(0, 0.42, 5.9), target: new THREE.Vector3(0, 0.5, -0.6) }
      : { pos: new THREE.Vector3(0, 0.4, 5.6), target: new THREE.Vector3(0, 0.48, -0.9) };
    // The head of the tallest guitar has to clear the header row with some air, on any window.
    // The camera lifts a touch (the picture moves down) and the lens opens just enough, never more
    // than a few degrees: the guitar stays close.
    {
      const b = this.camBase, head = document.querySelector('.site-head');
      const clear = ((head ? head.offsetHeight : 70) + (portrait ? 6 : 18)) / h;      // share of the height to keep free
      const lift = portrait ? 0.02 : 0.045, TOP = 1.165;                                // metres: the highest tuner, plinth and spin included
      b.pos.y += lift; b.target.y += lift;
      const f = b.target.clone().sub(b.pos).normalize(), up = new THREE.Vector3(0, 1, 0).addScaledVector(f, -f.y).normalize();
      const v = new THREE.Vector3(0, TOP, 0).sub(b.pos), need = Math.atan(v.dot(up) / (v.dot(f) * (1 - 2 * clear))) * 2 * 180 / Math.PI;
      b.fov = Math.min(Math.max(b.fov, need), b.fov + (portrait ? 3 : 4.5));
    }
    this.haloRest = portrait ? 0.74 : 0.94;
    this.halo.scale.setScalar(this.haloRest);
    this.sheetBelow = w <= 900 || portrait;      // the View guitar sheet sits under the guitar (styles.css, 900px)
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    // Depth-of-field depth pass and blurred floor reflection run at half resolution:
    // the floor shader already applies a 9-tap blur, and DoF blurs out-of-focus regions.
    this.dof.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5));
    this.floor.getRenderTarget().setSize(Math.round(w * pr * 0.45), Math.round(h * pr * 0.45));
    this.wake();
  }

  /** Where the front of the stage lands on screen, so the DOM can sit under it. */
  stageScreenY() {
    this.camera.updateMatrixWorld();
    // centre of the centre plinth's front face
    const v = new THREE.Vector3(0, PED_TOP * 0.5, 0.325).project(this.camera);
    return (1 - (v.y * 0.5 + 0.5)) * (this.canvas.clientHeight || innerHeight);
  }

  // ------------------------------------------------------- interaction ----
  bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.wake();
      if (this.walkAt > 0.02) return;      // the ring stays put while the walk runs
      this.drag = { x: e.clientX, u0: this.u, t: performance.now(), lastX: e.clientX, lastT: performance.now(), v: 0, moved: false, yaw0: this.closeYaw };
      c.setPointerCapture(e.pointerId);
      this.tween?.kill();
    });
    c.addEventListener('pointermove', (e) => {
      this.wake();
      const r = c.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.parallax.set(this.pointer.x, this.pointer.y);
      const d = this.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      const now = performance.now();
      d.v = (e.clientX - d.lastX) / Math.max(now - d.lastT, 1);
      d.lastX = e.clientX; d.lastT = now;
      if (this.focus > 0.5) this.closeYaw = d.yaw0 + dx * 0.008;
      else this.u = d.u0 - dx / (r.width * 0.22);
    });
    const end = (e) => {
      this.wake();
      const d = this.drag;
      if (!d) return;
      this.drag = null;
      if (this.focus > 0.5) {
        window.gsap.to(this, { closeYaw: this.closeYaw + d.v * 0.9, duration: 1.4, ease: 'expo.out' });
        return;
      }
      if (!d.moved) {
        this.pick();
        if (this.hover >= 0) { this.goTo(this.hover); return; }
      }
      const fling = -d.v * 1000 / (c.clientWidth * 0.22) * 0.28;
      this.settle(Math.round(this.u + fling));
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { this.pointer.set(10, 10); this.parallax.set(0, 0); });
    c.addEventListener('wheel', (e) => {
      this.wake();
      if (this.focus < 0.5) return;
      e.preventDefault();
      this.closeDist = THREE.MathUtils.clamp(this.closeDist + e.deltaY * 0.0012, -0.55, 0.45);
    }, { passive: false });
  }

  pick() {
    this.raycaster ||= new THREE.Raycaster();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.hits, false)[0];
    this.hover = hit ? hit.object.userData.index : -1;
    return this.hover;
  }

  get index() { return ((Math.round(this.u) % N) + N) % N; }

  settle(target, duration = LOOK.stepDuration * 0.7) {
    this.wake();
    this.leaveCentre();
    this.tween = window.gsap.to(this, { u: target, duration, ease: 'expo.out', onUpdate: () => this.emitChange() });
  }

  step(dir) {
    this.wake();
    const target = Math.round(this.u) + dir;
    this.leaveCentre();
    this.tween?.kill();
    this.tween = window.gsap.to(this, { u: target, duration: this.reduced ? 0.01 : LOOK.stepDuration, ease: 'expo.inOut', onUpdate: () => this.emitChange() });
  }

  goTo(i) {
    this.wake();
    let d = i - this.index;
    if (d > 3) d -= N;
    if (d < -3) d += N;
    if (d === 0) return;
    this.leaveCentre();
    this.tween?.kill();
    this.tween = window.gsap.to(this, { u: Math.round(this.u) + d, duration: this.reduced ? 0.01 : LOOK.stepDuration * (0.8 + 0.2 * Math.abs(d)),
      ease: 'expo.inOut', onUpdate: () => this.emitChange() });
  }

  leaveCentre() {
    // unwind the guitar that is leaving so it faces front on its way out
    const it = this.items[this.index];
    if (!it) return;
    const target = Math.round(it.spin / (Math.PI * 2)) * Math.PI * 2;
    window.gsap.to(it, { spin: target, duration: LOOK.stepDuration, ease: 'expo.inOut' });
    it.spinV = 0;
  }

  emitChange() {
    const i = this.index;
    if (i !== this.lastIndex) { this.lastIndex = i; this.onChange(i, this.items[i]?.info); }
  }

  enterCloseup() {
    this.wake();
    const it = this.items[this.index];
    this.leaveCentre();
    this.closeYaw = 0.12; this.closeDist = 0; this.swayT = 0;
    window.gsap.to(this, { focus: 1, duration: 2.1, ease: 'expo.inOut' });
    window.gsap.to(this, { closeYaw: CLOSE.yaw, duration: 2.8, ease: 'expo.out' });
    return it;
  }

  exitCloseup() {
    this.wake();
    // the stand has been turning: unwind by the short way round
    this.closeYaw = THREE.MathUtils.euclideanModulo(this.closeYaw + Math.PI, Math.PI * 2) - Math.PI;
    window.gsap.to(this, { focus: 0, closeYaw: 0, closeDist: 0, duration: 1.7, ease: 'expo.inOut' });
  }

  /** Change guitar without leaving the close-up: the ring turns under the camera, and the one
   *  that arrives shows its front whatever way the last one had been dragged. */
  closeTo(i) {
    this.wake();
    this.closeYaw = THREE.MathUtils.euclideanModulo(this.closeYaw + Math.PI, Math.PI * 2) - Math.PI;
    window.gsap.to(this, { closeYaw: CLOSE.yaw, duration: 1.6, ease: 'expo.inOut' });
    let d = i - this.index;
    if (d > 3) d -= N;
    if (d < -3) d += N;
    this.leaveCentre();
    this.tween?.kill();           // d can be 0: a turn that is called back before it is half way
    this.tween = window.gsap.to(this, { u: Math.round(this.u) + d, duration: this.reduced ? 0.01 : LOOK.stepDuration * (0.8 + 0.2 * Math.abs(d)),
      ease: 'expo.inOut', onUpdate: () => this.emitChange() });
  }

  // intro: the room's lights come on, centre first, then outwards
  intro() {
    this.wake();
    const g = window.gsap;
    if (this.reduced) { this.lights = 1; return; }
    this.lights = 0;
    g.to(this, { lights: 1, duration: 3.2, ease: 'expo.out', delay: 0.15 });
  }

  // ------------------------------------------------------------ frame ----
  update(dt) {
    const t = this.time;
    const L = this.lights, F = this.focus;
    const cam = this.camera;
    if (this.palette) this.applyPalette();

    // the walk: the scroll position with a little weight on it, sampled for
    // the guitar in the centre (sequence.js)
    this.walkAt = this.reduced ? this.walkTo : this.walkAt + (this.walkTo - this.walkAt) * Math.min(dt * 4.5, 1);
    if (Math.abs(this.walkTo - this.walkAt) < 6e-4) this.walkAt = this.walkTo;
    const front = this.items[this.index];
    const plan = front && this.walkAt > 1e-4 ? this.walk.plan(front, this.portrait) : null;
    const W = this.walkState = plan ? this.walk.sample(plan, this.walkAt) : null;
    const Lw = W ? W.lift : 0;

    // camera at rest: close framing, a little pointer parallax, and the
    // breath on a turn
    const b = this.camBase;
    const px = this.parallax.x * 0.08 * (1 - F) * (1 - Lw), py = this.parallax.y * 0.04 * (1 - F) * (1 - Lw);
    const pos = b.pos.clone().add(new THREE.Vector3(px, py, 0));
    const tgt = b.target.clone().add(new THREE.Vector3(px * 0.3, 0, 0));
    this.breathe(pos, tgt, dt);

    // hover highlight
    if (!this.drag && F < 0.5 && !W && Math.abs(this.pointer.x) < 1.5) {
      const h = this.pick();
      this.canvas.style.cursor = h >= 0 && h !== this.index ? 'pointer' : '';
    }

    // the close-up's framing for this window, and its slow sway
    const C = this.sheetBelow ? CLOSE.tall : CLOSE.wide;
    if (F > 0.6 && !this.drag && !this.reduced) this.swayT += dt;
    const closeTurn = (this.closeYaw + CLOSE.sway * Math.sin(this.swayT * Math.PI * 2 / CLOSE.period)) * F;
    const closeUp = smooth(0.1, 1, F);          // the guitar starts a beat after the camera

    // the ring
    const tmp = new THREE.Vector3();
    let gainSum = 0, nearSum = 0;
    const maxA = F > 0.85 || Lw > 0.6 ? 0.65 : (this.portrait ? 1.45 : 1.65) + 1.15 * this.breath;
    this.items.forEach((it, i) => {
      const s = wrap(i - this.u);
      const a = Math.abs(s);
      it.slotA = a;
      this.pathPoint(s, tmp);
      it.group.position.copy(tmp);
      const lift = 0.045 * (1 - smooth(0, 0.7, a));
      it.group.position.y = lift;
      // face a point in front of the room, so the sides angle in a little
      const face = Math.atan2(-tmp.x, 3.2 - tmp.z);
      const centre = a < 0.02 && !this.drag;
      if (centre && F < 0.01 && !W && !this.reduced && this.idleTime < 8) it.spinV = Math.min(it.spinV + dt * 0.08, LOOK.spinSpeed);
      else it.spinV = Math.max((it.spinV || 0) - dt * 0.06, 0);
      it.spin += it.spinV * dt;
      // View guitar: only the guitar in front lifts, leans and takes the close-up's angle. `near`
      // hands all three over smoothly when the ring turns under the close-up.
      const near = 1 - smooth(0.1, 0.9, a);
      const yaw = face + it.spin + closeTurn * near;
      const lean = C.lean * D2R * closeUp * near;
      gainSum += near * (CLOSE.gain[it.info.id] || 1); nearSum += near;
      it.spinner.position.set(CLOSE.pivot * Math.sin(lean), PED_TOP + HOVER + CLOSE.lift * closeUp * near + CLOSE.pivot * (1 - Math.cos(lean)), 0);
      it.spinner.rotation.set(0, yaw, lean, 'ZYX');

      const hk = this.hover === i && a > 0.5 ? 1 : 0;
      it.hoverK += (hk - it.hoverK) * Math.min(dt * 6, 1);
      const away = smooth(0.25, 0.75, a);
      const focusDim = 1 - 0.97 * F * away;
      // the rest of the room goes out while the walk runs
      const walkDim = a < 0.5 ? 1 : 1 - 0.95 * Lw;
      const dim = (curve(DIM, s) + it.hoverK * 0.14) * focusDim * walkDim * (0.15 + 0.85 * smooth(0, 1, L * 1.4 - a * 0.12));
      const inView = dim > 0.025 && a < maxA;
      it.dim.value = inView ? dim : 0;
      // Only cast key shadows for silhouette parts of the guitar at or crossing the centre plinth
      const cast = a < 0.75;
      if (it.cast !== cast) {
        it.cast = cast;
        it.guitar.userData.shadowMeshes?.forEach((m) => { m.castShadow = cast; });
      }
      // Cull guitars that are faded to black or outside the camera frustum (keep visible 1 frame on swapIn to upload VBOs)
      it.group.visible = inView || !!it.needsUpload;
      it.needsUpload = false;
      const glow = curve(GLOW, s) * (0.6 + 0.4 * smooth(0, 1, L * 1.2 - a * 0.1)) * smooth(0, 1, L * 1.6 - a * 0.25) * (1 - 0.94 * F * away) * walkDim;
      // the plinth ring stays soft under the guitar in front (the halo is its
      // light) and comes up to full as the guitar moves to the side. When the
      // guitar lifts off, its empty plinth flares once and stays lit.
      const own = this.palette[i];
      const flare = a < 0.5 ? 1.8 * Math.sin(Math.PI * Math.min(Lw * 1.4, 1)) + 0.5 * Lw : 0;
      it.ringMat.color.copy(own).multiplyScalar(3.4 * glow * this.gains[i] * (0.32 + 0.68 * smooth(0, 1, a) + flare));
    });

    // the guitar in front lifts out and the camera rides along it
    let shift = 0, roll = 0, fov = b.fov + 0;
    const look = tgt;
    if (W) {
      const sh = blendShots(W.a, W.b, W.k, this.shot);
      const sp = front.spinner;
      const cL = plan.centre;
      const restQ = _q1.setFromEuler(sp.rotation);
      const restC = _v1.copy(cL).applyQuaternion(restQ).add(sp.position);
      const liftC = _v2.set(0, sp.position.y + cL.y + LIFT, 0);
      // the guitar starts a beat after the camera, so the camera has already
      // backed off when the headstock rises
      const Lg = smooth(0.12, 1, Lw), Lc = smooth(0, 0.82, Lw);
      const Q = _q2.copy(restQ).slerp(sh.quat, Lg);
      sp.quaternion.copy(Q);
      sp.position.copy(restC.lerp(liftC, Lg)).sub(_v3.copy(cL).applyQuaternion(Q));
      front.group.updateMatrixWorld(true);

      const halfV = THREE.MathUtils.degToRad(sh.lens) / 2;
      const halfH = Math.atan(Math.tan(halfV) * cam.aspect);
      const dist = sh.radius / (FILL * Math.tan(Math.min(halfV, halfH)));
      const aimW = _v4.copy(sh.aim).applyMatrix4(sp.matrixWorld);
      const camW = _v5.copy(sh.dir).applyQuaternion(Q).multiplyScalar(dist).add(aimW);
      pos.lerp(camW, Lc);
      look.lerp(aimW, Lc);
      fov += (sh.lens - fov) * Lc;
      roll = sh.roll * Lc;
      shift = sh.shift * Lc;
      this.walkFocus = pos.distanceTo(aimW);
      this.walkDof = sh.dof * Lw;
      this.keyAim.copy(this.keyRest).lerp(sp.localToWorld(_v6.copy(cL)), Lw);
    } else {
      this.walkDof = 0;
      this.keyAim.copy(this.keyRest);
    }

    // the close-up from View guitar: a camera on the body of the guitar in front (CLOSE)
    const leanC = C.lean * D2R;
    const pivotY = 0.045 + PED_TOP + HOVER + CLOSE.lift + CLOSE.pivot;      // 0.045: the centre plinth's own lift
    const aim = _v6.set(-Math.sin(leanC), Math.cos(leanC), 0).multiplyScalar(CLOSE.aim - CLOSE.pivot);
    aim.y += pivotY;
    const view = Math.max(C.view, C.minWidth / cam.aspect);
    const closeDist = view / 2 / Math.tan(C.fov * D2R / 2);
    const closeDir = _v5.set(...C.dir).normalize();
    const closePos = _v4.copy(aim).addScaledVector(closeDir, closeDist + this.closeDist);
    cam.position.lerpVectors(pos, closePos, F);
    look.lerp(aim, F);
    cam.fov = fov + (C.fov - fov) * F;
    roll -= 0.03 * Math.sin(Math.PI * F);                                   // the camera banks a little on its way in and out
    // the arch closes round the body as the camera comes in, and opens again on the way out. It
    // is placed from where the camera rests, so coming closer with the wheel does not move it.
    {
      const camRest = _v3.copy(aim).addScaledVector(closeDir, closeDist), HALO_Z = -0.5;
      const far = (camRest.z - HALO_Z) / camRest.z;                         // the arch is this much further away than the body
      const at = _v2.set(0, pivotY + 0.05, 0).sub(camRest).multiplyScalar(far).add(camRest);
      this.halo.position.set(0, 0.5, HALO_Z).lerp(at, F);
      this.halo.scale.setScalar(this.haloRest + (C.halo * far / 0.6 - this.haloRest) * F);
    }
    if (!W) this.keyAim.lerp(aim, F);
    // the near plane follows the camera in: 10 cm spends the depth buffer badly at 15 cm
    cam.near = W ? THREE.MathUtils.clamp((this.walkFocus || 1) * 0.12, 0.008, 0.1) : 0.1;
    cam.updateProjectionMatrix();
    cam.lookAt(look);
    if (roll) cam.rotateZ(roll);
    if (shift || F) {
      // a lens shift: the guitar moves aside for the copy without the
      // perspective changing. Right on wide screens, up on tall ones (the walk);
      // left, or up, for the View guitar sheet.
      const P = cam.projectionMatrix.elements;
      if (this.portrait) P[9] -= 0.34 * shift; else P[8] -= 0.27 * shift;
      P[8] -= C.shift[0] * F; P[9] -= C.shift[1] * F;
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    }
    this.floor.material.uniforms.uCam.value.copy(cam.position);
    // When zoomed into the close-up sheet or lifted into the walk stops, the floor is below the frame:
    // fading uStrength lets floor.onBeforeRender skip the entire reflection pass.
    this.floor.material.uniforms.uStrength.value = 1.25 * (1 - smooth(0.5, 0.9, F)) * (1 - smooth(0.15, 0.45, Lw));

    // depth of field, only on the walk: shallow up close, gone from afar
    const dofOn = this.walkDof > 0.01;
    this.dof.enabled = dofOn;
    if (dofOn) {
      const f = this.walkFocus;
      this.dof.uniforms.focus.value = f;
      this.dof.uniforms.aperture.value = LOOK.dof * this.walkDof / (f * f);
    }
    this.chrome?.forEach((m) => { m.roughness = m.userData.rough + 0.07 * Lw + CLOSE.light.chrome * F; });
    this.key.target.position.copy(this.keyAim);
    this.key.angle = 0.21 + 0.09 * Lw;
    this.scene.fog.density = 0.075 * (1 - 0.85 * Lw);

    // lights follow the intro and the close-up
    const on = smooth(0, 1, L);
    const gain = 1 + ((nearSum ? gainSum / nearSum : 1) - 1) * F;       // CLOSE.gain for the guitar in front
    this.key.intensity = LOOK.spot * on * gain;
    this.rimL.intensity = LOOK.rim * smooth(0.2, 1, L) * (1 + (CLOSE.light.rim - 1) * F) * gain;
    this.rimR.intensity = LOOK.rim * 0.8 * smooth(0.25, 1, L) * (1 + (CLOSE.light.rim - 1) * F) * gain;
    this.top.intensity = 0.35 * on;
    this.scene.environmentIntensity = LOOK.envIntensity * (0.3 + 0.7 * on);
    const G = this.glow;
    this.cone.material.uniforms.uAlpha.value = 0.05 * G * smooth(0.1, 1, L) * (1 - 0.7 * F) * (1 - 0.6 * Lw);
    this.halo.children.forEach((m) => m.material.color.copy(ACCENT).multiplyScalar(G * m.userData.k * smooth(0.3, 1, L) * (1 - (1 - CLOSE.light.halo) * F) * (1 - Lw)));
    // the seams share one material, at the strength they have always had
    this.seams[0].material.color.copy(ACCENT).multiplyScalar(G * 0.067 * smooth(0.4, 1, L) * (1 - 0.6 * F));
    this.floor.material.uniforms.uPool.value.copy(ACCENT).multiplyScalar(G * 0.03 * on * (1 - 0.4 * F));

    // dust drifting through the cone
    this.dust.material.opacity = 0.55 * smooth(0.3, 1, L) * (1 - (1 - CLOSE.light.dust) * F) * (1 - 0.5 * Lw);
    if (this.dust.visible && this.dust.material.opacity > 0.01 && Lw < 0.5) {
      const dp = this.dust.geometry.attributes.position;
      for (let k = 0; k < dp.count; k++) {
        let y = dp.getY(k) + dt * 0.03 * (0.5 + (k % 7) / 7);
        if (y > 2.6) y = 0.25;
        dp.setY(k, y);
        dp.setX(k, dp.getX(k) + Math.sin(t * 0.3 + k) * dt * 0.004);
      }
      dp.needsUpdate = true;
    }

    // up close the chrome and brass catch the key light hard: less bloom
    this.bloom.strength = LOOK.bloom.strength * (1 - (1 - CLOSE.light.bloom) * F) * (1 - 0.35 * Lw);
    this.bloom.threshold = LOOK.bloom.threshold + 0.1 * Lw + CLOSE.light.threshold * F;
    this.bloom.radius = LOOK.bloom.radius * (1 - (1 - CLOSE.light.radius) * F);
    this.grain.uniforms.uTime.value = t;
  }

  // Close at rest; when the ring turns the camera pulls back to camWide and
  // leans into the turn, so for a moment the whole ring stands on the glass,
  // then it pushes in on the guitar that arrives. It follows how fast the ring
  // is moving, so steps, drags and flings all breathe the same way.
  breathe(pos, tgt, dt) {
    const v = dt ? (this.u - this.lastU) / dt : 0;     // guitars per second
    this.lastU = this.u;
    if (this.reduced || !dt) return;
    const want = Math.min(Math.abs(v) / 0.9, 1);
    // out quickly, in slowly: the push-in lands after the guitar does
    this.breath += (want - this.breath) * Math.min(dt * (want > this.breath ? 5 : 2.2), 1);
    this.lean += (THREE.MathUtils.clamp(v * 0.35, -0.5, 0.5) - this.lean) * Math.min(dt * 3, 1);
    const k = this.breath * this.breath * (3 - 2 * this.breath);
    const B = this.camBase, W = this.camWide;
    pos.x += (W.pos.x - B.pos.x) * k + this.lean * 0.5;
    pos.y += (W.pos.y - B.pos.y) * k;
    pos.z += (W.pos.z - B.pos.z) * k;
    tgt.x += this.lean * 0.25;
    tgt.y += (W.target.y - B.target.y) * k;
    tgt.z += (W.target.z - B.target.z) * k;
  }

  // One colour per guitar (data.js). The centre colour cross-fades with the
  // ring's position, and every shared glow in the room (halo, seams, cone,
  // dust, floor pool, warm rim) takes it.
  setPalette(hexes) {
    this.palette = hexes.map((h) => new THREE.Color(h));
    this.gains = this.palette.map(glowGain);
    this.rimWarm = new THREE.Color('#ffcf94');
    this.rimTint = new THREE.Color();
  }

  // the same colour for the page, as a CSS hex
  get accentHex() { return `#${ACCENT.getHexString()}`; }

  applyPalette() {
    const P = this.palette, u = this.u, i0 = Math.floor(u), f = u - i0;
    const a = P[((i0 % N) + N) % N], b = P[(((i0 + 1) % N) + N) % N];
    const k = f * f * (3 - 2 * f);
    // round the colour wheel rather than straight through RGB, which turned
    // yellow-to-blue grey halfway. The short way round: Rowan's red to Heath's
    // purple goes through pink, not through every colour in between.
    a.getHSL(_hslA); b.getHSL(_hslB);
    let dh = _hslB.h - _hslA.h;
    if (dh > 0.5) dh -= 1; else if (dh < -0.5) dh += 1;
    ACCENT.setHSL(((_hslA.h + dh * k) % 1 + 1) % 1, _hslA.s + (_hslB.s - _hslA.s) * k, _hslA.l + (_hslB.l - _hslA.l) * k);
    this.glow = glowGain(ACCENT);
    this.cone.material.uniforms.uColor.value.copy(ACCENT);
    this.dust.material.color.copy(ACCENT).multiplyScalar(1.6 * this.glow);
    const peak = Math.max(ACCENT.r, ACCENT.g, ACCENT.b) || 1;
    this.rimR.color.copy(this.rimWarm).lerp(this.rimTint.copy(ACCENT).multiplyScalar(1 / peak), 0.7);
  }

  makeDust() {
    const n = this.mobile ? 160 : 360;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(Math.random()) * 0.62, a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r + 0.1;
      pos[i * 3 + 1] = 0.25 + Math.random() * 2.35;
      pos[i * 3 + 2] = Math.sin(a) * r * 0.6 + 0.25;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: ACCENT.clone().multiplyScalar(1.6), size: 0.006, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false });
    return new THREE.Points(geo, mat);
  }

  render() {
    if (!this.running || document.hidden) return;
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const walkSettled = Math.abs(this.walkTo - this.walkAt) < 6e-4;
    const ringSettled = Math.abs(this.u - this.lastU) < 1e-4 && this.breath < 1e-3 && !this.drag;
    if (walkSettled && ringSettled && this.lights > 0.99 && (this.focus < 0.01 || this.focus > 0.99)) {
      this.idleTime += dt;
    } else {
      this.idleTime = 0;
      this.settledFrames = 0;
    }
    // In the Drawing chapter and Close-up walk stops (walkAt > 0.35), motion is driven by scroll:
    // once scroll settles (or after 10s of zero user interaction anywhere), rest the GPU until the next input.
    if ((this.walkAt > 0.35 && walkSettled && ringSettled && this.focus < 0.01) || this.idleTime > 10) {
      if (++this.settledFrames > 2) return;
    }
    this.time += dt;
    this.update(dt);
    this.composer.render(dt);
  }
}
