import * as THREE from 'three';
import type { Block } from './types';

const EYE_HEIGHT = 1.6;
const WALK_SPEED = 2.8;
const RUN_SPEED = 5;
const TURN_SPEED = 1.8;

/**
 * First-person walking: mouse look (pointer lock) or drag to look,
 * WASD / arrow keys / on-screen buttons to move, and click-to-walk on the floor.
 */
export class Walker {
  readonly position = new THREE.Vector3(0, EYE_HEIGHT, 3);
  yaw = 0;
  pitch = -0.08;
  goal: THREE.Vector2 | null = null;
  private keys = new Set<string>();
  private held = new Set<string>();
  private blocks: Block[] = [];
  private bounds: Block = { x0: -5, x1: 5, z0: -10, z1: 4 };
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      this.keys.add(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.look(e.movementX * 0.0022, e.movementY * 0.0022);
    });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  lockPointer(): void {
    try {
      const r = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {});
    } catch {
      /* pointer lock is optional; drag-to-look still works */
    }
  }

  /** On-screen arrow buttons */
  bindButtons(buttons: NodeListOf<HTMLElement>): void {
    buttons.forEach((b) => {
      const k = b.dataset.k!;
      b.addEventListener('pointerdown', () => this.held.add(k));
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => this.held.delete(k));
    });
  }

  look(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch - dy));
  }

  setWorld(blocks: Block[], bounds: Block, start: THREE.Vector3): void {
    this.blocks = blocks;
    this.bounds = bounds;
    this.position.copy(start);
    this.yaw = 0;
    this.pitch = -0.08;
    this.goal = null;
  }

  walkTo(x: number, z: number): void {
    this.goal = new THREE.Vector2(x, z);
  }

  private free(x: number, z: number): boolean {
    const b = this.bounds;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return false;
    return !this.blocks.some((o) => x > o.x0 && x < o.x1 && z > o.z0 && z < o.z1);
  }

  update(dt: number): void {
    const k = this.keys, h = this.held;
    const speed = (k.has('shift') ? RUN_SPEED : WALK_SPEED) * dt;
    const forward = (k.has('w') || k.has('arrowup') || h.has('forward') ? 1 : 0) - (k.has('s') || k.has('arrowdown') || h.has('back') ? 1 : 0);
    const strafe = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    const turn = (k.has('arrowleft') || h.has('left') ? 1 : 0) - (k.has('arrowright') || h.has('right') ? 1 : 0);
    this.yaw += turn * TURN_SPEED * dt;

    let dx = (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe) * speed;
    let dz = (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * strafe) * speed;
    if (forward || strafe) this.goal = null;
    if (this.goal) {
      const vx = this.goal.x - this.position.x, vz = this.goal.y - this.position.z, d = Math.hypot(vx, vz);
      if (d < 0.15) this.goal = null;
      else {
        const s = Math.min(d, WALK_SPEED * dt);
        dx = (vx / d) * s;
        dz = (vz / d) * s;
      }
    }
    const ox = this.position.x, oz = this.position.z;
    if (this.free(ox + dx, oz)) this.position.x += dx;
    if (this.free(this.position.x, oz + dz)) this.position.z += dz;
    if (this.goal && this.position.x === ox && this.position.z === oz) this.goal = null;   // walked into a shelf

    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
