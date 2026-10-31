// The workshop: between the end of the close-up tour and 02. Picked by Sam on 2026-10-23 from three
// options (the other two, Twelve Weeks and Where the Weeks Go, are under the tag alt/workshop-options).
//
// The tour ends on the guitar lying flat. Here it lies on a walnut bench under one warm lamp, seen from
// above the same way, and builds itself as you scroll: two blanks of raw wood are set down, a saw line
// runs down them and leaves the body and the neck, the frets drop in, the finish is wiped on from the
// tail with a wet edge, the hardware is set down, the strings last. The camera tilts from straight above
// to three quarters. The words follow the guitar's own weeks (specs.js), so the price makes sense.
//
// It has its own small renderer and draws only while the section is on screen and the scroll moves.
// The guitar is a copy of the one the room has already loaded (no second download), with its own
// materials so the finish sweep never touches the room's.
//
//   createWorkshop(section, { room, reduced })   builds the scene behind the loader. Resolves once the
//                                                first guitar is on the bench and its shaders compiled.
//   .pin()          the scroll pin. Called after the room's (pins are made in page order).
//   .setGuitar(i)   follows the ring, once it has settled.
import * as THREE from 'three';
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';
import { gltfLoader, prepareGuitar, studioEnvironment } from './guitar-look.js';
import { createStageWords } from './workshop-words.js';
import { riseOver } from './handoff.js';

const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pad = (n) => String(n).padStart(2, '0');
const LEN = 5;                  // screens of scroll the bench holds for

/* ------------------------------------------------------------- the words ---- */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen'];

/** The five stages of a guitar's weeks, scaled to how long it takes (specs.js). Their words: workshop-words.js. */
export function stagesFor(info) {
  const S = SPECS[info.id], W = S.weeks, id = info.id;
  const ends = [0.25, 0.5, 0.6, 0.92, 1].map((f) => Math.max(1, Math.round(f * W)));
  const label = (a, b) => (a >= b ? `Week ${b}` : `Weeks ${a} to ${b}`);
  const carved = id === 'sedge' || id === 'rowan', semi = id === 'fjord';
  const stages = [
    { key: 'wood', label: 'Rest' },                 // the same words as the big ones (workshop-words.js)
    { key: 'carve', label: carved ? 'Carve' : semi ? 'Arch' : 'Cut' },
    { key: 'frets', label: 'Fret' },
    { key: 'finish', label: 'Coat' },
    { key: 'setup', label: 'Play' },
  ].map((s, k) => ({ ...s, n: pad(k + 1), from: k ? ends[k - 1] : 0, to: ends[k], when: label(k ? ends[k - 1] + 1 : 1, ends[k]) }));
  return {
    weeks: W, price: S.price, name: info.name, stages,
    eyebrow: '01 · The workshop, Halden',
    h2: `${info.name} takes ${WORDS[W]} <em>weeks</em>.`,
    lede: `Two makers, one bench. Here is where the ${S.price} goes.`,
  };
}

const headHTML = (T) => `
  <div class="shop__head">
    <p class="eyebrow">${T.eyebrow}</p>
    <h2 class="shop__h2" data-shop-h2>${T.h2}</h2>
    <p class="shop__lede" data-shop-lede>${T.lede}</p>
  </div>`;

// The week rail along the bottom: one segment per stage, as long as its weeks, filling as the weeks pass
const railHTML = (T) => `<ol class="shop__rail" data-rail>${T.stages.map((s) => `
  <li style="flex: ${s.to - s.from}"><i><b></b></i><span>${s.label}</span></li>`).join('')}</ol>`;
function railFill(root, T, week) {
  $$('[data-rail] li', root).forEach((li, k) => {
    const s = T.stages[k], f = clamp01((week - s.from) / (s.to - s.from));
    li.firstElementChild.firstElementChild.style.transform = `scaleX(${f.toFixed(4)})`;
    li.classList.toggle('is-on', week > s.from && week <= s.to + 1e-6);
  });
}

// Visual share of the pin each stage gets (the weeks are uneven, the story should not be): wood,
// cut, frets, finish, set up, then a beat on the finished guitar. The week counter runs through each
// stage's own weeks inside its share.
const SHARE = [0.15, 0.22, 0.16, 0.2, 0.19, 0.08];
const BOUNDS = SHARE.reduce((a, s) => [...a, a[a.length - 1] + s], [0]);      // 0, .15, .37, .53, .73, .92, 1
function storyAt(p, T) {
  let k = 0;
  while (k < 4 && p >= BOUNDS[k + 1]) k++;
  const local = clamp01((p - BOUNDS[k]) / SHARE[k]);
  const s = T.stages[k];
  const week = p >= BOUNDS[5] ? T.weeks : s.from + (s.to - s.from) * local;
  return { k, local, week };
}

/* --------------------------------------------------------- the bench ---- */
const KNOWN = new Set(['Body', 'Neck', 'SkunkStripe', 'Fretboard', 'Frets', 'Dots', 'Nut', 'Logo', 'Strings', 'Pickguard', 'BridgePickup', 'NeckPickup',
  'MiddlePickup', 'Bridge', 'Saddles', 'Tailpiece', 'Tremolo', 'Controls', 'Tuners', 'Screws', 'BackHardware', 'Binding']);
const STAGE_OF = { Body: 'wood', Neck: 'wood', SkunkStripe: 'wood', Binding: 'wood', Fretboard: 'frets', Frets: 'frets', Dots: 'frets', Nut: 'frets', Logo: 'frets', Strings: 'strings' };
// the bench's light, tunable from the console while it is being judged (window.__shop.LIGHT)
const LIGHT = { lamp: 11, env: 0.26, rim: 0.3, exposure: 1.08 };
const RAW = { floe: '#c4a27a', sedge: '#d2b48a', scree: '#9c6247', moss: '#c9a57c', fjord: '#cfb187', rowan: '#c99a72', heath: '#c9a57c' };

function walnutTexture() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#1e140e'; g.fillRect(0, 0, c.width, c.height);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const y = rnd() * c.height, a = 0.025 + rnd() * 0.07, light = rnd() < 0.45;
    g.strokeStyle = light ? `rgba(96, 66, 44, ${a})` : `rgba(6, 4, 2, ${a * 1.6})`;
    g.lineWidth = 0.6 + rnd() * 3;
    const f = 0.0015 + rnd() * 0.004, amp = 2 + rnd() * 14, ph = rnd() * 6.28;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 24) { const yy = y + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function blankTexture(hex) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d'), base = new THREE.Color(hex);
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, c.width, c.height);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const y = rnd() * c.height, a = 0.05 + rnd() * 0.14;
    g.strokeStyle = `rgba(70, 44, 24, ${a})`; g.lineWidth = 0.5 + rnd() * 1.6;
    const f = 0.004 + rnd() * 0.006, amp = 1 + rnd() * 5, ph = rnd() * 6.28;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 16) { const yy = y + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 128;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Sawdust in the holder's frame (the cut runs along -z). update(q, from, len, y, keep): q is the cut's
 *  progress (past 1 the last grains are still landing), from/len where the saw starts and how far it goes
 *  along the axis, y the top of the blanks, keep 1..0 as it is swept off the bench. */
function makeDust(hex, width, n = 1600) {
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x2 = c.getContext('2d'), gr = x2.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x2.fillStyle = gr; x2.fillRect(0, 0, 32, 32);
  const col = new THREE.Color(hex).lerp(new THREE.Color('#fff4e0'), 0.35);
  const m = new THREE.PointsMaterial({ color: col, size: 0.0065, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  const grains = Array.from({ length: n }, () => ({
    t: rnd(), x: (rnd() - 0.5) * width, vx: (rnd() - 0.5) * 1.1, vy: 0.3 + rnd() * 0.8, vz: -0.15 + rnd() * 0.8, s: 0.6 + rnd() * 0.8,
  }));
  const G = 9.8, T = 3.2, FLOOR = 0.003;
  pts.update = (q, from, len, y0, keep) => {
    pts.visible = q > 0 && keep > 0;
    if (!pts.visible) return;
    m.opacity = keep;
    grains.forEach((d, i) => {
      const tau = (q - d.t) * T;
      if (tau < 0) { pos[i * 3 + 1] = -10; return; }
      const land = (d.vy + Math.sqrt(d.vy * d.vy + 2 * G * (y0 - FLOOR))) / G, tt = Math.min(tau, land);
      pos[i * 3] = d.x + d.vx * tt;
      pos[i * 3 + 1] = Math.max(FLOOR, y0 + d.vy * tt - 0.5 * G * tt * tt);
      pos[i * 3 + 2] = -(from + len * d.t) + d.vz * tt;
    });
    g.attributes.position.needsUpdate = true;
  };
  return pts;
}

// The body and neck carry their real finish. Ahead of the sweep they show as raw wood: the stain and the
// gloss gone, the grain kept. uSweep runs along uAxis (world), from the tail to the headstock.
function makeFinishable(m, raw, fin) {
  if (m.userData.raw) return;                       // a material two meshes share is patched once
  const prev = m.onBeforeCompile;
  m.userData.raw = { uRaw: { value: new THREE.Color(raw) } };
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, fin, m.userData.raw);
    sh.vertexShader = 'varying vec3 vShopW;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vShopW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uSweep, uEdge, uCut, uCutOn; uniform vec3 uAxis, uRaw; varying vec3 vShopW;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float shopD = dot(vShopW, uAxis) - uSweep;
        float shopFin = 1.0 - smoothstep(-0.01, 0.01, shopD);
        float shopLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(uRaw * (0.6 + 0.66 * smoothstep(0.08, 0.85, shopLum)), diffuseColor.rgb, shopFin);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.8, roughnessFactor, shopFin);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  material.clearcoat *= shopFin;\n#endif')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * 0.55 * uEdge * exp(-pow(shopD / 0.008, 2.0));
        // the fresh cut: warm just behind the saw, cooling over a few centimetres
        float shopC = uCut - dot(vShopW, uAxis);
        totalEmissiveRadiance += vec3(1.0, 0.6, 0.28) * 0.75 * uCutOn * step(0.0, shopC) * exp(-shopC / 0.035);`);
  };
  m.customProgramCacheKey = () => `shopfin${prev ? '+' : ''}`;
  m.needsUpdate = true;
}

// The extent of an object from its vertices, sampling big meshes: three's precise version walks all of them
// (a million triangles, 380 ms on the main thread when the room changed guitar), and a few thousand per mesh
// land within a fraction of a millimetre, which the blanks' few millimetres of clearance do not notice.
function extent(obj, box = new THREE.Box3()) {
  const v = new THREE.Vector3();
  obj.updateWorldMatrix(true, true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
  });
  return box;
}

// A copy of the guitar the room already has on its plinth, with materials of its own
function benchCopy(src) {
  // three clones userData through JSON: the guitars carry textures and uniforms there, and each went through
  // toDataURL (380 ms in one go). Set it aside for the copy and share it afterwards
  const park = (o, list) => { list.push([o, o.userData]); o.userData = {}; };
  const kept = [];
  src.traverse((o) => park(o, kept));
  const root = src.clone(true);
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
  root.traverse((o) => { if (o.isMesh) { const m = o.material, u = m.userData; m.userData = {}; o.material = m.clone(); m.userData = u; o.material.userData = { ...u }; } });
  kept.forEach(([o, u]) => { o.userData = u; });
  return root;
}

export async function createWorkshop(section, { room, reduced, nextFrame = async () => {} }) {
  const first = LINEUP[room?.index ?? 0];
  let T = stagesFor(first);

  section.innerHTML = `
    <div class="shop__frame">
      <canvas class="shop__gl" aria-hidden="true"></canvas>
      <div class="shop__shade"></div>
      ${headHTML(T)}
      ${railHTML(T)}
    </div>`;
  // the words: the stage's big word, and the maker's log for its weeks (workshop-words.js)
  const words = createStageWords(section.querySelector('.shop__frame'), reduced);

  const canvas = $('.shop__gl', section);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050404');
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.02, 30);

  const top = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: walnutTexture(), roughness: 0.5, metalness: 0 }));
  top.material.map.repeat.set(1.4, 1.1);
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  scene.add(top);

  // one warm lamp over the bench, and a cool line from behind so the edges read in the dark
  const lamp = new THREE.SpotLight('#ffdcae', 0, 0, 0.52, 0.95, 2);
  lamp.position.set(-0.1, 1.62, -0.06);     // over the guitar: the pool it leaves on the walnut is under it, not below it
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0003; lamp.shadow.normalBias = 0.01; lamp.shadow.radius = 5;
  lamp.shadow.camera.near = 0.6; lamp.shadow.camera.far = 3.2;
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight('#a9c6ff', 0);
  rim.position.set(0.5, 0.7, -1.6);
  scene.add(rim);

  const holder = new THREE.Group();
  scene.add(holder);
  const fin = { uSweep: { value: -10 }, uEdge: { value: 0 }, uCut: { value: -10 }, uCutOn: { value: 0 }, uAxis: { value: new THREE.Vector3(1, 0, 0) } };
  // a small warm light that rides along the cut
  const sawLight = new THREE.PointLight('#ffb36b', 0, 0.45, 2);
  holder.add(sawLight);
  const cut = new THREE.Plane(new THREE.Vector3(1, 0, 0), 10);
  let G = null;                 // the guitar on the bench: parts, blanks, its length along the axis
  let portrait = false, pTarget = 0, pShown = -1, dirty = true, visible = false;

  async function load(info) {
    const it = room?.items?.find((x) => x.info.id === info.id);
    const root = it?.ready ? benchCopy(it.guitar) : (await gltfLoader().loadAsync(info.model)).scene;
    await nextFrame();
    prepareGuitar(root, renderer, { envMapIntensity: 1 });
    await nextFrame();
    const lie = new THREE.Group();
    root.rotation.x = -Math.PI / 2;                  // on its back, face up, the neck toward -z
    lie.add(root);
    holder.rotation.set(0, 0, 0);
    holder.updateMatrixWorld(true);
    lie.updateMatrixWorld(true);
    // precise: from the vertices. BackHardware's stored bounds are 33 cm deep and would lift the guitar off the bench
    const all = extent(lie), c = all.getCenter(new THREE.Vector3());
    lie.position.set(-c.x, -all.min.y + 0.003, -c.z);
    const old = G;
    if (old) {                                      // the geometry is the room's: only the copy's own things go
      holder.remove(old.lie, ...old.blanks);
      old.lie.traverse((o) => { if (o.isMesh) o.material.dispose(); });
      old.blanks.forEach((b) => { b.geometry.dispose(); b.material.map?.dispose(); b.material.dispose(); });
    }
    holder.add(lie);
    lie.updateMatrixWorld(true);

    // the parts, each with the way up from where it sits (to set it down from above)
    const parts = [];
    // a part is the topmost node under the root with a known name (a mesh in several pieces moves as one)
    const partOf = (o) => { let hit = [o, o.name.split('_')[0]]; for (let p = o; p && p !== root; p = p.parent) { const n = p.name.split('_')[0]; if (KNOWN.has(n)) hit = [p, n]; } return hit; };
    const seen = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      const [node, name] = partOf(o);
      if (!seen.has(node)) {
        const w = node.getWorldPosition(new THREE.Vector3());
        const up = node.parent.worldToLocal(w.clone().add(new THREE.Vector3(0, 1, 0))).sub(node.parent.worldToLocal(w.clone()));
        seen.set(node, { node, name, stage: STAGE_OF[name] || 'setup', home: node.position.clone(), up, meshes: [] });
      }
      seen.get(node).meshes.push(o);
      o.castShadow = true;
    });
    parts.push(...seen.values());
    // the body's and neck's woods take the sweep
    const raw = RAW[info.id] || '#c9a57c';
    parts.filter((p) => p.stage === 'wood').forEach((p) => p.meshes.forEach((m) => {
      if (/^(Body|Neck)_/.test(m.material.name)) makeFinishable(m.material, /Mahogany/.test(m.material.name) ? '#9c6247' : /Maple/.test(m.material.name) && p.name === 'Neck' ? '#d8bd90' : raw, fin);
    }));

    // the two blanks the saw leaves them in: a slab round the body, a board round the neck
    const box = (names) => { const b = new THREE.Box3(); parts.filter((p) => names.includes(p.name)).forEach((p) => extent(p.node, b)); return b; };
    const bodyB = box(['Body']), neckB = box(['Neck']);
    const blankMat = new THREE.MeshStandardMaterial({ map: blankTexture(raw), roughness: 0.85, clippingPlanes: [cut], clipShadows: true });
    const blank = (b, grow) => {
      // a few millimetres proud of the wood inside it, so the two faces never fight
      const s = b.getSize(new THREE.Vector3()), m = new THREE.Mesh(new THREE.BoxGeometry(s.x + grow, s.y + 0.006, s.z + grow * 0.4), blankMat);
      m.position.copy(b.getCenter(new THREE.Vector3())); m.position.y += 0.002; m.userData.y = m.position.y;
      m.castShadow = true; m.receiveShadow = true;
      holder.add(m);
      return m;
    };
    // the neck blank runs from the body's edge to the tip of the head, as wide as the head
    const neckBlankB = neckB.clone(); neckBlankB.max.z = Math.min(neckBlankB.max.z, bodyB.min.z + 0.02);
    const blanks = [blank(bodyB, 0.03), blank(neckBlankB, 0.012)];
    // the saw line: a thin strip of light across the blanks at the cut
    const saw = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a8').multiplyScalar(1.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    saw.rotation.x = -Math.PI / 2;
    holder.add(saw);
    blanks.push(saw);
    // a soft glow either side of the line
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color('#ffb36b').multiplyScalar(0.75), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2;
    holder.add(glow);
    blanks.push(glow);
    // sawdust: thrown off the line as it passes, it falls and settles on the bench, and is swept off
    // before the frets go in. Every grain is a function of the scroll, so it runs backwards too.
    const dust = makeDust(raw, bodyB.max.x - bodyB.min.x + 0.03);
    holder.add(dust);
    blanks.push(dust);

    G = { info, lie, parts, blanks, saw, glow, dust, tail: -all.max.z + c.z, head: -all.min.z + c.z, width: bodyB.max.x - bodyB.min.x, neckWidth: neckBlankB.max.x - neckBlankB.min.x + 0.012, bodyEnd: -bodyB.min.z,
      sawY: Math.max(bodyB.max.y, neckBlankB.max.y) + 0.0055 };
    // stagger the drops within each stage, in a sensible order
    const ORDER = ['Fretboard', 'Nut', 'Frets', 'Dots', 'Logo', 'Pickguard', 'NeckPickup', 'MiddlePickup', 'BridgePickup', 'Bridge', 'Tailpiece', 'Tremolo', 'Saddles', 'Controls', 'Tuners', 'Screws', 'BackHardware', 'Strings'];
    for (const st of ['frets', 'setup', 'strings']) {
      const list = parts.filter((p) => p.stage === st).sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
      list.forEach((p, k) => { p.k = list.length > 1 ? k / (list.length - 1) : 0; });
    }
    layout();
    dirty = true;
  }

  function layout() {
    const w = section.clientWidth, h = section.clientHeight;
    portrait = w / h < 0.9;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    holder.rotation.y = portrait ? 0 : -Math.PI / 2;  // the headstock to the right, or up the screen on a phone
    holder.updateMatrixWorld(true);
    fin.uAxis.value.set(0, 0, -1).applyQuaternion(holder.quaternion);
    cut.normal.copy(fin.uAxis.value);
    // the picture sits right of the words on a wide screen
    camera.setViewOffset(w, h, portrait ? 0 : -w * 0.13, portrait ? h * 0.07 : 0, w, h);
    dirty = true;
  }

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function frame(p) {
    if (!G) return;
    const S = storyAt(p, T);
    // lamp: comes on as the section settles, a little brighter when it is finished
    const on = 0.42 + 0.58 * smooth(0, 0.05, p);       // already on as it comes up: you see the bench arrive
    lamp.intensity = LIGHT.lamp * on * (1 + 0.25 * smooth(0.9, 1, p));
    rim.intensity = LIGHT.rim * on;
    scene.environmentIntensity = LIGHT.env * (0.15 + 0.85 * on);
    renderer.toneMappingExposure = LIGHT.exposure;
    // the saw: down the blanks from the tail to the head during the cut
    const L = G.head - G.tail;
    const sawAt = G.tail - 0.03 + (L + 0.06) * smooth(BOUNDS[1] + 0.01, BOUNDS[2] - 0.02, p);
    cut.constant = -sawAt;
    const sawing = p > BOUNDS[1] && p < BOUNDS[2] - 0.02;
    G.saw.visible = G.glow.visible = sawing;
    fin.uCut.value = sawAt;
    fin.uCutOn.value = sawing ? 1 : smooth(BOUNDS[2] + 0.02, BOUNDS[2] - 0.02, p) * (p > BOUNDS[1] ? 1 : 0);
    sawLight.intensity = sawing ? 0.5 : 0;
    if (sawing) {                                   // in the holder's own frame the axis is always -z
      G.saw.position.set(0, G.sawY, -sawAt);
      // only as wide as the wood under it: the body's width over the body, the neck blank's over the neck
      const atNeck = smooth(G.bodyEnd - 0.02, G.bodyEnd + 0.02, sawAt), wide = G.width + (G.neckWidth - G.width) * atNeck;
      G.saw.scale.set(wide + 0.05, 0.0035, 1);
      G.glow.position.set(0, G.sawY - 0.0005, -sawAt);
      G.glow.scale.set(wide + 0.1, 0.06, 1);
      sawLight.position.set(0, G.sawY + 0.04, -sawAt);
    }
    // the sawdust: q is how far through the cut, running on a little past it so the last grains land
    const q = (p - (BOUNDS[1] + 0.01)) / (BOUNDS[2] - 0.02 - (BOUNDS[1] + 0.01));
    G.dust.update(q, G.tail - 0.03, L + 0.06, G.sawY, 1 - smooth(BOUNDS[2] + 0.01, BOUNDS[2] + 0.06, p));
    G.blanks.slice(0, 2).forEach((b, k) => {
      b.visible = p < BOUNDS[2];
      const t = clamp01((p - 0.01 - k * 0.035) / 0.07), e = 1 - Math.pow(1 - t, 3);
      b.position.y = b.userData.y + (1 - e) * 0.22;
      b.rotation.y = (1 - e) * (k ? -0.12 : 0.08);
    });
    // the finish: wiped on from the tail, a wet edge leading it
    const fp = smooth(BOUNDS[3] + 0.01, BOUNDS[4] - 0.03, p);
    fin.uSweep.value = G.tail - 0.04 + (L + 0.08) * fp;
    fin.uEdge.value = fp > 0 && fp < 1 ? 1 : 0;
    // parts: hidden until their stage, then set down from above
    for (const part of G.parts) {
      let t = 1;
      if (part.stage === 'wood') t = p >= BOUNDS[1] ? 1 : 0;
      else if (part.stage === 'frets') t = clamp01((p - BOUNDS[2] - part.k * 0.09) / 0.06);
      else if (part.stage === 'setup') t = clamp01((p - BOUNDS[4] - part.k * 0.12) / 0.05);
      else if (part.stage === 'strings') t = clamp01((p - BOUNDS[5] + 0.035) / 0.04);
      part.node.visible = t > 0;
      const e = 1 - Math.pow(1 - t, 3);
      part.node.position.copy(part.home).addScaledVector(part.up, (1 - e) * (part.stage === 'wood' ? 0 : 0.16));
    }
    // camera: from straight above (the tour's last shot) to three quarters, slowly, as it fills out
    const tilt = smooth(0.3, 0.97, p);
    const span = portrait ? (L + 0.05) / 0.46 : (L + 0.1) / 0.5;
    const dist = span / 2 / Math.tan((camera.fov * Math.PI) / 360) / (portrait ? 1 : camera.aspect) * 0.98;
    const above = V(0, dist, 0.001), side = portrait ? V(0.22, 0.95, 0.9).normalize().multiplyScalar(dist * 0.9) : V(-0.32, 0.7, 0.95).normalize().multiplyScalar(dist * 0.74);
    camera.position.copy(above).lerp(side, tilt).setLength(dist * (1 - 0.24 * tilt));
    camera.position.applyAxisAngle(V(0, 1, 0), (p - 0.5) * 0.16);
    camera.up.copy(V(0, 0, -1)).lerp(V(0, 1, 0), smooth(0, 0.6, tilt)).normalize();
    camera.lookAt(0, 0.02 * tilt, 0);
    lamp.target.position.set(0, 0, 0);
    camera.updateProjectionMatrix();

    // the words
    words.update(S, T, G.info);
    railFill(section, T, S.week);
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }, { rootMargin: '10% 0px' });
  io.observe(section);
  // reduced motion: no building in between, each stage shows done (the way the tour cuts from stop to stop)
  const settle = (p) => { if (!reduced) return p; let k = 0; while (k < 5 && p >= BOUNDS[k + 1]) k++; return k < 5 ? BOUNDS[k + 1] - 1e-3 : 1; };
  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || !G) return;
    const before = pShown, want = settle(pTarget);
    pShown = pShown < 0 || reduced ? want : pShown + (want - pShown) * Math.min(dt * 7, 1);
    if (Math.abs(want - pShown) < 1e-4) pShown = want;
    if (pShown === before && !dirty) return;
    dirty = false;
    frame(pShown);
    renderer.render(scene, camera);
  });
  // While the section is pinned its size only changes once ScrollTrigger has measured the new window,
  // so lay out again after every refresh (on a resize alone it still has the old one)
  addEventListener('resize', () => { layout(); });
  ScrollTrigger.addEventListener('refresh', layout);

  // Draw it once fully built and once in its blanks, so every shader (and the shadow pass) is compiled
  // now, behind the loader, and the first frame on screen does not stall
  const warm = () => { for (const p of [1, BOUNDS[1] + 0.05, 0.6]) { frame(p); renderer.render(scene, camera); } frame(0); dirty = true; };
  await load(first);
  await nextFrame();            // a frame for the loader between the build and the compile
  warm();
  section.dataset.ready = '1';
  window.__shop = { LIGHT, scene, camera, renderer, frame: (p) => { frame(p); renderer.render(scene, camera); }, sweep: () => fin.uSweep.value, get G() { return G; } };

  // Another guitar in the room: new words now, the new guitar on the bench once the ring has settled
  // (copying and compiling while it turns would cost the turn a frame or two)
  let swapT = 0, onBench = first.id;
  function retitle(info) {
    T = stagesFor(info);
    $('[data-shop-h2]', section).innerHTML = T.h2;
    $('[data-shop-lede]', section).innerHTML = T.lede;
    $('[data-rail]', section).outerHTML = railHTML(T);
    dirty = true;
  }
  return {
    pin() {
      // the rise: from its top at the bottom of the screen to its top at the top, over the room's last screen.
      // Then the pin, a screen longer than the bench's story, so Hear them can come up over the finished guitar.
      if (reduced) { ScrollTrigger.create({ trigger: section, start: 'top top', end: () => `+=${Math.round(LEN * innerHeight)}`, pin: true, onUpdate: (st) => { pTarget = st.progress; dirty = true; } }); return; }
      riseOver(section, document.querySelector('#room'));
      ScrollTrigger.create({
        trigger: section, start: 'top top', end: () => `+=${Math.round((LEN + 1) * innerHeight)}`, pin: true, anticipatePin: 1,
        onUpdate: (st) => { pTarget = Math.min(st.progress * (LEN + 1) / LEN, 1); dirty = true; },
      });
    },
    /** What is happening on the bench, for the sound (ambience.js). */
    sound() {
      const p = Math.max(pShown, 0), setup = G ? G.parts.filter((x) => x.stage === 'setup').length : 0;
      return { bench: p, saw: smooth(BOUNDS[1] + 0.01, BOUNDS[2] - 0.02, p), frets: clamp01((p - BOUNDS[2]) / 0.09) * 21,
        sweep: smooth(BOUNDS[3] + 0.01, BOUNDS[4] - 0.03, p), hardware: clamp01((p - BOUNDS[4]) / 0.12) * setup, strung: p > BOUNDS[5] ? 1 : 0 };
    },
    setGuitar(i) {
      const info = LINEUP[i];
      if (!info) return;
      clearTimeout(swapT);
      retitle(info);
      swapT = setTimeout(async () => {
        if (info.id === onBench) return;
        onBench = info.id;
        await load(info);
        await nextFrame();
        // compiled off the main thread, in both states (the blanks only show early on)
        for (const p of [1, BOUNDS[1] + 0.05]) { frame(p); await nextFrame(); await renderer.compileAsync(scene, camera).catch(() => {}); await nextFrame(); }
        dirty = true;
      }, 1500);
    },
  };
}

