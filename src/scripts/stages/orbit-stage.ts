/**
 * Orbit stage — the hero/Orbit WebGL scene.
 *
 * Earth: NASA Blue Marble (day) + Black Marble (night) blended across the
 * terminator in a small custom shader, with a fresnel atmosphere shell.
 * Satellite: an original procedural flat-panel spacecraft (./satellite.ts) with
 * canvas-drawn PBR maps. The hero frames it in close-up; scrolling pulls back to
 * the orbit view. Bloom + a subtle lens pass give it a photographic finish.
 * Orbital shells: three inclined circular orbits with moving nodes; the highlighted
 * one is the 550 km reference SSO used by the HUD.
 *
 * Rendering is on demand: frames are drawn only while the stage is on screen; with
 * reduced motion, frames are drawn only when scroll progress changes.
 *
 * Environment-agnostic: the same module runs inside a Web Worker on an
 * OffscreenCanvas (preferred — keeps all WebGL work off the main thread) or on the
 * main thread as a fallback. It must not touch window/document/Image.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HalfFloatType,
  HemisphereLight,
  Line,
  LinearSRGBColorSpace,
  LineSegments,
  Matrix4,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  Texture,
  type Material,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { clamp, damp, easeInOutCubic, lerp, range } from '../core/math';
import { buildSatellite } from './satellite';

export interface OrbitStage {
  setProgress(p: number): void;
  setActive(active: boolean): void;
  setPointer(x: number, y: number): void;
  setHidden(hidden: boolean): void;
  resize(width: number, height: number): void;
  dispose(): void;
  readonly ready: Promise<void>;
  /** Frames rendered so far (used by QA to verify the loop idles off-screen). */
  readonly frames: number;
}

export interface StageOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
  reducedMotion: boolean;
  coarse: boolean;
  /** Texture resolution: '1k' for small/touch screens, '2k' otherwise. */
  textureSize: '1k' | '2k';
  /** Absolute base URL for texture fetches (workers have no document base). */
  baseUrl: string;
  onFirstFrame?: () => void;
  onContextLost?: () => void;
}

const raf: (cb: (t: number) => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
const cancelRaf = (id: number): void =>
  typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id);

const SUN_DIR = new Vector3(0.9, -0.05, -1).normalize();
const SSO_R = 1 + 550 / 6378.137; // reference orbit radius in Earth radii
const DEG = Math.PI / 180;

/* -------------------------------------------------------------- earth -- */

const earthMaterial = (day: Texture, night: Texture): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { dayMap: { value: day }, nightMap: { value: night }, sunDir: { value: SUN_DIR }, uLights: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform vec3 sunDir;
      uniform float uLights;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float ndl = dot(normalize(vN), sunDir);
        float dayMix = smoothstep(-0.12, 0.22, ndl);
        vec3 day = texture2D(dayMap, vUv).rgb * (0.04 + max(ndl, 0.0) * 1.25);
        vec3 nightTex = texture2D(nightMap, vUv).rgb;
        float lights = pow(smoothstep(0.03, 0.75, dot(nightTex, vec3(0.33))), 1.4);
        vec3 night = vec3(1.0, 0.74, 0.46) * lights * 1.1 * uLights + nightTex * 0.035;
        vec3 col = mix(night, day, dayMix);
        float fres = pow(1.0 - max(dot(normalize(vN), vView), 0.0), 3.0);
        float twilight = smoothstep(-0.35, 0.25, ndl);
        col += vec3(0.28, 0.52, 1.0) * fres * twilight * 0.9;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

const atmosphereMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir;
      uniform float uFade;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        if (uFade < 0.001) discard;
        float rim = pow(clamp(1.0 + dot(vView, normalize(vN)), 0.0, 1.0), 2.6);
        float lit = smoothstep(-0.45, 0.55, dot(normalize(vN), sunDir));
        vec3 col = mix(vec3(0.05, 0.12, 0.3), vec3(0.4, 0.66, 1.0), lit);
        gl_FragColor = vec4(col * rim * (0.25 + lit * 1.6) * uFade, 1.0);
      }`,
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

/* ------------------------------------------------------ orbital shells -- */

interface Shell {
  r: number;
  inc: number;
  raan: number;
  nodes: number;
  speed: number;
  color: string;
  opacity: number;
}
const SHELLS: Shell[] = [
  { r: SSO_R, inc: 97.6, raan: -60, nodes: 7, speed: 0.05, color: '#ff5a1f', opacity: 0.85 },
  { r: 1.13, inc: 53, raan: 20, nodes: 9, speed: 0.042, color: '#9aa4af', opacity: 0.32 },
  { r: 1.19, inc: 70, raan: 75, nodes: 8, speed: 0.036, color: '#9aa4af', opacity: 0.22 },
];

const shellPoint = (s: Shell, u: number, out = new Vector3()): Vector3 => {
  // Perifocal circle → rotate by inclination (about x) then RAAN (about y, our "pole").
  const x = Math.cos(u) * s.r;
  const z = Math.sin(u) * s.r;
  const i = s.inc * DEG;
  const o = s.raan * DEG;
  const y1 = -z * Math.sin(i);
  const z1 = z * Math.cos(i);
  return out.set(x * Math.cos(o) + z1 * Math.sin(o), y1, -x * Math.sin(o) + z1 * Math.cos(o));
};

/* ------------------------------------------------------- camera path -- */

// Keyframes: [progress, camera position, look target]
const PATH: [number, Vector3, Vector3][] = [
  [0.0, new Vector3(0.0, 0.62, 2.55), new Vector3(0.0, 0.98, 0)],
  [0.22, new Vector3(0.08, 0.78, 2.15), new Vector3(0.05, 1.04, 0)],
  [0.5, new Vector3(0.32, 1.12, 1.25), new Vector3(0.24, 1.08, 0.52)],
  [1.0, new Vector3(0.36, 1.14, 1.02), new Vector3(0.21, 1.09, 0.56)],
];

const samplePath = (p: number, pos: Vector3, look: Vector3): void => {
  for (let k = 0; k < PATH.length - 1; k++) {
    const [p0, a0, l0] = PATH[k];
    const [p1, a1, l1] = PATH[k + 1];
    if (p <= p1 || k === PATH.length - 2) {
      const t = easeInOutCubic(range(p, p0, p1));
      pos.lerpVectors(a0, a1, t);
      look.lerpVectors(l0, l1, t);
      return;
    }
  }
};

/* ------------------------------------------------------- lens + hero -- */

/** Final lens pass (linear HDR, before tone mapping): radial chromatic
 *  aberration toward the frame edges and a soft vignette. */
const LensShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.0014 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * r2 * uAmount * 8.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      c *= 1.0 - smoothstep(0.18, 0.75, r2) * 0.55;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

/** Satellite attitude in hero-camera space: array direction (-Y) and tile-face
 *  normal (+Z), tuned against the reference composition. */
const HERO_ARRAY = new Vector3(0.65, -0.65, 0.3);
const HERO_FACE = new Vector3(0.35, 0.1, 1);
/** Where the bus centre sits on screen (NDC) and the camera distance to it. */
const HERO_NDC = new Vector2(0.12, 0.13);
const HERO_DIST = 0.19;

/** Plexus nodes: screen positions (NDC, reference layout) unprojected onto the
 *  satellite's depth plane, then carried by the satellite. Pairs index the nodes. */
const PLEX_NODES: [number, number, number][] = [
  [-0.12, 0.44, 0], [-0.15, -0.03, 0.01], [0.1, -0.1, -0.01], [-0.05, -0.54, 0.02], [0.22, 0.52, -0.01], [0.28, 0.34, 0],
  [0.35, 0.35, -0.02], [0.37, 0.22, -0.01], [0.26, 0.21, 0], [0.35, -0.02, -0.02], [0.57, -0.04, -0.03], [-0.02, 0.48, 0],
];
const PLEX_LINKS: [number, number][] = [
  [0, 1], [1, 3], [1, 2], [2, 3], [4, 11], [4, 5], [5, 6], [6, 7], [7, 8], [8, 5], [7, 9], [9, 10], [6, 10], [8, 9], [0, 11], [5, 2],
];

/** Cross-shaped ("+") point sprites for the plexus nodes. */
const crossMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { uOpacity: { value: 1 }, uSize: { value: 16 } },
    vertexShader: /* glsl */ `
      uniform float uSize;
      void main() { gl_PointSize = uSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        vec2 p = abs(gl_PointCoord - 0.5);
        float a = max(step(p.x, 0.035) , step(p.y, 0.035));
        if (a < 0.5) discard;
        gl_FragColor = vec4(vec3(1.0), uOpacity);
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

/* -------------------------------------------------------------- stage -- */

export const createOrbitStage = (opts: StageOptions): OrbitStage => {
  const { canvas, reducedMotion, coarse, onFirstFrame, onContextLost } = opts;
  const renderer = new WebGLRenderer({ canvas, antialias: opts.dpr < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(opts.dpr, coarse ? 1.25 : 1.75));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  // The clear colour now passes through tone mapping (OutputPass), which lifts very
  // dark values; this linear value lands on the page's --void (#05070a).
  renderer.setClearColor(new Color().setRGB(0.0005, 0.00068, 0.001, LinearSRGBColorSpace));

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.005, 100);

  // Hero camera basis (fixed directions; only the screen offset depends on aspect).
  const S = new Vector3();
  const heroF = new Vector3();
  const heroR = new Vector3();
  const heroU = new Vector3();
  const heroB = new Vector3();

  // Environment, prefiltered for reflections: a cloud-flecked Earth below, a warm
  // scattered-sunlight haze up-left of the hero view and a faint cool fill.
  const envMat = new ShaderMaterial({
    side: BackSide,
    uniforms: { uDown: { value: new Vector3(0, -1, 0) }, uWarm: { value: new Vector3() }, uFront: { value: new Vector3() } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDown; uniform vec3 uWarm; uniform vec3 uFront;
      varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float nz(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        float down = smoothstep(-0.1, 0.8, dot(vP, uDown));
        float cl = nz(vP*6.0)*0.6 + nz(vP*14.0)*0.4;
        vec3 earth = mix(vec3(0.03,0.09,0.24), vec3(0.45,0.55,0.7), smoothstep(0.5,0.85,cl));
        vec3 c = earth * down;
        c += vec3(1.0,0.55,0.25) * pow(max(dot(vP, uWarm), 0.0), 6.0) * 1.4;
        // In front of the hero view: more cloud-flecked planet light, so the
        // anodised bus reads as polished metal rather than flat paint.
        c += earth * 0.8 * smoothstep(-0.2, 0.9, dot(vP, uFront));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const envScene = new Scene();
  envScene.add(new Mesh(new SphereGeometry(10, 64, 32), envMat));
  scene.environmentIntensity = 2;
  const yieldTask = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  // Scene lights only affect the spacecraft (the Earth is shaded by its own shader).
  // Hero lights sit in hero-camera space (warm key up-left, cool Earth fill from
  // below); the orbit lights (sun rim + key) take over as the camera pulls back.
  const heroKey = new DirectionalLight('#ffd9b0', 1.6);
  const heroFill = new DirectionalLight('#9fb8ff', 0.8);
  scene.add(heroKey, heroFill);
  const sun = new DirectionalLight('#fff4e6', 2.4);
  sun.position.copy(SUN_DIR).multiplyScalar(10);
  scene.add(sun);
  const key = new DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 6, 7);
  scene.add(key);
  const hemi = new HemisphereLight('#000000', '#1b3a66', 0.6);
  scene.add(hemi);

  // Earth. Textures are decoded with createImageBitmap (off the main thread in a
  // worker, and asynchronous on the main thread too).
  const load = async (path: string): Promise<Texture> => {
    const res = await fetch(new URL(path, opts.baseUrl));
    if (!res.ok) throw new Error(`texture ${path}: ${res.status}`);
    const bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'flipY' });
    const t = new Texture(bmp as unknown as HTMLImageElement);
    t.flipY = false; // already flipped during decode
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  const earth = new Group();
  earth.rotation.z = 23.4 * DEG * 0.4;
  scene.add(earth);
  const globe = new Mesh<SphereGeometry, Material>(new SphereGeometry(1, 128, 96), new MeshBasicMaterial({ color: '#05070a' }));
  globe.rotation.y = -2.2;
  earth.add(globe);
  const atmo = new Mesh(new SphereGeometry(1.035, 96, 64), atmosphereMaterial());
  scene.add(atmo);

  // Stars: sparse and dim — context, not decoration.
  const starGeo = new BufferGeometry();
  const N = 900;
  const sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = new Vector3().randomDirection().multiplyScalar(40);
    if (v.y < -8) v.y = -v.y; // keep stars above the planet
    sp.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new BufferAttribute(sp, 3));
  scene.add(new Points(starGeo, new PointsMaterial({ color: '#cfd6de', size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.55 })));

  // Shells + nodes
  const shellNodes: { shell: Shell; geo: BufferGeometry; arr: Float32Array }[] = [];
  const shellMats: { mat: LineBasicMaterial | PointsMaterial; base: number }[] = [];
  for (const s of SHELLS) {
    const ring = new Float32Array(257 * 3);
    const v = new Vector3();
    for (let k = 0; k <= 256; k++) {
      shellPoint(s, (k / 256) * Math.PI * 2, v);
      ring.set([v.x, v.y, v.z], k * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(ring, 3));
    const ringMat = new LineBasicMaterial({ color: s.color, transparent: true, opacity: s.opacity, depthWrite: false });
    shellMats.push({ mat: ringMat, base: s.opacity });
    scene.add(new LineLoop(g, ringMat));
    const arr = new Float32Array(s.nodes * 3);
    const ng = new BufferGeometry();
    ng.setAttribute('position', new BufferAttribute(arr, 3));
    const nodeMat = new PointsMaterial({ color: s.color, size: coarse ? 4 : 5, sizeAttenuation: false, transparent: true, opacity: Math.min(1, s.opacity + 0.35) });
    shellMats.push({ mat: nodeMat, base: nodeMat.opacity });
    scene.add(new Points(ng, nodeMat));
    shellNodes.push({ shell: s, geo: ng, arr });
  }

  // Satellite on the reference orbit
  const satAnchor = new Group();
  const satU = 5.187; // places the spacecraft on the visible limb
  shellPoint(SHELLS[0], satU, S);
  satAnchor.position.copy(S);
  scene.add(satAnchor);
  const sat = buildSatellite();
  const SAT_SCALE = 0.026;
  sat.scale.setScalar(SAT_SCALE);
  const drift = new Group(); // slow attitude drift, applied on top of the hero attitude
  satAnchor.add(drift);
  drift.add(sat);

  // Hero camera: looks along the orbit, pitched so the atmosphere limb just enters
  // the bottom of the frame while the planet itself stays below it.
  const up = S.clone().normalize();
  const PITCH = 6 * DEG;
  heroF.set(0, 0, -1).addScaledVector(up, up.z).normalize();
  heroF.multiplyScalar(Math.cos(PITCH)).addScaledVector(up, Math.sin(PITCH)).normalize();
  heroB.copy(heroF).negate();
  heroR.crossVectors(new Vector3(0, 1, 0), heroB).normalize(); // matches Object3D.lookAt
  heroU.crossVectors(heroB, heroR);
  const toWorld = (v: Vector3): Vector3 =>
    new Vector3().addScaledVector(heroR, v.x).addScaledVector(heroU, v.y).addScaledVector(heroB, v.z);
  {
    const yv = HERO_ARRAY.clone().normalize();
    const zv = HERO_FACE.clone().addScaledVector(yv, -HERO_FACE.dot(yv)).normalize();
    const xv = new Vector3().crossVectors(yv, zv);
    satAnchor.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(toWorld(xv), toWorld(yv), toWorld(zv)));
  }
  envMat.uniforms.uDown.value.copy(up).negate();
  envMat.uniforms.uWarm.value.copy(toWorld(new Vector3(-0.6, 0.6, 0.5).normalize()));
  envMat.uniforms.uFront.value.copy(heroB);
  heroKey.position.copy(toWorld(new Vector3(-4, 5, 3)));
  heroFill.position.copy(toWorld(new Vector3(3, -4, 4)));
  // Prefilter the environment in its own task so boot work is split into short tasks.
  const envReady = yieldTask().then(() => {
    const pmrem = new PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
  });

  const heroCam = new Vector3();
  const heroLook = new Vector3();
  const frameHero = (aspect: number, fov: number, push: number, tilt: number): void => {
    const t = Math.tan((fov * DEG) / 2);
    const d = HERO_DIST * push;
    heroCam.copy(S).addScaledVector(heroF, -d).addScaledVector(heroR, -HERO_NDC.x * d * t * aspect).addScaledVector(heroU, -HERO_NDC.y * d * t);
    // Portrait's taller field of view would bring the planet into frame: look up a little.
    heroLook.copy(heroCam).add(heroF).addScaledVector(heroU, tilt * 0.14);
    PATH[0][1].copy(heroCam);
    PATH[0][2].copy(heroLook);
    PATH[1][1].copy(heroCam).addScaledVector(heroF, -d * 0.35).addScaledVector(heroU, d * 0.08);
    PATH[1][2].copy(heroLook).addScaledVector(heroF, -d * 0.35);
  };

  // Plexus: thin lines and "+" nodes riding with the spacecraft in the hero shot.
  const plexus = new Group();
  const plexMat = new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthTest: false, depthWrite: false, toneMapped: false });
  const crossMat = crossMaterial();
  // Node positions are laid out once against the desktop framing (16:10, 34°) and
  // stored in the spacecraft's frame, so every viewport shows the same figure.
  const buildPlexus = (): void => {
    const t = Math.tan(17 * DEG);
    const aspect = 1.6;
    const cam = S.clone().addScaledVector(heroF, -HERO_DIST).addScaledVector(heroR, -0.12 * HERO_DIST * t * aspect).addScaledVector(heroU, -0.13 * HERO_DIST * t);
    satAnchor.updateMatrixWorld();
    const inv = new Matrix4().copy(satAnchor.matrixWorld).invert();
    const pts = PLEX_NODES.map(([nx, ny, dz]) => {
      const d = HERO_DIST * (1 + dz * 10);
      const w = cam.clone().addScaledVector(heroF, d).addScaledVector(heroR, nx * d * t * aspect).addScaledVector(heroU, ny * d * t);
      return w.applyMatrix4(inv);
    });
    const lp = new Float32Array(PLEX_LINKS.length * 6);
    PLEX_LINKS.forEach(([a, b], i) => lp.set([pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z], i * 6));
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(lp, 3));
    const np = new Float32Array(pts.length * 3);
    pts.forEach((v, i) => np.set([v.x, v.y, v.z], i * 3));
    const ng = new BufferGeometry();
    ng.setAttribute('position', new BufferAttribute(np, 3));
    plexus.add(new LineSegments(lg, plexMat), new Points(ng, crossMat));
  };
  buildPlexus();
  // Drawn in its own pass after the lens effects, so the lines stay crisp and white.
  const plexScene = new Scene();
  plexus.matrixAutoUpdate = false;
  plexScene.add(plexus);

  // End-of-path framing is defined relative to the spacecraft.
  PATH[2][1].copy(S).add(new Vector3(0.18, 0.17, 0.7));
  PATH[2][2].copy(S).add(new Vector3(-0.06, -0.05, 0));
  PATH[3][1].copy(S).add(new Vector3(0.12, 0.12, 0.5));
  PATH[3][2].copy(S).add(new Vector3(-0.1, -0.05, 0));

  // A thin ground-track ray from satellite to the surface
  const rayGeo = new BufferGeometry().setFromPoints([satAnchor.position.clone(), satAnchor.position.clone().normalize()]);
  const ray = new Line(rayGeo, new LineBasicMaterial({ color: '#ff5a1f', transparent: true, opacity: 0 }));
  scene.add(ray);

  /* ---- state ---- */
  let target = 0;
  let current = 0;
  let active = false;
  let rafId = 0;
  let last = 0;
  let time = 0;
  let firstFrame = false;
  let texturesReady = false;
  let frames = 0;
  const pointer = new Vector2();
  const pSmooth = new Vector2();
  const camPos = new Vector3();
  const camLook = new Vector3();
  const tmp = new Vector3();
  // Portrait framing: lift the spacecraft into the upper half, above the copy.
  const portraitShift = new Vector3();
  let portrait = 0;

  let hidden = false;
  let lost = false;

  // Post-processing: HDR render → bloom → lens (CA + vignette) → tone map/sRGB.
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.texture.type = HalfFloatType;
  composer.renderTarget2.texture.type = HalfFloatType;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.3, 0.25, 0.9);
  composer.addPass(bloom);
  const lens = new ShaderPass(LensShader);
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  const resize = (w: number, h: number): void => {
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    // Bloom at reduced resolution: it is a soft effect and this saves fill rate.
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    // Portrait screens: widen the field of view so the composition holds.
    camera.fov = w / h < 0.8 ? 52 : w / h < 1.2 ? 42 : 34;
    portrait = w / h < 0.8 ? 1 : w / h < 1.2 ? 0.5 : 0;
    camera.updateProjectionMatrix();
    // Narrow screens: step back so the whole wing fits above the copy.
    HERO_NDC.set(lerp(0.12, 0.2, portrait), lerp(0.13, 0.5, portrait));
    frameHero(camera.aspect, camera.fov, 1 + portrait * 0.6, portrait);
    crossMat.uniforms.uSize.value = coarse ? 12 : 16;
  };
  resize(opts.width, opts.height);

  const render = (dt: number): void => {
    if (!reducedMotion) time += dt;
    current += (target - current) * (reducedMotion ? 1 : damp(0.12, dt));
    const p = current;
    samplePath(p, camPos, camLook);
    const k = range(p, 0.3, 0.5) * portrait;
    portraitShift.set(0.09 * k, -0.11 * k, 0);
    camLook.add(portraitShift);
    camPos.addScaledVector(portraitShift, -0.2);
    pSmooth.lerp(pointer, reducedMotion ? 1 : damp(0.06, dt));
    // Parallax scales with distance to the spacecraft (tiny in the close-up).
    const par = lerp(0.006, 0.05, range(p, 0, 0.5)) * (1 - p * 0.6);
    camPos.addScaledVector(heroR, pSmooth.x * par);
    camPos.addScaledVector(heroU, pSmooth.y * par * 0.6);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    const hero = 1 - range(p, 0.05, 0.4);
    globe.rotation.y = -2.2 + time * 0.012;
    drift.rotation.set(Math.sin(time * 0.18) * 0.03, Math.sin(time * 0.13) * 0.04, Math.sin(time * 0.25) * 0.02);
    heroKey.intensity = 1.6 * hero;
    heroFill.intensity = 0.8 * hero;
    sun.intensity = 2.4 * (1 - hero);
    key.intensity = 2.2 * (1 - hero);
    hemi.intensity = 0.6 * (1 - hero);
    const plex = 1 - range(p, 0.04, 0.2);
    plexus.visible = plex > 0.001;
    plexMat.opacity = 0.42 * plex;
    crossMat.uniforms.uOpacity.value = 0.95 * plex;
    const shellK = range(p, 0.18, 0.42);
    for (const m of shellMats) m.mat.opacity = m.base * shellK;
    for (const n of shellNodes) {
      for (let k = 0; k < n.shell.nodes; k++) {
        shellPoint(n.shell, time * n.shell.speed + (k / n.shell.nodes) * Math.PI * 2, tmp);
        n.arr.set([tmp.x, tmp.y, tmp.z], k * 3);
      }
      n.geo.attributes.position.needsUpdate = true;
    }
    if (globe.material instanceof ShaderMaterial) globe.material.uniforms.uLights.value = 1 - range(p, 0.2, 0.45) * 0.8;
    (ray.material as LineBasicMaterial).opacity = clamp(range(p, 0.45, 0.65)) * 0.7;
    atmo.scale.setScalar(lerp(1, 1.004, Math.sin(time * 0.5) * 0.5 + 0.5));
    // From the hero close-up the shell fills the lower frame; it fades in as the
    // camera pulls back (the hero horizon glow is drawn in CSS instead).
    atmo.material.uniforms.uFade.value = range(p, 0.12, 0.35);
    composer.render(dt);
    if (plexus.visible) {
      satAnchor.updateMatrixWorld();
      plexus.matrix.copy(satAnchor.matrixWorld);
      plexus.matrixWorld.copy(satAnchor.matrixWorld);
      renderer.autoClear = false;
      renderer.render(plexScene, camera);
      renderer.autoClear = true;
    }
    frames++;
    // Only hand over from the poster once the textured Earth is on screen.
    if (!firstFrame && texturesReady) {
      firstFrame = true;
      onFirstFrame?.();
    }
  };

  // Full frame rate while scroll/pointer motion is settling; the idle drift (slow
  // Earth rotation, orbit nodes) is rendered at ≤30 fps to save GPU time and battery.
  let lastRender = 0;
  const IDLE_FRAME_MS = 1000 / 30;
  const loop = (now: number): void => {
    const settling = Math.abs(target - current) > 0.0005 || pSmooth.distanceToSquared(pointer) > 1e-6;
    if (settling || now - lastRender >= IDLE_FRAME_MS - 1) {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      lastRender = now;
      render(dt);
    }
    rafId = active && !hidden && !lost && (!reducedMotion || settling) ? raf(loop) : 0;
    if (!rafId) last = 0;
  };
  const kick = (): void => {
    if (!rafId && active && !hidden && !lost) rafId = raf(loop);
  };

  // Context loss (GPU reset, memory pressure): stop rendering and let the host fall
  // back to the poster. We do not attempt restoration.
  canvas.addEventListener('webglcontextlost', ((e: Event) => {
    e.preventDefault();
    lost = true;
    if (rafId) cancelRaf(rafId);
    rafId = 0;
    onContextLost?.();
  }) as EventListener);

  const size = opts.textureSize;
  const ready = Promise.all([load(`/textures/earth-day-${size}.webp`), load(`/textures/earth-night-${size}.webp`), envReady])
    .then(async ([d, n]) => {
      globe.material = earthMaterial(d, n);
      texturesReady = true;
      await yieldTask();
      // Parallel shader compilation where KHR_parallel_shader_compile is available.
      await renderer.compileAsync(scene, camera);
      await yieldTask();
      kick();
      render(0); // guarantees a textured frame (and the poster hand-over) even if idle
    });

  return {
    ready,
    get frames() {
      return frames;
    },
    setProgress(p) {
      target = p;
      kick();
    },
    setActive(a) {
      active = a;
      if (a) kick();
    },
    setPointer(x, y) {
      pointer.set(x, y);
      kick();
    },
    setHidden(h) {
      hidden = h;
      if (!h) kick();
    },
    resize(w, h) {
      resize(w, h);
      // Off-screen resizes (e.g. mobile URL bar) don't render; activation will.
      if (active && !rafId && !hidden && !lost) render(0);
    },
    dispose() {
      if (rafId) cancelRaf(rafId);
      rafId = 0;
      active = false;
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mat) => {
          Object.values(mat).forEach((v) => (v as Texture)?.isTexture && (v as Texture).dispose());
          mat.dispose();
        });
      });
      scene.environment?.dispose();
      envScene.traverse((o) => (o as Mesh).geometry?.dispose());
      envMat.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
};
