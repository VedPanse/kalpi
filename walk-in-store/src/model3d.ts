// Builds one product model from a catalog entry made by tools/make3d.py.
// lathe: spin the half-outline into a shape and wrap the cut-out photo back on (front projection).
// flat/box: a box with the photo on the front and back.
import * as THREE from "three";

export interface ModelBase {
  kind: "lathe" | "flat" | "box";
  heightMM: number;
  widthMM: number;
  tex: string;
  profile?: [number, number][];
  axisU?: number;
}

export interface ModelCatalog {
  bases: Record<string, ModelBase>;
  products: Record<string, [string, number][]>;  // product handle -> [base id, count]
}

const MM = 0.001; // metres
const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();

function photo(url: string): THREE.Texture {
  if (!texCache.has(url)) {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(url, t);
  }
  return texCache.get(url)!;
}

export function buildModel(base: ModelBase, dir: string): THREE.Group {
  const tex = photo(dir + base.tex);
  const g = new THREE.Group();
  if (base.kind === "lathe") {
    const pts = base.profile!.map(([r, h]) => new THREE.Vector2(Math.max(r, 0.01) * MM, h * MM));
    const geo = new THREE.LatheGeometry(pts, 40);
    // photo projected from the front: u follows x across the cut-out, v follows height
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    const W = base.widthMM * MM, H = base.heightMM * MM;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, base.axisU! + pos.getX(i) / W, pos.getY(i) / H);
    }
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, clearcoat: 0.4, side: THREE.DoubleSide, alphaTest: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    g.add(mesh);
  } else {
    const w = base.widthMM * MM, h = base.heightMM * MM, d = w * (base.kind === "box" ? 0.75 : 0.18);
    const side = new THREE.MeshStandardMaterial({ color: "#d9d3c7", roughness: 0.7 });
    const front = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.45, clearcoat: base.kind === "flat" ? 0.5 : 0, alphaTest: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, front]);
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    g.add(mesh);
  }
  g.userData.base = base;
  return g;
}

/** All the items of one listing (e.g. "Trio" = three bottles), side by side, scaled to fit a box (metres). */
export function buildListing(cat: ModelCatalog, handle: string, dir: string, maxW: number, maxH: number): THREE.Group | null {
  const comp = cat.products[handle];
  if (!comp) return null;
  const items: ModelBase[] = [];
  for (const [id, n] of comp) for (let i = 0; i < Math.min(n, 6); i++) if (cat.bases[id]) items.push(cat.bases[id]);
  if (!items.length) return null;
  const gap = 0.008;
  const total = items.reduce((a, b) => a + b.widthMM * MM + gap, -gap);
  const tallest = Math.max(...items.map((b) => b.heightMM * MM));
  const k = Math.min(1, maxW / total, maxH / tallest);
  const g = new THREE.Group();
  let x = -total / 2;
  for (const b of items) {
    const m = buildModel(b, dir);
    m.position.x = (x + (b.widthMM * MM) / 2);
    x += b.widthMM * MM + gap;
    g.add(m);
  }
  g.scale.setScalar(k);
  return g;
}
