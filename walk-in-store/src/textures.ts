import * as THREE from 'three';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** A texture drawn with the 2D canvas API (signs, price tags, floor). */
export function canvasTexture(w: number, h: number, draw: Draw): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Small seeded random generator, so textures look the same every time. */
export function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Light speckled tiles with grout lines. */
export function floorTexture(): THREE.CanvasTexture {
  const t = canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#D8D6D1';
    g.fillRect(0, 0, w, h);
    const r = seeded(5);
    for (let i = 0; i < 14000; i++) {
      g.globalAlpha = r() * 0.05;
      g.fillStyle = r() > 0.5 ? '#fff' : '#000';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.globalAlpha = 0.25;
    g.strokeStyle = '#b9b6ae';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke();
      g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A sign with a big title and an optional smaller line under it. */
export function signTexture(text: string, sub: string, bg: string, ink: string): THREE.CanvasTexture {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 120;
    g.font = `800 ${size}px Syne, sans-serif`;
    while (g.measureText(text).width > w * 0.88 && size > 30) {
      size -= 6;
      g.font = `800 ${size}px Syne, sans-serif`;
    }
    g.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
    if (sub) {
      g.font = '500 40px "IBM Plex Mono", monospace';
      g.globalAlpha = 0.75;
      g.fillText(sub, w / 2, h * 0.8);
    }
  });
}

/** A shelf-edge price tag with a red strip on top. */
export function priceTexture(text: string): THREE.CanvasTexture {
  return canvasTexture(256, 96, (g, w, h) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#E4002B';
    g.fillRect(0, 0, w, 14);
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 46px "IBM Plex Mono", monospace';
    g.fillText(text, w / 2, h * 0.6);
  });
}
