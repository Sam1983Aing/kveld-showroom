// Shared by the showroom and the workshop viewer: how a guitar GLB is prepared
// for rendering, and the product-studio light that its gloss reflects.
import * as THREE from 'three';

// Parts that lie on another surface (inlays, logo, dark holes, the walnut
// stripe). The model keeps them 0.1 mm clear already; the polygon offset makes
// sure they still win the depth test from across the room.
const DECALS = new Set(['Dot_Black', 'Logo_Black', 'Hole_Dark', 'Walnut']);

// Wound strings are smooth tubes in the model. Up close (the walk's nut and
// bridge stops) the winding is drawn here instead: a ridge every 0.35 mm
// along the string, bent into the normal, faded out once a ridge gets
// smaller than a couple of pixels so it never shimmers from across the room.
// The strings run along the mesh's own x axis (the build's modelling frame).
const WINDING = 0.00035;   // metres per turn of the wrap wire
function windStrings(m) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float vAlong;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nvAlong = position.x;');
    shader.fragmentShader = 'varying float vAlong;\n' + shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        float ph = vAlong / ${WINDING.toFixed(5)};
        float amp = 1.0 - smoothstep(0.18, 0.45, fwidth(ph));
        if (amp > 0.0) {
          // surface gradient of the distance along the string = the string's direction on screen
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1);
          vec3 along = (dFdx(vAlong) * r1 + dFdy(vAlong) * r2) / (abs(det) > 1e-12 ? det : 1e-12);
          normal = normalize(normal - 0.75 * amp * cos(ph * 6.2831853) * along / max(length(along), 1e-6));
        }
      }`);
  };
  m.customProgramCacheKey = () => 'wound';
}

export function prepareGuitar(root, renderer, { envMapIntensity = 1.0 } = {}) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const m = o.material;
    for (const k of ['map', 'normalMap', 'roughnessMap', 'clearcoatNormalMap']) if (m[k]) m[k].anisotropy = aniso;
    m.envMapIntensity = envMapIntensity;
    if (m.name === 'String_Wound') windStrings(m);
    if (DECALS.has(m.name)) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
      m.polygonOffsetUnits = -4;
    }
  });
  return root;
}

// A dark studio with long softboxes, the way instruments are photographed:
// the strips draw clean highlight lines down the clear coat and the chrome.
export function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  // a warm grey room, darker above: chrome needs something to reflect or it reads black
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color('#24201d') }, mid: { value: new THREE.Color('#3a3531') }, low: { value: new THREE.Color('#5a534c') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, low; varying vec3 vP;
      void main(){ float h = normalize(vP).y;
        vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, low, smoothstep(0.0, -0.35, h));
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  env.add(room);
  const box = (w, h, color, k, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); env.add(m);
  };
  box(1.0, 7, '#fff3e2', 10, [-3.6, 1.5, 2.4], [0, 1, 0]);   // tall key strip, front left
  box(0.35, 7, '#fff8f0', 12, [2.4, 1.5, 3.4], [0, 1, 0]);   // thin strip, front right: a crisp line
  box(0.5, 7, '#f4f6ff', 6, [3.8, 1.5, -1.4], [0, 1, 0]);    // rim strip, back right
  box(6, 2.4, '#fffaf2', 5, [0, 5.5, 0.8], [0, 0, 0]);       // overhead
  box(10, 3.5, '#fff4e6', 1.4, [0, 1.2, 7], [0, 1, 0]);      // soft front fill
  box(10, 0.3, '#ffdcb0', 3, [0, 0.5, -6.5], [0, 0.5, 0]);   // warm horizon line behind
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}
