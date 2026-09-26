// Workshop maquettes for the six guitars that have not been drawn up yet.
// They stand in the ring so it reads full, in one clay material, and they
// get replaced one by one as each model is built from its plans.
//
// Frame (inches): x across with the bass side at -x, y up from the tail,
// z toward the front. Same orientation and origin as nimbus.glb.
import * as THREE from 'three';

const IN = 0.0254;

// Body outlines are approximations of each pattern's proportions, drawn
// clockwise from the tail. Smoothed with a closed Catmull-Rom below.
const SHAPES = {
  contoured: {
    body: [[0, 0], [3.5, 0.35], [5.6, 1.6], [6.35, 3.5], [6.3, 5.5], [5.6, 7.4], [4.75, 8.9], [4.6, 10.1], [5.0, 11.4], [5.1, 12.6],
      [4.7, 13.7], [4.0, 14.2], [3.4, 13.9], [2.6, 12.9], [1.9, 12.35], [1.12, 12.5], [-1.12, 12.5], [-1.9, 12.35], [-2.8, 13.4],
      [-3.5, 14.9], [-4.2, 15.6], [-4.9, 15.2], [-5.3, 13.9], [-5.25, 12.1], [-4.85, 10.4], [-4.85, 9.0], [-5.6, 7.4], [-6.3, 5.5],
      [-6.35, 3.5], [-5.6, 1.6], [-3.5, 0.35]],
    depth: 1.75, bevel: 0.22, scale: 25.5, bridgeY: 4.4, neckY: 12.5, head: 'six',
    pickups: [['sc', 6.05, -0.18], ['sc', 8.4, 0], ['sc', 10.75, 0]], knobs: [[2.7, 3.4], [3.4, 4.9], [3.8, 6.4]], bridge: 'trem',
  },
  offset: {
    body: [[0.2, 0.25], [3.4, 0.0], [5.9, 1.1], [7.0, 3.3], [6.9, 5.6], [6.0, 7.3], [5.3, 8.7], [5.4, 10.4], [5.7, 12.2], [5.4, 13.7],
      [4.6, 14.5], [3.8, 14.2], [2.9, 13.3], [1.95, 12.95], [1.12, 13.1], [-1.12, 13.1], [-2.0, 13.4], [-3.1, 14.6], [-4.0, 16.3],
      [-4.9, 16.9], [-5.8, 16.2], [-6.2, 14.6], [-6.0, 12.8], [-5.6, 11.3], [-6.2, 9.8], [-7.0, 7.8], [-7.3, 5.4], [-6.8, 3.0], [-5.3, 1.1], [-2.8, 0.45]],
    depth: 1.7, bevel: 0.2, scale: 25.5, bridgeY: 5.4, neckY: 13.1, head: 'six',
    pickups: [['wide', 7.1, 0], ['wide', 11.3, 0]], knobs: [[4.4, 4.1], [5.0, 5.4]], bridge: 'offset',
  },
  twinHorn: {
    body: [[0, 0], [3.8, 0.5], [5.9, 2.1], [6.45, 4.3], [6.1, 6.5], [5.2, 8.2], [4.8, 9.6], [5.1, 11.2], [5.2, 12.6], [4.8, 14.1],
      [4.1, 15.3], [3.5, 14.8], [2.8, 13.2], [1.9, 12.1], [1.12, 12.3], [-1.12, 12.3], [-1.9, 12.1], [-2.8, 13.3], [-3.6, 15.0],
      [-4.2, 15.6], [-4.9, 14.3], [-5.2, 12.6], [-5.1, 11.2], [-4.8, 9.6], [-5.2, 8.2], [-6.1, 6.5], [-6.45, 4.3], [-5.9, 2.1], [-3.8, 0.5]],
    depth: 1.38, bevel: 0.16, scale: 24.75, bridgeY: 4.3, neckY: 12.3, head: 'three',
    pickups: [['hb', 5.7, 0], ['hb', 10.3, 0]], knobs: [[3.0, 2.3], [4.2, 3.1], [2.7, 3.9], [3.9, 4.8]], bridge: 'tom',
  },
  semiHollow: {
    body: [[0, 0], [4.2, 0.5], [6.8, 2.3], [7.95, 5.2], [7.6, 8.0], [6.3, 9.9], [5.7, 11.0], [6.1, 12.4], [6.6, 14.2], [6.5, 16.1],
      [5.7, 17.9], [4.6, 18.8], [3.7, 18.5], [3.0, 17.1], [2.2, 16.2], [1.15, 16.4], [-1.15, 16.4], [-2.2, 16.2], [-3.0, 17.1],
      [-3.7, 18.5], [-4.6, 18.8], [-5.7, 17.9], [-6.5, 16.1], [-6.6, 14.2], [-6.1, 12.4], [-5.7, 11.0], [-6.3, 9.9], [-7.6, 8.0],
      [-7.95, 5.2], [-6.8, 2.3], [-4.2, 0.5]],
    holes: [
      [[4.55, 6.0], [4.8, 7.4], [4.7, 9.6], [4.35, 11.8], [4.15, 12.6], [3.95, 11.8], [4.25, 9.6], [4.3, 7.4]],
      [[-4.55, 6.0], [-4.3, 7.4], [-4.25, 9.6], [-3.95, 11.8], [-4.15, 12.6], [-4.35, 11.8], [-4.7, 9.6], [-4.8, 7.4]],
    ],
    depth: 1.75, bevel: 0.2, scale: 24.75, bridgeY: 6.1, neckY: 16.4, head: 'three',
    pickups: [['hb', 7.6, 0], ['hb', 12.2, 0]], knobs: [[3.6, 3.5], [5.1, 4.0], [3.4, 5.1], [4.9, 5.6]], bridge: 'tom',
  },
  doublecutCarved: {
    body: [[0, 0], [3.6, 0.4], [5.7, 1.9], [6.55, 4.2], [6.3, 6.6], [5.3, 8.5], [4.7, 10.0], [4.9, 11.7], [5.1, 13.2], [4.7, 14.8],
      [3.8, 15.8], [3.1, 15.5], [2.5, 14.3], [1.7, 13.4], [1.1, 13.6], [-1.1, 13.6], [-1.8, 13.5], [-2.6, 14.8], [-3.5, 16.4],
      [-4.3, 16.9], [-5.0, 16.1], [-5.2, 14.4], [-5.0, 12.5], [-4.7, 10.4], [-5.4, 8.5], [-6.3, 6.6], [-6.55, 4.2], [-5.7, 1.9], [-3.6, 0.4]],
    depth: 2.1, bevel: 0.42, scale: 25, bridgeY: 4.5, neckY: 13.6, head: 'three',
    pickups: [['hb', 6.1, 0], ['hb', 10.7, 0]], knobs: [[3.6, 3.2], [4.4, 4.6]], bridge: 'wrap',
  },
  singlecutCarved: {
    body: [[0, 0], [3.7, 0.4], [5.8, 1.9], [6.5, 4.2], [6.35, 6.6], [5.5, 8.6], [4.8, 10.1], [4.9, 11.6], [5.0, 13.2], [4.6, 14.9],
      [3.9, 16.1], [3.2, 16.4], [2.7, 16.0], [2.0, 14.9], [1.5, 14.3], [1.1, 14.9], [1.05, 16.2], [-0.2, 16.9], [-1.4, 17.15],
      [-2.7, 17.2], [-4.0, 16.6], [-5.0, 15.3], [-5.2, 13.4], [-4.9, 11.6], [-4.8, 10.1], [-5.5, 8.6], [-6.35, 6.6], [-6.5, 4.2],
      [-5.8, 1.9], [-3.7, 0.4]],
    depth: 2.2, bevel: 0.46, scale: 24.75, bridgeY: 4.9, neckY: 16.2, head: 'three',
    pickups: [['hb', 6.4, 0], ['hb', 11.1, 0]], knobs: [[3.6, 2.9], [4.9, 3.8], [3.3, 4.5], [4.6, 5.4]], bridge: 'tom', switchAt: [-4.1, 14.6],
  },
};

// HALDEN headstocks, shared across the range: six in line for bolt-ons (the
// same outline as the Nimbus), three a side for glued-in necks.
const HEAD_SIX = [[0.12, 0.826], [0.40, 0.85], [0.75, 0.98], [1.10, 1.21], [1.45, 1.355], [2.3, 1.104], [3.2, 0.829], [4.1, 0.555],
  [5.0, 0.28], [5.8, 0.036], [6.35, -0.13], [6.85, -0.27], [7.14, -0.45], [7.27, -0.68], [7.21, -0.92], [7.0, -1.075], [6.6, -1.145],
  [5.8, -1.14], [4.8, -1.06], [3.8, -1.005], [2.8, -1.0], [1.9, -1.005], [1.2, -0.975], [0.7, -0.905], [0.35, -0.85], [0.12, -0.826]]
  .map(([h, y]) => [-y, h]);
const HEAD_SIX_POSTS = [[1.689, 0.8], [2.593, 0.524], [3.497, 0.248], [4.4, -0.029], [5.304, -0.305], [6.208, -0.581]];
const HEAD_THREE_SIDE = [[0.86, 0.0], [0.96, 0.6], [1.36, 1.6], [1.74, 3.2], [1.84, 4.8], [1.72, 6.2], [1.36, 7.0], [0.72, 7.28], [0.0, 7.02]];
const HEAD_THREE = [...HEAD_THREE_SIDE, ...HEAD_THREE_SIDE.slice(0, -1).reverse().map(([x, y]) => [-x, y])];

function catmull(pts, per = 8) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push(new THREE.Vector2(
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ));
    }
  }
  return out;
}

function slab(points, depth, bevel, holes = []) {
  const shape = new THREE.Shape(points);
  for (const h of holes) shape.holes.push(new THREE.Path(h));
  const inner = Math.max(depth - 2 * bevel, 0.01);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: inner, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85,
    bevelOffset: -bevel * 0.85, bevelSegments: 5, curveSegments: 4, steps: 1,
  });
  geo.translate(0, 0, -inner / 2);
  geo.computeVertexNormals();
  return geo;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s.getPoints(6);
}

function block(w, h, d, r, mat) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(roundedRect(w, h, r)), {
    depth: d, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelOffset: -0.04, bevelSegments: 2, curveSegments: 4,
  });
  return new THREE.Mesh(geo, mat);
}

export function buildStandin(shapeId, clay, graphite) {
  const S = SHAPES[shapeId];
  const g = new THREE.Group();
  const front = S.depth / 2;

  const holes = (S.holes || []).map((h) => catmull(h, 6));
  const body = new THREE.Mesh(slab(catmull(S.body, 10), S.depth, S.bevel, holes), clay);
  g.add(body);

  // neck: from inside the body up to the nut, tapering 2.2 in to 1.69 in
  const nutY = S.bridgeY + S.scale;
  const neckStart = S.neckY - 2.6;
  const neckPts = [[-1.1, neckStart], [1.1, neckStart], [0.845, nutY], [-0.845, nutY]].map(([x, y]) => new THREE.Vector2(x, y));
  const neck = new THREE.Mesh(slab(neckPts, 0.86, 0.1), clay);
  neck.position.z = front + 0.42 - 0.43;
  g.add(neck);

  // headstock
  const six = S.head === 'six';
  const head = new THREE.Group();
  head.position.set(0, nutY, front + (six ? -0.02 : 0.1));
  const hs = new THREE.Mesh(slab((six ? HEAD_SIX : HEAD_THREE).map(([x, y]) => new THREE.Vector2(x, y)), 0.56, 0.08), clay);
  head.add(hs);
  const postGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.46, 16);
  const keyGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 20);
  const posts = six
    ? HEAD_SIX_POSTS.map(([x, y]) => [-y, x - 0.0, -(y + 1.13)])
    : [1.6, 3.3, 5.0].flatMap((y) => [[-1.22, y, -2.3], [1.22, y, 2.3]]);
  for (const [px, py, kx] of posts) {
    const post = new THREE.Mesh(postGeo, graphite);
    post.rotation.x = Math.PI / 2; post.position.set(px, py, 0.5);
    const key = new THREE.Mesh(keyGeo, graphite);
    key.rotation.z = Math.PI / 2; key.position.set(kx, py, -0.2);
    head.add(post, key);
  }
  if (!six) head.rotation.x = -0.24;           // glued-in necks tilt the head back
  g.add(head);

  // pickups, bridge and controls in graphite
  const pu = { sc: [2.72, 0.72, 0.1], hb: [2.8, 1.5, 0.14], wide: [3.5, 1.35, 0.18] };
  for (const [type, y, ang] of S.pickups) {
    const [w, h, r] = pu[type];
    const m = block(w, h, 0.26, r, graphite);
    m.position.set(0, y, front - 0.02); m.rotation.z = ang;
    g.add(m);
  }
  const bridges = {
    trem: [[2.3, 0.95, 0.3, 0]],
    tom: [[3.1, 0.34, 0.55, 0], [3.3, 0.46, 0.46, -1.4]],
    wrap: [[3.3, 0.6, 0.5, 0]],
    offset: [[2.4, 0.4, 0.5, 0], [2.3, 1.7, 0.28, -2.7]],
  };
  for (const [w, h, d, dy] of bridges[S.bridge]) {
    const m = block(w, h, d, 0.12, graphite);
    m.position.set(0, S.bridgeY + dy, front - 0.02);
    g.add(m);
  }
  const knobGeo = new THREE.CylinderGeometry(0.34, 0.37, 0.5, 28);
  for (const [x, y] of S.knobs) {
    const k = new THREE.Mesh(knobGeo, graphite);
    k.rotation.x = Math.PI / 2; k.position.set(x, y, front + 0.2);
    g.add(k);
  }
  if (S.switchAt) {
    const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 12), graphite);
    sw.rotation.x = Math.PI / 2; sw.position.set(S.switchAt[0], S.switchAt[1], front + 0.35);
    g.add(sw);
  }

  // six faint strings so the maquettes still read as instruments
  const strMat = new THREE.MeshBasicMaterial({ color: 0x5c5751 });
  for (let i = 0; i < 6; i++) {
    const xb = -1.06 + i * 0.425, xn = -0.705 + i * 0.282;
    const a = new THREE.Vector3(xb, S.bridgeY, front + 0.5), b = new THREE.Vector3(xn, nutY, front + 0.47);
    const len = a.distanceTo(b);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 4), strMat);
    s.position.copy(a).lerp(b, 0.5);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(s);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(IN);
  const holder = new THREE.Group();          // origin at the tail, like the GLB
  holder.add(g);
  return holder;
}
