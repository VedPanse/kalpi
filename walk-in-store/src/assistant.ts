import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// The shop assistant: Khronos' BrainStem robot (dance loop only), gliding around the store.
// Local copy for offline demos (public/assistant/, not committed: Poser EULA), else Khronos' own copy.
const LOCAL = '/assistant/BrainStem.glb';
const REMOTE = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/BrainStem/glTF-Binary/BrainStem.glb';

const SPEED = 1.6;       // metres per second
const WALKWAY_Z = 1.0;   // the open strip between the shelves and the checkout

export interface Layout {
  aisleXs: number[];          // centre x of each shelving unit
  checkout: THREE.Vector3;    // where the assistant stands at the counter
  home: THREE.Vector3;        // where it waits near the entrance
}

export class Assistant {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private path: THREE.Vector3[] = [];
  private onArrive: (() => void) | null = null;
  private carried: THREE.Object3D[] = [];
  private t = 0;

  constructor(private layout: Layout) {
    this.root.position.copy(layout.home);
    this.load(LOCAL).catch(() => this.load(REMOTE)).catch((e) => console.warn('assistant model', e));
  }

  private async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    const m = gltf.scene;
    m.scale.setScalar(0.72);
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    this.root.add(m);
    this.mixer = new THREE.AnimationMixer(m);
    if (gltf.animations[0]) {
      this.action = this.mixer.clipAction(gltf.animations[0]);
      this.action.play();
    }
  }

  get busy(): boolean {
    return this.path.length > 0;
  }

  /** Route along the walkway so the robot never cuts through a shelf. */
  goTo(target: THREE.Vector3, then?: () => void): void {
    const from = this.root.position;
    const pts: THREE.Vector3[] = [];
    if (Math.abs(from.z - WALKWAY_Z) > 0.3) pts.push(new THREE.Vector3(from.x, 0, WALKWAY_Z));
    pts.push(new THREE.Vector3(target.x, 0, WALKWAY_Z));
    pts.push(new THREE.Vector3(target.x, 0, target.z));
    this.path = pts;
    this.onArrive = then ?? null;
  }

  /** Walk to a product, pick up a copy of it, and bring it back to the shopper. */
  fetch(product: THREE.Object3D, shopper: THREE.Vector3, done: () => void): void {
    const p = new THREE.Vector3();
    product.getWorldPosition(p);
    const unitX = this.layout.aisleXs.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a));
    const side = p.x >= unitX ? 1 : -1;
    const stand = new THREE.Vector3(unitX + side * 1.15, 0, p.z);
    this.goTo(stand, () => {
      this.pickUp(product);
      const meet = new THREE.Vector3(shopper.x, 0, Math.min(shopper.z - 1.1, this.layout.home.z));
      this.goTo(meet, done);
    });
  }

  /** Carry everything to the checkout counter. */
  checkout(done: () => void): void {
    this.goTo(this.layout.checkout, done);
  }

  private pickUp(product: THREE.Object3D): void {
    // carry the whole product (all its parts), held in front of the robot
    let top = product;
    while (top.parent && top.parent.userData.product === product.userData.product && top.parent.type !== 'Scene') top = top.parent;
    const copy = top.clone(true);
    copy.position.set(0, 1.05 + this.carried.length * 0.05, 0.38);
    copy.rotation.set(0, 0, 0);
    copy.scale.multiplyScalar(1.2);
    copy.userData.spin = false;
    this.root.add(copy);
    this.carried.push(copy);
  }

  dropAll(): void {
    this.carried.forEach((c) => this.root.remove(c));
    this.carried = [];
  }

  update(dt: number, lookAt: THREE.Vector3): void {
    this.t += dt;
    this.mixer?.update(dt);
    const target = this.path[0];
    if (target) {
      const pos = this.root.position;
      const to = target.clone().sub(pos);
      to.y = 0;
      const d = to.length();
      if (d < 0.05) {
        this.path.shift();
        if (!this.path.length) {
          const cb = this.onArrive;
          this.onArrive = null;
          cb?.();
        }
      } else {
        const step = Math.min(d, SPEED * dt);
        pos.addScaledVector(to.normalize(), step);
        this.root.rotation.y = Math.atan2(to.x, to.z);
      }
      if (this.action) this.action.timeScale = 1.7; // dances faster while gliding
      this.root.position.y = Math.abs(Math.sin(this.t * 7)) * 0.04;
    } else {
      if (this.action) this.action.timeScale = 1;
      this.root.position.y = 0;
      const dx = lookAt.x - this.root.position.x, dz = lookAt.z - this.root.position.z;
      this.root.rotation.y = Math.atan2(dx, dz); // face the shopper while waiting
    }
  }
}
