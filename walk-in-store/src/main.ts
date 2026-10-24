import * as THREE from 'three';
import { fetchModels, fetchStore } from './api';
import { closePanel, openPanel, toast } from './panel';
import { buildStore, disposeScene, type BuiltStore } from './store';
import type { Product } from './types';
import { Walker } from './walker';

const SAMPLE_STORES = ['graza.co', 'otherland.com', 'boysmells.com', 'rhodeskin.com', 'homesick.com'];
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

/* renderer + camera */
const canvas = $<HTMLCanvasElement>('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
function resize(): void {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const walker = new Walker(camera, canvas);
walker.bindButtons(document.querySelectorAll('.keys button'));
let world: BuiltStore | null = null;
let loadedStore = '';

/* load a store */
async function load(store: string): Promise<void> {
  $('#status').textContent = 'Reading ' + store + ' …';
  closePanel();
  try {
    const data = await fetchStore(store);
    const models = await fetchModels(data.store);
    if (world) disposeScene(world.scene);
    world = buildStore(data, models);
    loadedStore = data.store;
    walker.setWorld(world.blocks, world.bounds, world.start);
    $('#brand').textContent = world.name;
    $('#status').innerHTML = `<b>${world.count}</b> products from <b>${data.store}</b> · ${world.aisles} aisle${world.aisles > 1 ? 's' : ''}${world.in3d ? ` · <b>${world.in3d}</b> in 3D` : ''}. Walk with WASD or the arrow keys, click a product.`;
  } catch (e) {
    $('#status').textContent = (e as Error).message;
  }
}

$('#chips').innerHTML = SAMPLE_STORES.map((s) => `<button class="chip" type="button" data-store="${s}">${s}</button>`).join('');
$('#chips').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-store]');
  if (!b) return;
  $<HTMLInputElement>('#storeInput').value = b.dataset.store!;
  load(b.dataset.store!);
});
$('#storeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  load($<HTMLInputElement>('#storeInput').value);
});

/* clicking: open a product, or walk to the spot on the floor */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickAt(x: number, y: number): void {
  if (!world) return;
  ndc.set(x, y);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(world.pickables, false)[0];
  if (hit && hit.distance < 7) {
    if (walker.locked) document.exitPointerLock();
    openPanel(loadedStore, hit.object.userData.product as Product);
    return;
  }
  const floor = world.scene.getObjectByName('floor');
  const f = floor && ray.intersectObject(floor)[0];
  if (f && f.distance < 25) walker.walkTo(f.point.x, f.point.z);
}

let drag: { x: number; y: number; sx: number; sy: number } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  if (walker.locked) return pickAt(0, 0);   // aim with the dot in the middle
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  walker.look((e.clientX - drag.x) * 0.004, (e.clientY - drag.y) * 0.004);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
  drag = null;
  if (moved < 6) pickAt((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
});

/* overlay, panel buttons */
$('#enterBtn').addEventListener('click', () => {
  $('#enter').hidden = true;
  walker.lockPointer();
});
$('#closePanel').addEventListener('click', closePanel);
$('#pTest').addEventListener('click', () => toast('Next step: Kalpi makes 2–3 versions of this product and a vote page for the shop’s customers.'));

/* loop */
const timer = new THREE.Timer();
function frame(): void {
  timer.update();
  const dt = Math.min(0.05, timer.getDelta());
  walker.update(dt);
  if (world) for (const o of world.spinners) o.rotation.y += dt * 0.6; // 3D products turn slowly
  if (world) renderer.render(world.scene, camera);
  requestAnimationFrame(frame);
}

(document.fonts?.ready ?? Promise.resolve()).then(() => {
  load($<HTMLInputElement>('#storeInput').value);
  frame();
});
