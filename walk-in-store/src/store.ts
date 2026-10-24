import * as THREE from 'three';
import { imageUrl, modelDir } from './api';
import { buildListing, type ModelCatalog } from './model3d';
import { floorTexture, priceTexture, signTexture } from './textures';
import type { Block, Product, StoreData } from './types';

/* Shelf layout, in metres */
const UNIT_LENGTH = 5.4;          // length of one shelving unit (along z)
const UNIT_DEPTH = 0.5;           // half the unit's depth: products sit on both sides
const LEVELS = [0.2, 0.62, 1.04, 1.46];
const SLOT = 0.5;                 // space per product along a shelf
const AISLE = 2.8;                // distance between shelving units
const MAX_PRODUCTS = 288;
const PER_SIDE = Math.floor(UNIT_LENGTH / SLOT);
const PER_UNIT = PER_SIDE * LEVELS.length * 2;
const CEILING = 3.6;

export interface BuiltStore {
  scene: THREE.Scene;
  pickables: THREE.Object3D[];   // meshes that open the product panel when clicked
  blocks: Block[];               // floor areas you can't walk into
  bounds: Block;                 // the walls
  start: THREE.Vector3;
  name: string;
  count: number;
  aisles: number;
  in3d: number;                  // products shown as 3D models
}

const loader = new THREE.TextureLoader();
const floorTex = floorTexture();

function loadPhoto(material: THREE.MeshBasicMaterial, src: string): void {
  loader.load(imageUrl(src), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    material.map = t;
    material.needsUpdate = true;
  });
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mat) => {
      (mat as THREE.MeshStandardMaterial).map?.dispose();
      mat.dispose();
    });
  });
}

/** Builds a walkable store with as many aisles as the products need. */
export function buildStore(data: StoreData, models: ModelCatalog | null = null): BuiltStore {
  const dir = modelDir(data.store);
  let in3d = 0;
  const scene = new THREE.Scene();
  const pickables: THREE.Object3D[] = [];
  const blocks: Block[] = [];

  const products = data.products.slice(0, MAX_PRODUCTS);
  products.sort((a, b) => (a.type || 'zz').localeCompare(b.type || 'zz'));   // group aisles by product type
  const units = Math.max(1, Math.ceil(products.length / PER_UNIT));

  const W = units * AISLE + AISLE;
  const zFront = 2.2;
  const zBack = -(UNIT_LENGTH + 3.2);
  const D = zFront - zBack + 3;
  const cz = (zFront + zBack) / 2 + 1.2;
  const bounds: Block = { x0: -W / 2 + 0.4, x1: W / 2 - 0.4, z0: zBack + 0.4, z1: zFront + 2.4 };

  scene.background = new THREE.Color('#F4F2EE');
  scene.fog = new THREE.Fog('#F4F2EE', 14, 34);

  /* room */
  floorTex.repeat.set(W / 2, D / 2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = cz;
  floor.name = 'floor';
  scene.add(floor);

  const wallM = new THREE.MeshStandardMaterial({ color: '#EFEDE8', roughness: 0.95 });
  const wall = (w: number, x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, CEILING), wallM);
    m.position.set(x, CEILING / 2, z);
    m.rotation.y = ry;
    scene.add(m);
  };
  wall(W, 0, cz - D / 2, 0);
  wall(D, -W / 2, cz, Math.PI / 2);
  wall(D, W / 2, cz, -Math.PI / 2);
  wall(W, 0, cz + D / 2, Math.PI);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#FAFAF8', roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CEILING, cz);
  scene.add(ceiling);

  scene.add(new THREE.HemisphereLight('#ffffff', '#cfc9bf', 2.6));
  const sun = new THREE.DirectionalLight('#fff6ea', 1.2);
  sun.position.set(3, 8, 6);
  scene.add(sun);

  /* the store's name on the back wall */
  const name = data.store.replace(/^www\./, '').split('.')[0];
  const nameSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.1),
    new THREE.MeshBasicMaterial({ map: signTexture(name.toUpperCase(), data.store, '#16171B', '#F4F2EE') }),
  );
  nameSign.position.set(0, 2.75, cz - D / 2 + 0.02);
  scene.add(nameSign);

  /* shelving units */
  const mats = {
    shelf: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5, metalness: 0.1 }),
    post: new THREE.MeshStandardMaterial({ color: '#2A2C31', roughness: 0.4, metalness: 0.6 }),
    back: new THREE.MeshStandardMaterial({ color: '#E3DED5', roughness: 0.9 }),
    edge: new THREE.MeshStandardMaterial({ color: '#f2f1ee', roughness: 0.6 }),
    strip: new THREE.MeshStandardMaterial({ color: '#1F2A44', roughness: 0.5 }),
    kick: new THREE.MeshStandardMaterial({ color: '#2A2C31', roughness: 0.6 }),
    shadow: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false }),
  };
  const productGeo = new THREE.BoxGeometry(0.3, 0.3, 0.12);
  const tagGeo = new THREE.PlaneGeometry(0.15, 0.056);

  let next = 0;
  for (let u = 0; u < units; u++) {
    const x = (u - (units - 1) / 2) * AISLE;
    const zc = -UNIT_LENGTH / 2 - 0.4;
    const unit = new THREE.Group();
    unit.position.set(x, 0, zc);
    scene.add(unit);
    buildShelving(unit, mats);
    const block: Block = { x0: x - UNIT_DEPTH - 0.35, x1: x + UNIT_DEPTH + 0.35, z0: zc - UNIT_LENGTH / 2 - 0.35, z1: zc + UNIT_LENGTH / 2 + 0.35 };
    blocks.push(block);

    const types = new Map<string, number>();
    let hero: Product | null = null;
    for (const side of [-1, 1]) {
      for (let li = 0; li < LEVELS.length; li++) {
        for (let si = 0; si < PER_SIDE; si++) {
          const p = products[next++];
          if (!p) continue;
          const t = p.type || 'Products';
          types.set(t, (types.get(t) ?? 0) + 1);
          hero ??= p;
          const z = -UNIT_LENGTH / 2 + SLOT / 2 + si * SLOT;
          const model = models && buildListing(models, p.handle, dir, SLOT - 0.06, LEVELS[1] - LEVELS[0] - 0.05);
          if (model) {
            // the real product in 3D, facing the aisle
            model.position.set(side * (UNIT_DEPTH - 0.16), LEVELS[li], z);
            model.rotation.y = (side * Math.PI) / 2;
            model.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.userData.product = p; pickables.push(o); } });
            unit.add(model);
            in3d++;
          }
          const front = new THREE.MeshBasicMaterial({ color: '#ffffff' });
          for (const depth of model ? [] : [0, 1]) {   // two facings deep, like a stocked shelf
            const box = new THREE.Mesh(productGeo, [mats.edge, mats.edge, mats.edge, mats.edge, front, mats.edge]);
            box.position.set(side * (UNIT_DEPTH - 0.09 - depth * 0.16), LEVELS[li] + 0.15, z + (depth ? 0.01 : 0));
            box.rotation.y = (side * Math.PI) / 2;
            box.userData.product = p;
            unit.add(box);
            pickables.push(box);
          }
          const tag = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ map: priceTexture(p.price ? '$' + Number(p.price).toFixed(2) : '') }));
          tag.position.set(side * (UNIT_DEPTH + 0.012), LEVELS[li] - 0.02, z);
          tag.rotation.y = (side * Math.PI) / 2;
          unit.add(tag);
          if (!model) loadPhoto(front, p.image);
        }
      }
    }

    /* end cap: a bigger product on a stand at the front of each aisle */
    if (hero) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.5), mats.strip);
      stand.position.set(0, 0.35, UNIT_LENGTH / 2 + 0.3);
      unit.add(stand);
      const heroModel = models && buildListing(models, hero.handle, dir, 0.62, 0.7);
      if (heroModel) {
        heroModel.scale.multiplyScalar(1.6);
        heroModel.position.set(0, 0.7, UNIT_LENGTH / 2 + 0.3);
        const h = hero;
        heroModel.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.userData.product = h; pickables.push(o); } });
        unit.add(heroModel);
      } else {
        const face = new THREE.MeshBasicMaterial({ color: '#fff' });
        const big = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.16), [mats.edge, mats.edge, mats.edge, mats.edge, face, mats.edge]);
        big.position.set(0, 0.96, UNIT_LENGTH / 2 + 0.3);
        big.userData.product = hero;
        unit.add(big);
        pickables.push(big);
        loadPhoto(face, hero.image);
      }
      block.z1 += 0.6;
    }

    /* hanging aisle sign named after the most common product type */
    const top = [...types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.38),
      new THREE.MeshBasicMaterial({ map: signTexture('Aisle ' + (u + 1), top.slice(0, 28), '#B4AAFF', '#0C0B12'), side: THREE.DoubleSide }),
    );
    sign.position.set(x, 2.75, -0.2);
    scene.add(sign);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7), mats.post);
    cord.position.set(x, 3.25, -0.2);
    scene.add(cord);
  }

  /* ceiling light strips between aisles */
  for (let u = 0; u <= units; u++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, UNIT_LENGTH + 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    strip.position.set((u - units / 2) * AISLE, CEILING - 0.03, -UNIT_LENGTH / 2 - 0.4);
    scene.add(strip);
  }

  buildFrontOfStore(scene, blocks, W, zFront);

  return { scene, pickables, blocks, bounds, start: new THREE.Vector3(0, 1.6, zFront + 1.6), name, count: products.length, aisles: units, in3d };
}

function buildShelving(unit: THREE.Group, m: Record<string, THREE.Material>): void {
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    unit.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(0.05, 1.95, UNIT_LENGTH), m.back, 0, 1.0, 0);
  add(new THREE.BoxGeometry(UNIT_DEPTH * 2 + 0.04, 0.16, UNIT_LENGTH), m.kick, 0, 0.08, 0);
  for (const y of LEVELS) {
    add(new THREE.BoxGeometry(UNIT_DEPTH * 2, 0.03, UNIT_LENGTH), m.shelf, 0, y - 0.015, 0);
    for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.05, UNIT_LENGTH), m.strip, sd * UNIT_DEPTH, y - 0.02, 0);
  }
  add(new THREE.BoxGeometry(UNIT_DEPTH * 2 + 0.06, 0.06, UNIT_LENGTH + 0.06), m.post, 0, 1.98, 0);
  for (const z of [-UNIT_LENGTH / 2, UNIT_LENGTH / 2]) add(new THREE.BoxGeometry(UNIT_DEPTH * 2 + 0.06, 2.0, 0.06), m.post, 0, 1.0, z);
  const shadow = add(new THREE.PlaneGeometry(UNIT_DEPTH * 2 + 0.8, UNIT_LENGTH + 0.8), m.shadow, 0, 0.004, 0);
  shadow.rotation.x = -Math.PI / 2;
}

/** Checkout counter, entrance mat and two plants. */
function buildFrontOfStore(scene: THREE.Scene, blocks: Block[], W: number, zFront: number): void {
  const cx = W / 2 - 1.4;
  const cz = zFront + 0.4;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.7), new THREE.MeshStandardMaterial({ color: '#8A6A4A', roughness: 0.6 }));
  counter.position.set(cx, 0.5, cz);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.8), new THREE.MeshStandardMaterial({ color: '#F2F0EC', roughness: 0.3 }));
  top.position.set(cx, 1.02, cz);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.03), new THREE.MeshBasicMaterial({ color: '#1b1d22' }));
  screen.position.set(cx - 0.4, 1.25, cz);
  screen.rotation.y = 0.4;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.36), new THREE.MeshBasicMaterial({ map: signTexture('Checkout', '', '#16171B', '#F4F2EE'), side: THREE.DoubleSide }));
  sign.position.set(cx, 2.7, cz);
  scene.add(counter, top, screen, sign);
  blocks.push({ x0: cx - 1.25, x1: cx + 1.25, z0: cz - 0.7, z1: cz + 0.7 });

  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ color: '#3A3D44', roughness: 1 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.006, zFront + 2.2);
  scene.add(mat);

  for (const sd of [-1, 1]) {
    const px = sd * (W / 2 - 0.6);
    const pz = zFront + 1.8;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 24), new THREE.MeshStandardMaterial({ color: '#D8D2C8', roughness: 0.8 }));
    pot.position.set(px, 0.225, pz);
    scene.add(pot);
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.08, 12, 10), new THREE.MeshStandardMaterial({ color: i % 2 ? '#3F6B45' : '#527F57', roughness: 0.8 }));
      leaf.position.set(px + (Math.random() - 0.5) * 0.35, 0.65 + Math.random() * 0.6, pz + (Math.random() - 0.5) * 0.35);
      leaf.scale.y = 1.3;
      scene.add(leaf);
    }
    blocks.push({ x0: px - 0.45, x1: px + 0.45, z0: pz - 0.45, z1: pz + 0.45 });
  }
}
