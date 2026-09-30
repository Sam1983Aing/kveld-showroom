// Workshop viewer for the Floe model (inspect.html). Not part of the landing
// page: a place to look at the GLB from any distance while polishing it.
// Views and part framing are computed from the named nodes in the GLB, so they
// keep working when the model is rebuilt.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { prepareGuitar, studioEnvironment } from './guitar-look.js';

const canvas = document.querySelector('.gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0e0d0c');
const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnv = studioEnvironment(renderer);                       // softbox strips for the gloss
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;   // plain fill for the showroom mode

const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.04;
controls.maxDistance = 6;
controls.zoomSpeed = 0.9;

// lights: a soft studio set, and a dark "showroom" set close to the landing page
const key = new THREE.SpotLight('#fff1dc', 0, 8, 0.4, 0.8, 2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01;
const rimL = new THREE.SpotLight('#cfdcff', 0, 8, 0.5, 0.9, 2);
const rimR = new THREE.SpotLight('#9fe3f0', 0, 8, 0.5, 0.9, 2);   // Floe's own colour
scene.add(key, key.target, rimL, rimL.target, rimR, rimR.target);
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 96), new THREE.MeshStandardMaterial({ color: '#0b0a09', roughness: 0.85, metalness: 0 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);

const LIGHTS = {
  studio: { env: 1.0, envMap: studioEnv, bg: '#141210', key: 10, rim: 4, exposure: 1.0 },
  room: { env: 0.25, envMap: roomEnv, bg: '#050404', key: 46, rim: 16, exposure: 1.05 },
};
function setLight(name) {
  const L = LIGHTS[name];
  scene.environment = L.envMap;
  scene.environmentIntensity = L.env;
  scene.background.set(L.bg);
  key.intensity = L.key; rimL.intensity = L.rim; rimR.intensity = L.rim * 0.8;
  renderer.toneMappingExposure = L.exposure;
  document.querySelectorAll('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === name)));
}

// ------------------------------------------------------------- model ----
const gltf = await new GLTFLoader().loadAsync('assets/models/floe.glb');
const guitar = gltf.scene;
prepareGuitar(guitar, renderer);
scene.add(guitar);

const all = new THREE.Box3().setFromObject(guitar, true);   // precise: BackHardware's loose box is far too big
const size = all.getSize(new THREE.Vector3());
const centre = all.getCenter(new THREE.Vector3());
floor.position.y = all.min.y - 0.002;

// lights sit around the guitar at its own scale
key.position.set(centre.x + 0.4, all.max.y + 0.9, centre.z + 1.2); key.target.position.copy(centre);
rimL.position.set(centre.x - 1.2, centre.y + 0.8, centre.z - 1.0); rimL.target.position.copy(centre);
rimR.position.set(centre.x + 1.3, centre.y + 0.3, centre.z - 0.9); rimR.target.position.copy(centre);

const parts = guitar.getObjectByName('KVELD_Floe')?.children.length ? guitar.getObjectByName('KVELD_Floe').children : guitar.children;
const byName = (n) => guitar.getObjectByName(n);
const boxOf = (...names) => {
  const b = new THREE.Box3();
  names.map(byName).filter(Boolean).forEach((o) => b.expandByObject(o, true));
  return b.isEmpty() ? all.clone() : b;
};

// ------------------------------------------------------------ framing ----
function frame(box, dir, pad = 1.35) {
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.length() / 2, 0.02);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = (r * pad) / Math.sin(Math.min(fov, fov * camera.aspect) / 2);
  const d = (dir || camera.position.clone().sub(controls.target)).clone().normalize();
  const to = c.clone().addScaledVector(d, dist);
  gsap.to(controls.target, { x: c.x, y: c.y, z: c.z, duration: 1.1, ease: 'expo.inOut' });
  gsap.to(camera.position, { x: to.x, y: to.y, z: to.z, duration: 1.1, ease: 'expo.inOut' });
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const VIEWS = [
  ['Whole', () => frame(all, V(0.35, 0.12, 1), 1.05)],
  ['Front', () => frame(all, V(0, 0, 1), 1.0)],
  ['Back', () => frame(all, V(0, 0, -1), 1.0)],
  ['Edge', () => frame(boxOf('Body'), V(1, 0.05, 0.12), 1.2)],
  ['Headstock', () => frame(boxOf('Tuners', 'Logo'), V(0.45, 0.1, 1), 1.05)],
  ['Nut', () => frame(boxOf('Nut'), V(0.5, 0.35, 1), 2.4)],
  ['Frets', () => frame(boxOf('Frets'), V(0.9, 0.1, 0.6), 0.75)],
  ['Pickups', () => frame(boxOf('NeckPickup', 'BridgePickup'), V(0.3, 0.15, 1), 1.1)],
  ['Bridge', () => frame(boxOf('Saddles', 'Bridge'), V(0.4, -0.35, 1), 1.0)],
  ['Controls', () => frame(boxOf('Controls'), V(0.3, 0.1, 1), 1.15)],
];
const views = document.querySelector('[data-views]');
VIEWS.forEach(([name, go]) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = name; b.addEventListener('click', go);
  views.appendChild(b);
});

// ------------------------------------------------------------- parts ----
const list = document.querySelector('[data-parts]');
parts.forEach((o) => {
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox" checked><span>${o.name.replace(/([a-z])([A-Z])/g, '$1 $2')}</span><em class="solo">solo</em>`;
  const box = label.querySelector('input');
  box.addEventListener('change', () => { o.visible = box.checked; });
  label.querySelector('span').addEventListener('click', (e) => { e.preventDefault(); frame(new THREE.Box3().setFromObject(o, true), null, 1.3); });
  label.querySelector('.solo').addEventListener('click', (e) => {
    e.preventDefault();
    const only = parts.every((p) => p === o || !p.visible);
    parts.forEach((p, i) => { p.visible = only || p === o; list.querySelectorAll('input')[i].checked = p.visible; });
  });
  list.appendChild(label);
});

// ------------------------------------------------------------- modes ----
document.querySelectorAll('[data-light]').forEach((b) => b.addEventListener('click', () => setLight(b.dataset.light)));
const wireBtn = document.querySelector('[data-wire]');
wireBtn.addEventListener('click', () => {
  const on = wireBtn.getAttribute('aria-pressed') !== 'true';
  wireBtn.setAttribute('aria-pressed', String(on));
  guitar.traverse((o) => { if (o.isMesh) o.material.wireframe = on; });
});
const turnBtn = document.querySelector('[data-turn]');
turnBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  turnBtn.setAttribute('aria-pressed', String(controls.autoRotate));
});
addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') VIEWS[0][1](); });

let tris = 0;
guitar.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
const inch = (m) => (m / 0.0254).toFixed(2);
document.querySelector('[data-stats]').innerHTML =
  `${parts.length} parts · ${Math.round(tris).toLocaleString('en')} triangles<br>${inch(size.y)} long × ${inch(size.x)} wide × ${inch(size.z)} deep, in`;

// ------------------------------------------------------------- start ----
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
setLight('studio');
controls.target.copy(centre);
camera.position.copy(centre).add(V(0.35, 0.12, 1).normalize().multiplyScalar(2.2));
VIEWS[0][1]();

renderer.setAnimationLoop(() => {
  controls.update();
  // the near plane follows the distance: a fixed 5 mm near plane spent the
  // depth buffer's precision up close and let touching surfaces flicker far away
  const d = camera.position.distanceTo(controls.target);
  const near = THREE.MathUtils.clamp(d * 0.02, 0.002, 0.2);
  if (Math.abs(near - camera.near) > near * 0.05) { camera.near = near; camera.far = d * 30 + 4; camera.updateProjectionMatrix(); }
  renderer.render(scene, camera);
});
window.__inspect = { camera, controls, guitar, frame, VIEWS };
