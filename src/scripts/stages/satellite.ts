/**
 * Procedural flat-panel spacecraft for the hero close-up. Original model (no
 * third-party geometry): a thin anodised bus carrying four dark phased-array tiles,
 * edge hardware (thruster pods, star trackers, radiator grilles, an MLI-wrapped box)
 * and one long accordion-folded solar array on a yoke.
 *
 * Every surface uses PBR maps drawn into canvases at start-up (colour, roughness,
 * metalness, bump), so the model needs no downloads. Random detail is seeded, so
 * every render — including the static poster — is identical.
 *
 * Model axes: +X along the bus, the array extends toward -Y, tiles face +Z.
 * Must not touch window/document (runs in a Web Worker).
 */
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
} from 'three';

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Tex = CanvasTexture<HTMLCanvasElement | OffscreenCanvas>;

/** Mulberry32: tiny seeded PRNG so textures are identical on every load. */
const rng = (seed: number) => (): number => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const canvas = (w: number, h: number): HTMLCanvasElement | OffscreenCanvas =>
  typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });

const tex = (cv: HTMLCanvasElement | OffscreenCanvas, srgb: boolean, repeat = false): Tex => {
  const t = new CanvasTexture(cv);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
  return t;
};

/** Draws the same layout into several channels (colour / roughness / bump). */
const channels = (w: number, h: number, n: number, draw: (cs: Ctx2D[]) => void): (HTMLCanvasElement | OffscreenCanvas)[] => {
  const cvs = Array.from({ length: n }, () => canvas(w, h));
  draw(cvs.map((c) => c.getContext('2d') as Ctx2D));
  return cvs;
};

const roundRect = (c: Ctx2D, x: number, y: number, w: number, h: number, r: number): void => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

/* ---------------------------------------------------------------- maps -- */

/**
 * One solar panel face: 16 × 12 cells of deep blue-violet silicon with fine
 * collector fingers, bright interconnect gaps and a frame. Returns colour,
 * roughness and bump (gaps raised, cells flat and glossy).
 */
const solarMaps = (): { map: Tex; rough: Tex; bump: Tex } => {
  const W = 1024;
  const H = 1024;
  const cols = 16;
  const rows = 16;
  const r = rng(7);
  const [cc, rc, bc] = channels(W, H, 3, (cs) => {
    const [c, ro, b] = cs;
    c.fillStyle = '#b9c2cf';
    c.fillRect(0, 0, W, H);
    ro.fillStyle = '#9a9a9a';
    ro.fillRect(0, 0, W, H);
    b.fillStyle = '#ffffff';
    b.fillRect(0, 0, W, H);
    const m = 14; // frame
    const cw = (W - m * 2) / cols;
    const ch = (H - m * 2) / rows;
    const gap = 2.2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = m + x * cw + gap;
        const py = m + y * ch + gap;
        const w = cw - gap * 2;
        const h = ch - gap * 2;
        const tint = 0.82 + r() * 0.3;
        const g = c.createLinearGradient(px, py, px + w, py + h);
        g.addColorStop(0, `rgb(${30 * tint | 0},${44 * tint | 0},${112 * tint | 0})`);
        g.addColorStop(1, `rgb(${14 * tint | 0},${22 * tint | 0},${66 * tint | 0})`);
        c.fillStyle = g;
        c.fillRect(px, py, w, h);
        // Collector fingers + two bus bars per cell.
        c.fillStyle = 'rgba(170,185,215,0.16)';
        for (let i = 1; i < 10; i++) c.fillRect(px, py + (h * i) / 10, w, 0.7);
        c.fillStyle = 'rgba(200,210,230,0.32)';
        c.fillRect(px + w * 0.33, py, 1.2, h);
        c.fillRect(px + w * 0.66, py, 1.2, h);
        const rv = 40 + r() * 30; // glossy cover glass with slight variation
        ro.fillStyle = `rgb(${rv},${rv},${rv})`;
        ro.fillRect(px, py, w, h);
        b.fillStyle = '#9c9c9c';
        b.fillRect(px, py, w, h);
      }
    }
    // Central harness strip, as on real arrays.
    c.fillStyle = '#7d6a4c';
    c.fillRect(W / 2 - 5, m, 10, H - m * 2);
    ro.fillStyle = '#b0b0b0';
    ro.fillRect(W / 2 - 5, m, 10, H - m * 2);
  });
  return { map: tex(cc, true), rough: tex(rc, false), bump: tex(bc, false) };
};

/** Anodised aluminium skin: panel seams, fastener rows and a mottled finish. */
const skinMaps = (): { map: Tex; rough: Tex; bump: Tex } => {
  const S = 1024;
  const r = rng(11);
  const [cc, rc, bc] = channels(S, S, 3, (cs) => {
    const [c, ro, b] = cs;
    c.fillStyle = '#a9b6cd';
    c.fillRect(0, 0, S, S);
    ro.fillStyle = '#5a5a5a';
    ro.fillRect(0, 0, S, S);
    b.fillStyle = '#808080';
    b.fillRect(0, 0, S, S);
    // Mottling: large soft blotches in colour and roughness.
    for (let i = 0; i < 260; i++) {
      const x = r() * S;
      const y = r() * S;
      const rad = 20 + r() * 110;
      const v = r();
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, v > 0.5 ? 'rgba(190,205,230,0.10)' : 'rgba(40,55,85,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      const gr = ro.createRadialGradient(x, y, 0, x, y, rad);
      const rv = 60 + v * 90;
      gr.addColorStop(0, `rgba(${rv},${rv},${rv},0.35)`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ro.fillStyle = gr;
      ro.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Fine brushed streaks.
    for (let i = 0; i < 1400; i++) {
      const y = r() * S;
      const a = 0.03 + r() * 0.05;
      c.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${a})`;
      c.fillRect(r() * S, y, 40 + r() * 260, 1);
    }
    // Panel seams and fasteners.
    const seams = [0, 256, 512, 768];
    for (const s of seams) {
      for (const [ctx, col] of [[c, 'rgba(20,28,40,0.75)'], [b, '#303030'], [ro, '#c8c8c8']] as const) {
        ctx.fillStyle = col;
        ctx.fillRect(s, 0, 3, S);
        ctx.fillRect(0, s, S, 3);
      }
      for (let k = 12; k < S; k += 32) {
        for (const [ctx, col] of [[c, 'rgba(210,220,235,0.55)'], [b, '#c0c0c0']] as const) {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(s + 12, k, 2.4, 0, Math.PI * 2);
          ctx.arc(k, s + 12, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });
  return { map: tex(cc, true, true), rough: tex(rc, false, true), bump: tex(bc, false, true) };
};

/** Crumpled multi-layer insulation: faceted noise used as bump + roughness. */
const foilMap = (): Tex => {
  const S = 512;
  const r = rng(3);
  const [cv] = channels(S, S, 1, ([c]) => {
    c.fillStyle = '#808080';
    c.fillRect(0, 0, S, S);
    for (let i = 0; i < 1600; i++) {
      const v = 50 + r() * 160;
      c.fillStyle = `rgba(${v},${v},${v},0.8)`;
      const x = r() * S;
      const y = r() * S;
      const s = 8 + r() * 40;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * s, y + (r() - 0.5) * s);
      c.lineTo(x + (r() - 0.5) * s, y + (r() - 0.5) * s);
      c.closePath();
      c.fill();
    }
  });
  return tex(cv, false, true);
};

/** Phased-array tile: dark composite with a faint element grid. */
const tileMaps = (): { map: Tex; bump: Tex } => {
  const S = 512;
  const r = rng(5);
  const [cc, bc] = channels(S, S, 2, ([c, b]) => {
    c.fillStyle = '#232428';
    c.fillRect(0, 0, S, S);
    b.fillStyle = '#808080';
    b.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      const v = 28 + r() * 16;
      c.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
      c.fillRect(r() * S, r() * S, 2 + r() * 14, 2 + r() * 14);
    }
    const n = 12;
    for (let i = 1; i < n; i++) {
      const p = (S * i) / n;
      c.fillStyle = 'rgba(70,72,80,0.35)';
      c.fillRect(p, 0, 1, S);
      c.fillRect(0, p, S, 1);
      b.fillStyle = '#6a6a6a';
      b.fillRect(p, 0, 1.5, S);
      b.fillRect(0, p, S, 1.5);
    }
  });
  return { map: tex(cc, true), bump: tex(bc, false) };
};

/** Radiator grille: dark slots in a bright frame. */
const grilleMap = (): Tex => {
  const [cv] = channels(256, 256, 1, ([c]) => {
    c.fillStyle = '#9aa6b8';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#0d0f13';
    for (let y = 18; y < 240; y += 20) roundRect(c, 16, y, 224, 10, 4), c.fill();
  });
  return tex(cv, true);
};

/* ------------------------------------------------------------ geometry -- */

const roundedSlab = (w: number, h: number, d: number, r: number, bevel: number): ExtrudeGeometry => {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
  // Planar UVs in 0..1 across the face.
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  g.translate(0, 0, -d / 2);
  return g;
};

/** Wing tilt behind the bus about the hinge (radians). */
const ARRAY_TILT = 0.25;

export const buildSatellite = (): Group => {
  const sat = new Group();
  sat.name = 'satellite';

  const skin = skinMaps();
  const solar = solarMaps();
  const tile = tileMaps();
  const foil = foilMap();

  const bodyMat = new MeshPhysicalMaterial({
    color: '#c9d5ea',
    map: skin.map,
    metalness: 0.94,
    roughness: 0.3,
    roughnessMap: skin.rough,
    bumpMap: skin.bump,
    bumpScale: 1.2,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.6,
  });
  const edgeMat = new MeshStandardMaterial({ color: '#59647a', metalness: 0.9, roughness: 0.38, envMapIntensity: 1.3 });
  const tileMat = new MeshPhysicalMaterial({
    color: '#ffffff',
    map: tile.map,
    bumpMap: tile.bump,
    bumpScale: 0.8,
    metalness: 0.25,
    roughness: 0.62,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.9,
  });
  const goldMat = new MeshStandardMaterial({ color: '#b98a3c', metalness: 1, roughness: 0.32, bumpMap: foil, bumpScale: 3, roughnessMap: foil, envMapIntensity: 2 });
  const silverFoil = new MeshStandardMaterial({ color: '#d7dce4', metalness: 1, roughness: 0.28, bumpMap: foil, bumpScale: 2.5, roughnessMap: foil, envMapIntensity: 2 });
  const darkMat = new MeshStandardMaterial({ color: '#16181c', metalness: 0.5, roughness: 0.45 });
  const brightMetal = new MeshStandardMaterial({ color: '#d9dde4', metalness: 1, roughness: 0.18, envMapIntensity: 2 });
  const glass = new MeshPhysicalMaterial({ color: '#040508', metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
  const grille = new MeshStandardMaterial({ map: grilleMap(), metalness: 0.8, roughness: 0.4 });
  const cellMat = new MeshPhysicalMaterial({
    map: solar.map,
    roughnessMap: solar.rough,
    roughness: 1,
    bumpMap: solar.bump,
    bumpScale: 0.6,
    metalness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.6,
  });
  const backMat = new MeshStandardMaterial({ color: '#2b2f37', metalness: 0.4, roughness: 0.62, bumpMap: tile.bump, bumpScale: 0.5 });
  const frameMat = new MeshStandardMaterial({ color: '#6f7785', metalness: 0.9, roughness: 0.42 });

  /* ---- bus ---- */
  const BW = 2.1;
  const BH = 0.92;
  const BD = 0.15;
  const top = BD / 2;
  const bus = new Mesh(roundedSlab(BW, BH, BD, 0.06, 0.012), bodyMat);
  sat.add(bus);
  // Under-structure: a slightly smaller darker slab gives the bus visible thickness.
  const under = new Mesh(roundedSlab(BW - 0.1, BH - 0.1, 0.12, 0.05, 0.01), edgeMat);
  under.position.z = -0.11;
  sat.add(under);
  // Bright chamfer strip along the array-side long edge (catches the sun).
  const lip = new Mesh(new BoxGeometry(BW - 0.12, 0.03, 0.05), brightMetal);
  lip.position.set(0, -BH / 2 + 0.02, top + 0.01);
  sat.add(lip);

  // Phased-array tiles: a 2×2 block at the +X end and one at the -X end.
  const tileGeo = roundedSlab(0.42, 0.36, 0.03, 0.04, 0.008);
  for (const [x, y] of [[0.74, 0.2], [0.3, 0.2], [0.74, -0.2], [0.3, -0.2], [-0.78, 0.12]]) {
    const t = new Mesh(tileGeo, tileMat);
    t.position.set(x, y, top + 0.025);
    sat.add(t);
  }
  // Radiator grilles and electronics plates through the middle.
  for (const [x, y, w, h] of [[-0.18, 0.2, 0.3, 0.32], [-0.18, -0.2, 0.3, 0.28], [-0.62, -0.25, 0.22, 0.2]]) {
    const g = new Mesh(new BoxGeometry(w, h, 0.016), [edgeMat, edgeMat, edgeMat, edgeMat, grille, edgeMat]);
    g.position.set(x, y, top + 0.01);
    sat.add(g);
  }
  // MLI-wrapped payload box near the array root, plus a smaller silver one.
  const mli = new Mesh(new BoxGeometry(0.34, 0.14, 0.13, 6, 4, 4), goldMat);
  mli.position.set(0.46, -0.37, top + 0.065);
  sat.add(mli);
  const mli2 = new Mesh(new BoxGeometry(0.16, 0.12, 0.08, 4, 4, 4), silverFoil);
  mli2.position.set(-0.45, 0.33, top + 0.04);
  sat.add(mli2);

  // Thruster pods at the corners: cylinder body + bell nozzle.
  const nozzleProfile = [new Vector2(0.012, 0), new Vector2(0.016, 0.02), new Vector2(0.03, 0.05), new Vector2(0.034, 0.06)];
  const nozzleGeo = new LatheGeometry(nozzleProfile, 20);
  const podGeo = new CylinderGeometry(0.045, 0.045, 0.09, 20);
  for (const [x, y, rz] of [[1.08, 0.3, -Math.PI / 2], [1.08, -0.3, -Math.PI / 2], [-1.08, 0.3, Math.PI / 2], [-1.08, -0.3, Math.PI / 2]]) {
    const pod = new Group();
    pod.position.set(x, y, -0.02);
    pod.rotation.z = rz;
    pod.add(new Mesh(podGeo, brightMetal));
    const n = new Mesh(nozzleGeo, darkMat);
    n.position.y = 0.04;
    pod.add(n);
    sat.add(pod);
  }
  // Star trackers: stubby baffles with dark optics at the -X end.
  const baffleGeo = new CylinderGeometry(0.045, 0.035, 0.11, 24, 1, true);
  for (const [x, y] of [[-0.98, 0.4], [-0.98, -0.38]]) {
    const st = new Group();
    st.position.set(x, y, top + 0.05);
    st.rotation.x = Math.PI / 2 - 0.5;
    st.add(new Mesh(baffleGeo, brightMetal));
    const lens = new Mesh(new CylinderGeometry(0.032, 0.032, 0.01, 24), glass);
    lens.position.y = 0.02;
    st.add(lens);
    const base = new Mesh(new BoxGeometry(0.1, 0.06, 0.1), darkMat);
    base.position.y = -0.07;
    st.add(base);
    sat.add(st);
  }
  // Antenna stub on the far edge.
  const mast = new Mesh(new CylinderGeometry(0.008, 0.008, 0.22, 8), brightMetal);
  mast.position.set(0.1, BH / 2 + 0.08, 0.02);
  sat.add(mast);

  /* ---- solar array ---- */
  // A hinge along the bus's -Y edge tilts the whole wing behind the bus; within the
  // wing, panels alternate their fold angle, giving the stepped silhouette of a
  // deployed accordion array.
  const hinge = new Group();
  hinge.name = 'array';
  hinge.position.set(-0.25, -BH / 2 + 0.04, -0.12);
  hinge.rotation.x = ARRAY_TILT;
  sat.add(hinge);
  const yoke = new Mesh(new BoxGeometry(0.06, 0.2, 0.04), frameMat);
  yoke.position.set(0, -0.1, 0);
  hinge.add(yoke);
  const PW = 1.36;
  const PH = 0.78;
  const PT = 0.02;
  const N = 6;
  const FOLD = 0.42;
  const panelGeo = new BoxGeometry(PW, PH, PT);
  const railGeo = new BoxGeometry(PW + 0.02, 0.014, PT + 0.008);
  let y = -0.2;
  let z = 0;
  for (let i = 0; i < N; i++) {
    const a = (i % 2 ? -1 : 1) * FOLD;
    const pivot = new Group();
    pivot.position.set(0, y, z);
    pivot.rotation.x = a;
    const panel = new Mesh(panelGeo, [frameMat, frameMat, frameMat, frameMat, cellMat, backMat]);
    panel.position.y = -PH / 2;
    pivot.add(panel);
    const rail = new Mesh(railGeo, frameMat);
    rail.position.y = -0.004;
    pivot.add(rail);
    hinge.add(pivot);
    y -= PH * Math.cos(a) + 0.01;
    z -= PH * Math.sin(a);
  }
  return sat;
};
