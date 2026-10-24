// The workshop chapter (V7, 2026-10-23): three options behind ?shop=<slug>, for Sam to watch and pick.
//   ?shop=bench    01 On the Bench: the guitar lies on a bench under a lamp and builds itself as you scroll
//   ?shop=weeks    02 Twelve Weeks: a calendar of light, one rod per week, the stages marked over them
//   ?shop=gallery  03 Where the Weeks Go: a sideways gallery, one picture per stage
// Without the switch the page has no workshop. It sits between the end of the close-up tour and 02.
// Shared here: the stages and their words (stagesFor), the section, its head and its pin. Each option
// is a score on top: make(ctx) returns { len, progress(p), guitar(i) }, len in screens of pin.
import * as THREE from 'three';
import { LINEUP } from './data.js';
import { SPECS } from './specs.js';
import { gltfLoader, prepareGuitar, studioEnvironment } from './guitar-look.js';

const { gsap, ScrollTrigger } = window;
const EASE = 'expo.out';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pad = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------- the words ---- */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen'];
const TIMBER = { floe: 'The ash', sedge: 'The maple and basswood', scree: 'The mahogany', moss: 'The alder', fjord: 'The maple', rowan: 'The maple and mahogany', heath: 'The alder' };

/** The five stages of a guitar's weeks, scaled to how long it takes (specs.js). */
export function stagesFor(info) {
  const S = SPECS[info.id], W = S.weeks, id = info.id;
  const ends = [0.25, 0.5, 0.6, 0.92, 1].map((f) => Math.max(1, Math.round(f * W)));
  const label = (a, b) => (a >= b ? `Week ${b}` : `Weeks ${a} to ${b}`);
  const carved = id === 'sedge' || id === 'rowan', semi = id === 'fjord';
  const stages = [
    { key: 'wood', label: 'The wood', title: 'The wood <em>waits</em>.',
      text: `${TIMBER[id]} is bought a year ahead and rests in the room for ${WORDS[ends[0]]} weeks before anything is cut, until it holds the same air the guitar will live in.` },
    { key: 'carve', label: carved ? 'Carve' : semi ? 'Arch' : 'Cut', title: carved ? 'Carved, line by <em>line</em>.' : semi ? 'Arched, then <em>hollowed</em>.' : 'Cut to the <em>line</em>.',
      text: carved ? 'The top is carved by hand to the drawing\'s contour lines, a millimetre at a time. Then the neck is shaped with a spokeshave until it fills the hand.'
        : semi ? 'The two faces are pressed into their arch and the inside is routed hollow round a solid centre block. The sound holes are cut last.'
          : 'The body is sawn just outside the drawn line and brought to it by hand. The neck is shaped with a spokeshave until it fills the hand.' },
    { key: 'frets', label: 'Frets', title: 'Frets, one at a <em>time</em>.',
      text: 'Each fret is pressed in, levelled with its neighbours and its ends rounded by hand, so a thumb running down the edge of the board finds nothing.' },
    { key: 'finish', label: 'Finish', title: 'Thin coats, long <em>waits</em>.',
      text: `The ${S.finish.toLowerCase()} goes on a thin coat a day, sanded back between, then the guitar hangs while the lacquer hardens. Counting the wood's rest, more than half of the ${WORDS[W]} weeks is waiting.` },
    { key: 'setup', label: 'Set up', title: 'Strung, then <em>played</em>.',
      text: 'Wired, strung and set to a tenth of a millimetre. Then it is played in the room for a day before it goes home with you.' },
  ].map((s, k) => ({ ...s, n: pad(k + 1), from: k ? ends[k - 1] : 0, to: ends[k], when: label(k ? ends[k - 1] + 1 : 1, ends[k]) }));
  return {
    weeks: W, price: S.price, name: info.name, stages,
    eyebrow: 'Workshop · Halden',
    h2: `${info.name} takes ${WORDS[W]} <em>weeks</em>.`,
    lede: `Two makers build every KVELD from the plank to the strings, one guitar to a bench. That is what the ${S.price} pays for.`,
  };
}

const headHTML = (T) => `
  <div class="shop__head">
    <p class="eyebrow">${T.eyebrow}</p>
    <h2 class="shop__h2" data-shop-h2>${T.h2}</h2>
    <p class="shop__lede" data-shop-lede>${T.lede}</p>
  </div>`;

// One stage's words, the title sliding up out of a mask when it changes (the same move as the tour's copy)
const stageHTML = () => `
  <div class="shop__stage" data-stage>
    <p class="shop__when"><span data-st-n>01</span><b data-st-label></b><i data-st-when></i></p>
    <h3 class="shop__title"><span data-st-title></span></h3>
    <p class="shop__text" data-st-text></p>
  </div>`;
function stageSwapper(root, reduced) {
  const el = { n: $('[data-st-n]', root), label: $('[data-st-label]', root), when: $('[data-st-when]', root), title: $('[data-st-title]', root), text: $('[data-st-text]', root) };
  let at = -1, T = null;
  const fill = (s) => { el.n.textContent = s.n; el.label.textContent = s.label; el.when.textContent = s.when; el.title.innerHTML = s.title; el.text.textContent = s.text; };
  return {
    words(t) { T = t; if (at >= 0) fill(T.stages[at]); },
    show(k) {
      if (k === at || !T) return;
      const first = at < 0; at = k;
      if (first || reduced) { fill(T.stages[k]); return; }
      gsap.timeline({ overwrite: true })
        .to(el.title, { yPercent: -110, duration: 0.35, ease: 'expo.in' })
        .to([el.text, el.when], { opacity: 0, y: -6, duration: 0.3, ease: 'expo.in' }, 0)
        .add(() => fill(T.stages[k]))
        .fromTo(el.title, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: EASE })
        .fromTo([el.when, el.text], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.06 }, '<0.1');
    },
  };
}

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

/* ------------------------------------------------------- the section ---- */
let cssP = null;
const css = () => cssP ||= new Promise((ok) => {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('../workshop-options.css', import.meta.url).href + '?v=1';
  l.onload = l.onerror = ok; document.head.appendChild(l);
});

/** Put the workshop in front of `before` and pin it. Returns { setGuitar(i) } or null. */
export async function buildWorkshop(slug, { room, reduced, before }) {
  const make = OPTIONS[slug];
  if (!make) return null;
  await css();
  const section = document.createElement('section');
  section.className = `shop shop--${slug}`;
  section.id = 'workshop';
  section.setAttribute('aria-label', 'The workshop');
  before.before(section);
  const at = () => LINEUP[room?.index ?? 0];
  const opt = await make({ section, room, reduced, info: at(), T: stagesFor(at()) });
  ScrollTrigger.create({
    trigger: section, start: 'top top', end: () => `+=${Math.round(opt.len * innerHeight)}`, pin: true, anticipatePin: 1,
    onUpdate: (s) => opt.progress(s.progress),
  });
  opt.progress(0);
  section.dataset.ready = '1';
  let shown = at().id;
  return {
    setGuitar(i) {
      const info = LINEUP[i];
      if (!info || info.id === shown) return;
      shown = info.id;
      opt.guitar?.(info, stagesFor(info));
    },
  };
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

/* =================================================== 01 · On the Bench ==== */
// The tour ends on the guitar lying flat. Here it lies on a walnut bench under one warm lamp, seen from
// above the same way, and builds itself as you scroll: two blanks of raw wood, a saw line that runs down
// them and leaves the body and the neck, the frets pressed in, the finish wiped on from the tail with a
// wet edge, the hardware set down, the strings last. The camera tilts from above to three quarters.
const KNOWN = new Set(['Body', 'Neck', 'SkunkStripe', 'Fretboard', 'Frets', 'Dots', 'Nut', 'Logo', 'Strings', 'Pickguard', 'BridgePickup', 'NeckPickup',
  'MiddlePickup', 'Bridge', 'Saddles', 'Tailpiece', 'Tremolo', 'Controls', 'Tuners', 'Screws', 'BackHardware', 'Binding']);
const STAGE_OF = { Body: 'wood', Neck: 'wood', SkunkStripe: 'wood', Binding: 'wood', Fretboard: 'frets', Frets: 'frets', Dots: 'frets', Nut: 'frets', Logo: 'frets', Strings: 'strings' };
// the bench's light, tunable from the console while it is being judged (window.__shop.LIGHT)
const LIGHT = { lamp: 11, env: 0.26, rim: 0.5, exposure: 1.08 };
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
    sh.fragmentShader = 'uniform float uSweep, uEdge; uniform vec3 uAxis, uRaw; varying vec3 vShopW;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float shopD = dot(vShopW, uAxis) - uSweep;
        float shopFin = 1.0 - smoothstep(-0.01, 0.01, shopD);
        float shopLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(uRaw * (0.8 + 0.4 * smoothstep(0.0, 0.8, shopLum)), diffuseColor.rgb, shopFin);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.8, roughnessFactor, shopFin);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  material.clearcoat *= shopFin;\n#endif')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * 0.55 * uEdge * exp(-pow(shopD / 0.008, 2.0));`);
  };
  m.customProgramCacheKey = () => `shopfin${prev ? '+' : ''}`;
  m.needsUpdate = true;
}

async function bench(ctx) {
  const { section, reduced } = ctx;
  let T = ctx.T;
  section.innerHTML = `
    <div class="shop__frame bn">
      <canvas class="bn__gl" aria-hidden="true"></canvas>
      <div class="bn__shade"></div>
      ${headHTML(T)}
      ${stageHTML()}
      <p class="shop__week"><b>Week</b><span class="shop__wk"><span data-week>01</span></span><i data-of>/ ${T.weeks}</i></p>
      ${railHTML(T)}
    </div>`;
  const words = stageSwapper(section, reduced);
  words.words(T);
  const weekEl = $('[data-week]', section);

  const canvas = $('.bn__gl', section);
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
  lamp.position.set(-0.2, 1.55, 0.45);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0003; lamp.shadow.normalBias = 0.01; lamp.shadow.radius = 5;
  lamp.shadow.camera.near = 0.6; lamp.shadow.camera.far = 3.2;
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight('#a9c6ff', 0);
  rim.position.set(1.2, 0.7, -1.4);
  scene.add(rim);

  const holder = new THREE.Group();
  scene.add(holder);
  const fin = { uSweep: { value: -10 }, uEdge: { value: 0 }, uAxis: { value: new THREE.Vector3(1, 0, 0) } };
  const cut = new THREE.Plane(new THREE.Vector3(1, 0, 0), 10);
  let G = null;                 // the guitar on the bench: parts, blanks, its length along the axis
  let portrait = false, pTarget = 0, pShown = -1, dirty = true, visible = false;

  async function load(info) {
    const root = (await gltfLoader().loadAsync(info.model)).scene;
    prepareGuitar(root, renderer, { envMapIntensity: 1 });
    const lie = new THREE.Group();
    root.rotation.x = -Math.PI / 2;                  // on its back, face up, the neck toward -z
    lie.add(root);
    holder.rotation.set(0, 0, 0);
    holder.updateMatrixWorld(true);
    lie.updateMatrixWorld(true);
    // precise: from the vertices. BackHardware's stored bounds are 33 cm deep and would lift the guitar off the bench
    const all = new THREE.Box3().setFromObject(lie, true), c = all.getCenter(new THREE.Vector3());
    lie.position.set(-c.x, -all.min.y + 0.003, -c.z);
    const old = G;
    if (old) { holder.remove(old.lie, ...old.blanks); old.lie.traverse((o) => o.geometry?.dispose()); }
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
    const box = (names) => { const b = new THREE.Box3(); parts.filter((p) => names.includes(p.name)).forEach((p) => b.expandByObject(p.node, true)); return b; };
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
    const saw = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a8').multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    saw.rotation.x = -Math.PI / 2;
    holder.add(saw);
    blanks.push(saw);

    G = { info, lie, parts, blanks, saw, tail: -all.max.z + c.z, head: -all.min.z + c.z, width: bodyB.max.x - bodyB.min.x,
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
    camera.setViewOffset(w, h, portrait ? 0 : -w * 0.13, portrait ? -h * 0.02 : 0, w, h);
    dirty = true;
  }

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function frame(p) {
    if (!G) return;
    const S = storyAt(p, T);
    // lamp: comes on as the section settles, a little brighter when it is finished
    const on = smooth(0, 0.05, p);
    lamp.intensity = LIGHT.lamp * on * (1 + 0.25 * smooth(0.9, 1, p));
    rim.intensity = LIGHT.rim * on;
    scene.environmentIntensity = LIGHT.env * (0.15 + 0.85 * on);
    renderer.toneMappingExposure = LIGHT.exposure;
    // the saw: down the blanks from the tail to the head during the cut
    const L = G.head - G.tail;
    const sawAt = G.tail - 0.03 + (L + 0.06) * smooth(BOUNDS[1] + 0.01, BOUNDS[2] - 0.02, p);
    cut.constant = -sawAt;
    const sawing = p > BOUNDS[1] && p < BOUNDS[2] - 0.02;
    G.saw.visible = sawing;
    if (sawing) {                                   // in the holder's own frame the axis is always -z
      G.saw.position.set(0, G.sawY, -sawAt);
      G.saw.scale.set(G.width + 0.08, 0.004, 1);
    }
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
    const span = portrait ? (L + 0.05) / 0.56 : (L + 0.1) / 0.5;
    const dist = span / 2 / Math.tan((camera.fov * Math.PI) / 360) / (portrait ? 1 : camera.aspect) * 0.98;
    const above = V(0, dist, 0.001), side = portrait ? V(0.22, 0.95, 0.9).normalize().multiplyScalar(dist * 0.9) : V(-0.32, 0.7, 0.95).normalize().multiplyScalar(dist * 0.74);
    camera.position.copy(above).lerp(side, tilt).setLength(dist * (1 - 0.24 * tilt));
    camera.position.applyAxisAngle(V(0, 1, 0), (p - 0.5) * 0.16);
    camera.up.copy(V(0, 0, -1)).lerp(V(0, 1, 0), smooth(0, 0.6, tilt)).normalize();
    camera.lookAt(0, 0.02 * tilt, 0);
    lamp.target.position.set(0, 0, 0);
    camera.updateProjectionMatrix();

    // the words
    words.show(S.k);
    weekEl.textContent = pad(Math.max(1, Math.ceil(S.week - 1e-6)));
    railFill(section, T, S.week);
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }, { rootMargin: '10% 0px' });
  io.observe(section);
  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || !G) return;
    const before = pShown;
    pShown = pShown < 0 || reduced ? pTarget : pShown + (pTarget - pShown) * Math.min(dt * 7, 1);
    if (Math.abs(pTarget - pShown) < 1e-4) pShown = pTarget;
    if (pShown === before && !dirty) return;
    dirty = false;
    frame(pShown);
    renderer.render(scene, camera);
  });
  addEventListener('resize', () => { layout(); });
  await load(ctx.info);
  window.__shop = { LIGHT, scene, camera, renderer, frame: (p) => { frame(p); renderer.render(scene, camera); }, sweep: () => fin.uSweep.value, get G() { return G; } };

  return {
    len: 5,
    progress(p) { pTarget = p; dirty = true; },
    async guitar(info, t) { T = t; words.words(T); await load(info); },
  };
}

/* ==================================================== 02 · Twelve Weeks ==== */
// A calendar of light: one thin rod per week across the screen, the stages bracketed over their weeks.
// Scrolling fills the rods one by one in the guitar's colour. The weeks where the wood rests and the
// lacquer hardens fill dotted and dimmer, so you can see that most of the time is waiting. The week
// number stands huge and faint behind the rods.
const WAITING = (T, w) => { const [wood, , , finish] = T.stages; return w <= wood.to || (w > finish.from + 1 && w <= finish.to); };
async function weeks(ctx) {
  const { section, reduced } = ctx;
  let T = ctx.T;
  const paint = () => {
    section.innerHTML = `
      <div class="shop__frame wk" style="--n: ${T.weeks}">
        <i class="wk__pool"></i>
        <p class="wk__big" aria-hidden="true"><span data-week>01</span></p>
        ${headHTML(T)}
        ${stageHTML()}
        <ol class="wk__spans">${T.stages.map((s) => `<li style="grid-column: ${s.from + 1} / ${s.to + 1}"><span>${s.label}</span></li>`).join('')}</ol>
        <ol class="wk__rods">${Array.from({ length: T.weeks }, (_, k) => `<li class="${WAITING(T, k + 1) ? 'is-wait' : ''}"><i><b></b></i><span>${pad(k + 1)}</span></li>`).join('')}</ol>
        <p class="wk__key"><span><i></i>At the bench</span><span><i class="is-wait"></i>Waiting</span></p>
      </div>`;
  };
  paint();
  let words = stageSwapper(section, reduced); words.words(T);
  let rods = [], spans = [], weekEl = null, pool = null, last = -1;
  const grab = () => { rods = $$('.wk__rods li', section); spans = $$('.wk__spans li', section); weekEl = $('[data-week]', section); pool = $('.wk__pool', section); last = -1; };
  grab();
  // the rods rise into place, left to right, as the section comes up the screen
  const enter = () => {
    const r = section.getBoundingClientRect(), t = clamp01(1 - r.top / innerHeight);
    rods.forEach((li, k) => { const e = smooth(0.25 + k * 0.5 / rods.length, 0.55 + k * 0.45 / rods.length, t); li.style.transform = `translate3d(0, ${((1 - e) * 40).toFixed(1)}px, 0)`; li.style.opacity = e.toFixed(3); });
  };
  if (!reduced) { gsap.ticker.add(enter); }
  function progress(p) {
    const S = storyAt(p, T);
    rods.forEach((li, k) => {
      const f = clamp01(S.week - k);
      li.firstElementChild.firstElementChild.style.transform = `scaleY(${f.toFixed(4)})`;
      li.classList.toggle('is-now', S.week > k && S.week <= k + 1);
      li.classList.toggle('is-done', f >= 1);
    });
    spans.forEach((li, k) => li.classList.toggle('is-on', k === S.k));
    const wk = Math.max(1, Math.ceil(S.week - 1e-6));
    if (wk !== last) {
      last = wk;
      weekEl.textContent = pad(wk);
      if (!reduced) gsap.fromTo(weekEl, { yPercent: 18, opacity: 0.4 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: EASE, overwrite: true });
    }
    pool.style.opacity = (0.35 + 0.65 * smooth(0, 1, S.week / T.weeks)).toFixed(3);
    words.show(S.k);
  }
  return {
    len: 4,
    progress,
    guitar(info, t) { T = t; paint(); words = stageSwapper(section, reduced); words.words(T); grab(); progress(0); },
  };
}

/* ============================================== 03 · Where the Weeks Go ==== */
// A sideways gallery: after the head, one picture per stage, taken in the bench scene at that moment of
// the build (tools/shop_pictures.mjs). Big outlined stage numbers, the blocks set high and low in turn,
// each picture drifting inside its frame. A ruler of weeks draws itself along the bottom.
async function gallery(ctx) {
  const { section, reduced } = ctx;
  let T = ctx.T, info = ctx.info;
  const pic = (id, key) => `assets/shop/${id}-${key}.jpg`;
  section.innerHTML = `
    <div class="shop__frame gl">
      <div class="gl__track" data-track>
        <div class="gl__intro">${headHTML(T)}</div>
        ${T.stages.map((s, k) => `
        <figure class="gl__card${k % 2 ? ' is-low' : ''}">
          <div class="gl__pic"><img src="${pic(info.id, s.key)}" alt="" decoding="async" data-key="${s.key}"></div>
          <span class="gl__no" aria-hidden="true">${s.n}</span>
          <figcaption>
            <p class="shop__when"><b data-g-label>${s.label}</b><i data-g-when>${s.when}</i></p>
            <h3 class="gl__title" data-g-title>${s.title}</h3>
            <p class="shop__text" data-g-text>${s.text}</p>
          </figcaption>
        </figure>`).join('')}
        <div class="gl__end" aria-hidden="true"></div>
      </div>
      <p class="gl__week">Week <span data-week>01</span> <i data-of>/ ${T.weeks}</i></p>
      <div class="gl__ruler"><i class="gl__line"><b></b></i><ol>${Array.from({ length: T.weeks }, (_, k) => `<li style="left: ${((k + 0.5) / T.weeks) * 100}%"></li>`).join('')}</ol></div>
    </div>`;
  const track = $('[data-track]', section), cards = $$('.gl__card', section), imgs = $$('.gl__pic img', section);
  const weekEl = $('[data-week]', section), line = $('.gl__line b', section), ticks = $$('.gl__ruler li', section);
  await Promise.all(imgs.map((im) => im.decode().catch(() => {})));
  let dist = 0, centres = [];
  const measure = () => {
    dist = Math.max(track.scrollWidth - section.clientWidth, 1);
    centres = cards.map((c) => c.offsetLeft + c.offsetWidth / 2);
  };
  measure();
  addEventListener('resize', measure);
  let lastWk = -1;
  function progress(p) {
    const x = p * dist;
    track.style.transform = `translate3d(${(-x).toFixed(1)}px, 0, 0)`;
    // each picture drifts inside its frame, against the track
    imgs.forEach((im, k) => { const off = (centres[k] - x - section.clientWidth / 2) / section.clientWidth; im.style.transform = `translate3d(${(-off * 12).toFixed(2)}%, 0, 0) scale(1.18)`; });
    // the stage at the centre of the screen, and how far through its weeks
    const mid = x + section.clientWidth / 2;
    let f = (mid - centres[0]) / (centres[1] - centres[0]);
    f = Math.min(Math.max(f, -0.5), T.stages.length - 0.5);
    const k = Math.min(Math.max(Math.round(f), 0), T.stages.length - 1), s = T.stages[k];
    const week = p >= 0.985 ? T.weeks : Math.max(0, s.from + (s.to - s.from) * clamp01(f - k + 0.5));
    cards.forEach((c, j) => c.classList.toggle('is-on', j === k && f > -0.45));
    line.style.transform = `scaleX(${(week / T.weeks).toFixed(4)})`;
    ticks.forEach((t, j) => t.classList.toggle('is-done', week > j));
    const wk = Math.max(1, Math.ceil(week - 1e-6));
    if (wk !== lastWk) { lastWk = wk; weekEl.textContent = pad(wk); }
  }
  return {
    get len() { return dist / innerHeight * 1.05; },
    progress,
    guitar(inf, t) {
      info = inf; T = t;
      // words for the new guitar; pictures exist per guitar once tools/shop_pictures.mjs has run for it
      cards.forEach((c, k) => { const st = T.stages[k]; $('[data-g-label]', c).textContent = st.label; $('[data-g-when]', c).textContent = st.when; $('[data-g-title]', c).innerHTML = st.title; $('[data-g-text]', c).textContent = st.text; });
      imgs.forEach((im) => { im.src = pic(info.id, im.dataset.key); });
      $('[data-shop-h2]', section).innerHTML = T.h2; $('[data-shop-lede]', section).innerHTML = T.lede;
      $('[data-of]', section).textContent = `/ ${T.weeks}`;
    },
  };
}

const OPTIONS = { bench, weeks, gallery };
