// The showroom: seven plinths on a curved track over a black glass floor,
// the centre one under a spot and a halo, the rest falling away into the dark. One continuous number, `u`,
// drives the whole ring: guitar i sits at slot s = wrap(i - u), and every
// visual (position, dimming, ring light, lift) is a function of s. Stepping,
// dragging and clicking all just move `u`.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildStandin } from './standins.js';
import { prepareGuitar } from './guitar-look.js';

const N = 7;
const ACCENT = new THREE.Color('#e7bd7f');   // the centre guitar's colour, set every frame (applyPalette)
const PED_TOP = 0.09;                  // plinth height, metres: low, so the glass floor shows round them
const HOVER = 0.028;                   // guitars float just clear of the top

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
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDim = uniform;
    shader.fragmentShader = 'uniform float uDim;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>', 'gl_FragColor.rgb *= uDim;\n#include <dithering_fragment>');
  };
  material.customProgramCacheKey = () => 'dim';
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

// film grain and vignette, in display space after tone mapping
const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: LOOK.grain } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.0) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
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
    this.time = 0;
    this.last = performance.now();
    this.pointer = new THREE.Vector2(10, 10);
    this.hover = -1;
    this.drag = null;
    this.closeYaw = 0;
    this.closeDist = 0;
    this.parallax = new THREE.Vector2();
    this.scrollT = 0;
    this.mobile = matchMedia('(max-width: 760px)').matches;

    this.breath = 0;          // 0..1, how far the camera has pulled back for a turn
    this.lean = 0;            // sideways lean into the turn
    this.lastU = 0;
    this.glow = 1;            // glowGain of the centre colour
    this.initRenderer();
    this.initScene();
    this.layout();
    this.bind();
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

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.mobile ? 2 : 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
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
      textureWidth: 512, textureHeight: 512, clipBias: 0.002, shader: FloorShader, multisample: 4,
      color: new THREE.Color('#050506'),
    });
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    this.buildRoom();

    // lights: one key spot over the stage, two rims behind it, a whisper of top light
    const key = this.key = new THREE.SpotLight('#fff1dc', 0, 9, 0.21, 0.7, 2);
    key.position.set(0.55, 3.7, 2.1);
    key.target.position.set(0, 0.6, 0);
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
  async load(lineup, glbUrl) {
    const clay = new THREE.MeshPhysicalMaterial({ color: '#6c665f', roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.4 });
    const graphite = new THREE.MeshStandardMaterial({ color: '#2d2a27', roughness: 0.42, metalness: 0.4 });
    const pedGeo = new THREE.LatheGeometry([
      [0, 0], [0.4, 0], [0.4, 0.012], [0.385, 0.016], [0.33, 0.016], [0.325, 0.022], [0.325, 0.078], [0.321, 0.085], [0.31, PED_TOP], [0, PED_TOP],
    ].map(([x, y]) => new THREE.Vector2(x, y)), 96);
    const ringGeo = new THREE.TorusGeometry(0.323, 0.0034, 8, 180);

    this.setPalette(lineup.map((g) => g.colour));
    const gltf = await new GLTFLoader().loadAsync(glbUrl, (e) => { if (e.total) this.onProgress(e.loaded / e.total); });
    const floe = gltf.scene;
    prepareGuitar(floe, this.renderer);

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

      let guitar;
      if (info.real) {
        guitar = floe;
        guitar.traverse((o) => { if (o.isMesh) addDim(o.material, dim); });
      } else {
        const c = clay.clone(), gr = graphite.clone();
        addDim(c, dim); addDim(gr, dim);
        guitar = buildStandin(info.shape, c, gr);
      }
      const spinner = new THREE.Group();
      spinner.add(guitar);
      spinner.position.y = PED_TOP + HOVER;
      group.add(pedestal, spinner);

      // cheap pick target
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.62; hit.userData.index = i;
      group.add(hit);

      this.scene.add(group);
      this.items.push({ info, group, pedestal, spinner, guitar, dim, ringMat, hit, spin: 0, spinV: 0, hoverK: 0 });
    });
    this.hits = this.items.map((it) => it.hit);
    this.update(0);
    this.emitChange();
  }

  // ------------------------------------------------------------ layout ----
  layout() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;
    const portrait = aspect < 0.9;
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
    this.halo.scale.setScalar(portrait ? 0.74 : 0.94);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    const pr = this.renderer.getPixelRatio();
    // the glass needs a sharp reflection, so its target runs near full size
    this.floor.getRenderTarget().setSize(Math.round(w * pr * 0.9), Math.round(h * pr * 0.9));
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
      this.drag = { x: e.clientX, u0: this.u, t: performance.now(), lastX: e.clientX, lastT: performance.now(), v: 0, moved: false, yaw0: this.closeYaw };
      c.setPointerCapture(e.pointerId);
      this.tween?.kill();
    });
    c.addEventListener('pointermove', (e) => {
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
    this.leaveCentre();
    this.tween = window.gsap.to(this, { u: target, duration, ease: 'expo.out', onUpdate: () => this.emitChange() });
  }

  step(dir) {
    const target = Math.round(this.u) + dir;
    this.leaveCentre();
    this.tween?.kill();
    this.tween = window.gsap.to(this, { u: target, duration: this.reduced ? 0.01 : LOOK.stepDuration, ease: 'expo.inOut', onUpdate: () => this.emitChange() });
  }

  goTo(i) {
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
    const it = this.items[this.index];
    this.leaveCentre();
    this.closeYaw = 0.35; this.closeDist = 0;
    window.gsap.to(this, { focus: 1, duration: 1.8, ease: 'expo.inOut' });
    window.gsap.to(this, { closeYaw: 0.5, duration: 2.4, ease: 'expo.out' });
    return it;
  }

  exitCloseup() {
    window.gsap.to(this, { focus: 0, closeYaw: 0, closeDist: 0, duration: 1.6, ease: 'expo.inOut' });
  }

  // intro: the room's lights come on, centre first, then outwards
  intro() {
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

    // camera: close framing, a little pointer parallax, a crane on scroll,
    // the breath on a turn, and the push-in for close-up
    const b = this.camBase;
    const px = this.parallax.x * 0.08 * (1 - F), py = this.parallax.y * 0.04 * (1 - F);
    const pos = b.pos.clone().add(new THREE.Vector3(px, py + this.scrollT * 0.55, -this.scrollT * 0.4));
    const tgt = b.target.clone().add(new THREE.Vector3(px * 0.3, this.scrollT * 0.08, 0));
    this.breathe(pos, tgt, dt);
    const close = this.mobile || cam.aspect < 0.9
      ? { pos: new THREE.Vector3(0, 0.57, 3.5), target: new THREE.Vector3(0, 0.19, 0), fov: 40 }
      : { pos: new THREE.Vector3(0.3, 0.67, 2.6), target: new THREE.Vector3(0.3, 0.63, 0), fov: 30 };
    close.pos.z += this.closeDist;
    cam.position.lerpVectors(pos, close.pos, F);
    const look = tgt.lerp(close.target, F);
    cam.fov = b.fov + (close.fov - b.fov) * F;
    cam.updateProjectionMatrix();
    cam.lookAt(look);
    this.floor.material.uniforms.uCam.value.copy(cam.position);

    // hover highlight
    if (!this.drag && F < 0.5 && Math.abs(this.pointer.x) < 1.5) {
      const h = this.pick();
      this.canvas.style.cursor = h >= 0 && h !== this.index ? 'pointer' : '';
    }

    // the ring
    const tmp = new THREE.Vector3();
    this.items.forEach((it, i) => {
      const s = wrap(i - this.u);
      const a = Math.abs(s);
      this.pathPoint(s, tmp);
      it.group.position.copy(tmp);
      const lift = 0.045 * (1 - smooth(0, 0.7, a));
      it.group.position.y = lift;
      // face a point in front of the room, so the sides angle in a little
      const face = Math.atan2(-tmp.x, 3.2 - tmp.z);
      const centre = a < 0.02 && !this.drag;
      if (centre && F < 0.01 && !this.reduced) it.spinV = Math.min(it.spinV + dt * 0.08, LOOK.spinSpeed);
      else if (!centre) it.spinV = 0;
      it.spin += it.spinV * dt;
      const yaw = face + it.spin + (a < 0.5 ? this.closeYaw * F : 0);
      it.spinner.rotation.y = yaw;

      const hk = this.hover === i && a > 0.5 ? 1 : 0;
      it.hoverK += (hk - it.hoverK) * Math.min(dt * 6, 1);
      const focusDim = a < 0.5 ? 1 : 1 - 0.85 * F;
      const dim = (curve(DIM, s) + it.hoverK * 0.14) * focusDim * (0.15 + 0.85 * smooth(0, 1, L * 1.4 - a * 0.12));
      it.dim.value = dim;
      const glow = curve(GLOW, s) * (0.6 + 0.4 * smooth(0, 1, L * 1.2 - a * 0.1)) * smooth(0, 1, L * 1.6 - a * 0.25) * (1 - 0.6 * F * (a > 0.5));
      // the plinth ring stays soft under the guitar in front (the halo is its
      // light) and comes up to full as the guitar moves to the side
      const own = this.palette[i];
      it.ringMat.color.copy(own).multiplyScalar(3.4 * glow * this.gains[i] * (0.32 + 0.68 * smooth(0, 1, a)));
    });

    // lights follow the intro and the close-up
    const on = smooth(0, 1, L);
    this.key.intensity = LOOK.spot * on;
    this.rimL.intensity = LOOK.rim * smooth(0.2, 1, L) * (1 + 0.6 * F);
    this.rimR.intensity = LOOK.rim * 0.8 * smooth(0.25, 1, L) * (1 + 0.6 * F);
    this.top.intensity = 0.35 * on;
    this.scene.environmentIntensity = LOOK.envIntensity * (0.3 + 0.7 * on);
    const G = this.glow;
    this.cone.material.uniforms.uAlpha.value = 0.05 * G * smooth(0.1, 1, L) * (1 - 0.7 * F);
    this.halo.children.forEach((m) => m.material.color.copy(ACCENT).multiplyScalar(G * m.userData.k * smooth(0.3, 1, L) * (1 - 0.75 * F)));
    // the seams share one material, at the strength they have always had
    this.seams[0].material.color.copy(ACCENT).multiplyScalar(G * 0.067 * smooth(0.4, 1, L) * (1 - 0.6 * F));
    this.floor.material.uniforms.uPool.value.copy(ACCENT).multiplyScalar(G * 0.03 * on * (1 - 0.4 * F));

    // dust drifting through the cone
    const dp = this.dust.geometry.attributes.position;
    for (let k = 0; k < dp.count; k++) {
      let y = dp.getY(k) + dt * 0.03 * (0.5 + (k % 7) / 7);
      if (y > 2.6) y = 0.25;
      dp.setY(k, y);
      dp.setX(k, dp.getX(k) + Math.sin(t * 0.3 + k) * dt * 0.004);
    }
    dp.needsUpdate = true;
    this.dust.material.opacity = 0.55 * smooth(0.3, 1, L) * (1 - 0.8 * F);

    this.bloom.strength = LOOK.bloom.strength * (1 - 0.45 * F);
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
    // yellow-to-blue grey halfway
    ACCENT.copy(a).lerpHSL(b, k);
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
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now; this.time += dt;
    this.update(dt);
    this.composer.render(dt);
  }
}
