/* R5a / R5b / R5c · Choose your version, three "alien" treatments of the same concept.
   Same parts each time: "Choose yours", the version name behind a true-colour bottle, annotations drawn from
   the product, A/B/C pills (DOM), left description and right facts (DOM). No neon: glow is at most a whisper. */
(function () {
const { U, THREE } = window.RICH;
const ROOT = '../../../';
window.SCENES = window.SCENES || {};
window.SCENE_OPTS = window.SCENE_OPTS || {};

const V = {
  A: { key: 'A', name: 'Terracotta', tint: '#B8694A', glb: '3d-terracotta.glb', photo: 'terracotta.png', line: 'Same bottle, warm terracotta coat. 41 sample votes.', code: '02-A', coat: 'TERRACOTTA' },
  B: { key: 'B', name: 'Navy', tint: '#5D6B8E', glb: '3d-navy.glb', photo: 'navy.png', line: 'Same bottle, deep navy coat. 27 sample votes.', code: '02-B', coat: 'NAVY' },
  C: { key: 'C', name: 'Cream', tint: '#B9A47E', glb: '3d-cream.glb', photo: 'cream.png', line: 'Same bottle, soft cream coat. 19 sample votes.', code: '02-C', coat: 'CREAM' },
};
const KEYS = ['A', 'B', 'C'];
const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

/* outline of the product photo as a list of edge points (Sobel), in photo-normalised coords */
function tracePoints(img) {
  const w = 216, h = 288, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = .3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2];
  const pts = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
    const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
    if (Math.sqrt(gx * gx + gy * gy) > 60) pts.push([x / w, y / h]);
  }
  return pts;
}
/* bounding box of the bottle in the photo (from the edge points) */
const bbox = pts => { let x0 = 1, x1 = 0, y0 = 1, y1 = 0; pts.forEach(([x, y]) => { if (x > .15 && x < .85 && y > .05 && y < .97) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }); return { x0, x1, y0, y1 }; };

/* value noise for contour maps */
const hsh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hsh(ix, iy), b = hsh(ix + 1, iy), c = hsh(ix, iy + 1), d = hsh(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; };
const fbm = (x, y) => vn(x, y) * .55 + vn(x * 2.1, y * 2.1) * .28 + vn(x * 4.3, y * 4.3) * .17;

/* ------------------------------------------------------------------ styles ---------- */
const STYLES = {
  /* cold, quiet specimen lab; pale fog, hairline mono annotations, a slow scan line; warm terracotta accents */
  a: {
    bgTop: '#E4E3DF', bgBot: '#CFCDC8', floor: '#D6D4CF', floorRough: .55, refl: .18,
    ink: 'rgba(38,40,43,', accent: '#A85A3C', textCol: '#2A2C2F',
    smallFont: '300 44px "IBM Plex Mono", monospace', small: 'CHOOSE YOURS', nameFont: px => `200 ${px}px "Inter Tight", sans-serif`, nameSize: .24, nameTrack: -.02,
    nameMix: .55, key: ['#FFFFFF', .78], fill: ['#F4F2EE', .2], env: { rim: '#ffffff', floor: '#cfcdc8', warm: '#ffffff', cool: '#f4f4f2' }, envI: .3,
    atmos: { density: .02, amb: ['#EDEBE6', .9], heightFall: .2 }, exposure: 1.0, lift: [0, 0, 0], sat: .96, grain: .03, vignette: .25,
    scan: true, particles: null, iri: 0, bloom: [.05, 3],
  },
  /* desert planet: ochre haze, low sun, geometric glyph orbits, wide display face */
  b: {
    bgTop: '#C29468', bgBot: '#8A5E40', floor: '#A0704E', floorRough: .9, refl: .05,
    ink: 'rgba(250,228,196,', accent: '#F2C38E', textCol: '#F6E7D0',
    smallFont: '400 34px "Syncopate", sans-serif', small: 'CHOOSE YOURS', nameFont: px => `700 ${px}px "Syncopate", sans-serif`, nameSize: .15, nameTrack: .12,
    nameBase: '#3B2216', smallCol: '#4A2E20', nameMix: .52, key: ['#FFE2C2', 1.05], fill: ['#FFE7CF', .14], env: { rim: '#E8B07A', floor: '#6b4630', warm: '#ffe2c0', cool: '#f2d2b0' }, envI: .28,
    atmos: { density: .09, amb: ['#C79469', .55], heightFall: .35, sun: ['#FFC48A', 5] }, exposure: 1.0, lift: [.02, .012, .004], sat: .92, grain: .045, vignette: .45,
    scan: false, particles: { col: '#F5D2A6', n: 1400, gain: .5, wind: [.18, .01, .02], size: 2.2 }, iri: 0, bloom: [.08, 2.4],
  },
  /* ocean trench: near-black teal, sonar contours, plankton, oil-slick rim; warm amber life */
  c: {
    bgTop: '#06191C', bgBot: '#020809', floor: '#041012', floorRough: .25, refl: .35,
    ink: 'rgba(120,196,186,', accent: '#E0A15E', textCol: '#DCEBE6',
    smallFont: '300 40px "IBM Plex Mono", monospace', small: 'CHOOSE YOURS', nameFont: px => `200 ${px}px "Inter Tight", sans-serif`, nameSize: .25, nameTrack: -.02,
    nameMix: .6, key: ['#F6F2EC', 1.35], fill: ['#BFE3DC', .2], env: { rim: '#4FB8A8', floor: '#020809', warm: '#f6efe6', cool: '#cfe9e4' }, envI: .45,
    atmos: { density: .06, amb: ['#0E3A3A', .35], heightFall: .15 }, exposure: 1.05, lift: [0, .006, .006], sat: 1, grain: .05, vignette: .55,
    scan: false, particles: { col: '#E9B26E', n: 1800, gain: .55, wind: [.01, .03, .005], size: 2.6, col2: '#6FD3C0' }, iri: 1, bloom: [.1, 1.8],
  },
};

/* ------------------------------------------------------------------ annotation painters ---------- */
function paintBg(g, S, CW, CH) {
  const gr = g.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, S.bgTop); gr.addColorStop(1, S.bgBot);
  g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
}
/* product box on the board (centre column), measured from the camera framing */
const PB = { x0: .455, x1: .545, y0: .42, y1: .93 };

const painters = {
  a(g, S, v, pts, CW, CH) {
    paintBg(g, S, CW, CH);
    // faint dot grid
    g.fillStyle = S.ink + '.16)'; for (let y = 60; y < CH; y += 60) for (let x = 60; x < CW; x += 60) g.fillRect(x, y, 2, 2);
    g.strokeStyle = S.ink + '.62)'; g.fillStyle = S.ink + '.75)'; g.lineWidth = 1.4;
    const X0 = PB.x0 * CW, X1 = PB.x1 * CW, Y0 = PB.y0 * CH, Y1 = PB.y1 * CH, cx = (X0 + X1) / 2;
    const ln = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
    // corner brackets around the specimen
    const bx0 = X0 - 130, bx1 = X1 + 130, by0 = Y0 - 60, by1 = Y1 + 10, k = 40;
    [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]].forEach(([x, y, sx, sy]) => { ln(x, y, x + k * sx, y); ln(x, y, x, y + k * sy); });
    // crosshair through the centre of mass
    const cy = (Y0 + Y1) / 2 + 40; ln(bx0 - 120, cy, bx0 - 20, cy); ln(bx1 + 20, cy, bx1 + 120, cy); ln(cx, by0 - 120, cx, by0 - 20);
    g.beginPath(); g.arc(cx, by0 - 70, 9, 0, 7); g.stroke();
    // measurement ruler right of the specimen, 24 ticks
    const rx = bx1 + 60; ln(rx, Y0, rx, Y1);
    for (let i = 0; i <= 24; i++) { const y = Y1 - (Y1 - Y0) * i / 24; ln(rx, y, rx + (i % 6 === 0 ? 26 : 12), y); }
    g.font = '300 26px "IBM Plex Mono", monospace'; g.textAlign = 'left';
    g.fillText('0', rx + 36, Y1 + 8); g.fillText('12.0', rx + 36, (Y0 + Y1) / 2 + 8); g.fillText('24.0 CM', rx + 36, Y0 + 8);
    // leader lines to the parts
    const lead = (px, py, tx, ty, l1, l2) => { ln(px, py, tx, ty); ln(tx, ty, tx + (tx < cx ? -150 : 150), ty); g.beginPath(); g.arc(px, py, 5, 0, 7); g.stroke();
      g.textAlign = tx < cx ? 'right' : 'left'; const ox = tx < cx ? -160 : 160; g.fillText(l1, tx + ox, ty - 10); g.fillStyle = S.ink + '.45)'; g.fillText(l2, tx + ox, ty + 26); g.fillStyle = S.ink + '.75)'; };
    lead(cx - 30, Y0 + 20, X0 - 330, Y0 - 30, 'LOOP', '316 STEEL / Ø 4 MM');
    lead(cx + 60, Y0 + 95, X1 + 470, Y0 + 70, 'LID', 'BAMBOO / OILED');
    lead(cx - 70, Y0 + 330, X0 - 330, Y0 + 300, 'BODY', 'PWD-COAT / ' + v.coat);
    // elevation study from the photo outline, small, left
    g.fillStyle = S.ink + '.38)'; const fx = CW * .08, fy = CH * .5, fw = 300, fh = 400;
    pts.forEach(([x, y]) => g.fillRect(fx + x * fw, fy + y * fh, 1.6, 1.6));
    g.fillStyle = S.ink + '.6)'; g.textAlign = 'left'; g.font = '300 24px "IBM Plex Mono", monospace'; g.fillText('FIG. 1 — ELEVATION', fx, fy + fh + 40);
    // catalogue code, warm accent
    g.font = '400 30px "IBM Plex Mono", monospace'; g.fillStyle = S.accent; g.textAlign = 'left';
    g.fillText(`SPEC. ${v.code} / 24.0 CM / PWD-COAT`, bx0, by0 - 28);
    g.fillStyle = S.ink + '.5)'; g.font = '300 24px "IBM Plex Mono", monospace'; g.textAlign = 'right';
    g.fillText('KALPI SAMPLE ARCHIVE · LOT 0418', CW - 70, CH - 60);
  },
  b(g, S, v, pts, CW, CH) {
    paintBg(g, S, CW, CH);
    // low sun glow, warm haze band near the horizon
    const sg = g.createRadialGradient(CW * .18, CH * .58, 0, CW * .18, CH * .58, CH * .9); sg.addColorStop(0, 'rgba(255,214,160,.42)'); sg.addColorStop(1, 'rgba(255,214,160,0)'); g.fillStyle = sg; g.fillRect(0, 0, CW, CH);
    const hb = g.createLinearGradient(0, CH * .45, 0, CH * .75); hb.addColorStop(0, 'rgba(240,196,150,0)'); hb.addColorStop(.6, 'rgba(240,196,150,.25)'); hb.addColorStop(1, 'rgba(240,196,150,0)'); g.fillStyle = hb; g.fillRect(0, CH * .45, CW, CH * .3);
    g.save(); g.filter = 'blur(10px)'; g.fillStyle = 'rgba(255,240,218,.55)'; g.beginPath(); g.arc(CW * .18, CH * .6, 46, 0, 7); g.fill(); g.restore();
    // distant mesas, flat silhouettes in haze
    g.save(); g.filter = 'blur(7px)'; g.fillStyle = 'rgba(122,82,56,.22)'; g.beginPath(); g.moveTo(0, CH * .66);
    for (let x = 0; x <= CW; x += 40) g.lineTo(x, CH * .66 - (fbm(x * .004, 3) > .55 ? 60 + fbm(x * .01, 7) * 40 : fbm(x * .006, 1) * 30)); g.lineTo(CW, CH); g.lineTo(0, CH); g.fill(); g.restore();
    const cx = CW / 2, cy = (PB.y0 + PB.y1) / 2 * CH;
    g.lineWidth = 1.6;
    // orbits: thin ellipses, some dotted, with small bodies
    const orb = (rx, ry, rot, dotted, a, body) => {
      g.save(); g.translate(cx, cy); g.rotate(rot); g.strokeStyle = S.ink + a + ')'; g.setLineDash(dotted ? [2, 12] : []);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.stroke(); g.setLineDash([]);
      if (body != null) { g.fillStyle = S.ink + '.85)'; g.beginPath(); g.arc(Math.cos(body) * rx, Math.sin(body) * ry, 7, 0, 7); g.fill(); g.strokeStyle = S.ink + '.5)'; g.beginPath(); g.arc(Math.cos(body) * rx, Math.sin(body) * ry, 16, 0, 7); g.stroke(); }
      g.restore();
    };
    orb(470, 470, 0, false, '.38', 4.1);
    orb(620, 200, -.18, true, '.55', 5.6);
    orb(820, 300, .12, true, '.35', 2.4);
    orb(300, 560, 0, false, '.22', null);
    // arcs with radial ticks (a dial around the product)
    g.strokeStyle = S.ink + '.6)'; g.beginPath(); g.arc(cx, cy, 540, -2.6, -.55); g.stroke();
    for (let a = -2.6; a <= -.55; a += .05) { const r1 = 540, r2 = (Math.round((a + 2.6) / .05) % 5 === 0) ? 566 : 552; g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke(); }
    // glyphs: compositions of circles and strokes standing in for labels
    const glyph = (x, y, s) => { const r = U.rng(s); g.strokeStyle = S.ink + '.85)'; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const t = r(); if (t < .4) { g.beginPath(); g.arc(x + i * 34, y, 10 + r() * 6, r() * 3, r() * 3 + 3.5); g.stroke(); } else if (t < .7) { g.beginPath(); g.moveTo(x + i * 34 - 10, y + 12); g.lineTo(x + i * 34 + 10, y - 12); g.stroke(); g.beginPath(); g.arc(x + i * 34, y, 3, 0, 7); g.fill(); } else { g.beginPath(); g.arc(x + i * 34, y, 12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x + i * 34, y - 12); g.lineTo(x + i * 34, y + 12); g.stroke(); } }
      g.lineWidth = 1.6; };
    g.fillStyle = S.ink + '.85)';
    const tag = (px, py, tx, ty, s, label) => { g.strokeStyle = S.ink + '.55)'; g.setLineDash([3, 8]); g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(px, py, 6, 0, 7); g.stroke(); glyph(tx + (tx < cx ? -110 : 16), ty - 4, s);
      g.font = '400 20px "Syncopate", sans-serif'; g.fillStyle = S.ink + '.6)'; g.textAlign = tx < cx ? 'right' : 'left'; g.fillText(label, tx + (tx < cx ? -6 : 16), ty + 40); g.fillStyle = S.ink + '.85)'; };
    tag(cx - 25, PB.y0 * CH + 25, cx - 420, PB.y0 * CH - 70, 3, 'LOOP');
    tag(cx + 55, PB.y0 * CH + 95, cx + 430, PB.y0 * CH + 20, 8, 'LID');
    tag(cx - 70, PB.y0 * CH + 330, cx - 470, PB.y0 * CH + 360, 12, 'COAT');
    // tiny outline study on the right, dotted
    g.fillStyle = S.ink + '.5)'; const fx = CW * .8, fy = CH * .2, fw = 220, fh = 293; pts.forEach(([x, y], i) => { if (i % 2 === 0) g.fillRect(fx + x * fw, fy + y * fh, 1.8, 1.8); });
    g.strokeStyle = S.ink + '.4)'; g.beginPath(); g.arc(fx + fw / 2, fy + fh / 2, 190, 0, 7); g.stroke();
    // coordinates, mono, quiet
    g.font = '400 20px "Syncopate", sans-serif'; g.fillStyle = S.ink + '.55)'; g.textAlign = 'left';
    g.fillText('SOL 412 · 24.0 · ' + v.code, 70, CH - 60);
  },
  c(g, S, v, pts, CW, CH) {
    paintBg(g, S, CW, CH);
    // soft light falling from above
    const lg = g.createRadialGradient(CW / 2, -CH * .2, 0, CW / 2, -CH * .2, CH * 1.2); lg.addColorStop(0, 'rgba(70,150,140,.28)'); lg.addColorStop(1, 'rgba(70,150,140,0)'); g.fillStyle = lg; g.fillRect(0, 0, CW, CH);
    // sonar contour map (marching squares over a noise field), product sits in a basin
    const NX = 160, NY = 90, sx = CW / NX, sy = CH / NY, F = [];
    const cx = CW / 2, cy = (PB.y0 + PB.y1) / 2 * CH;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const x = i * sx, y = j * sy; const d = Math.hypot((x - cx) / CW, (y - cy) / CH * .6);
      F.push(fbm(i * .045 + 2, j * .045) * .9 + d * 1.4); }
    const f = (i, j) => F[j * (NX + 1) + i];
    g.lineWidth = 1.3;
    for (let L = 0; L < 18; L++) {
      const lev = .3 + L * .07; g.strokeStyle = (L % 5 === 0 ? S.ink + '.38)' : S.ink + '.16)');
      g.beginPath();
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const a = f(i, j), b = f(i + 1, j), c = f(i + 1, j + 1), d = f(i, j + 1);
        const e = []; const it = (p, q, x0, y0, x1, y1) => { if ((p - lev) * (q - lev) < 0) { const t = (lev - p) / (q - p); e.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); } };
        const X = i * sx, Y = j * sy;
        it(a, b, X, Y, X + sx, Y); it(b, c, X + sx, Y, X + sx, Y + sy); it(c, d, X + sx, Y + sy, X, Y + sy); it(d, a, X, Y + sy, X, Y);
        if (e.length >= 2) { g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); if (e.length === 4) { g.moveTo(e[2][0], e[2][1]); g.lineTo(e[3][0], e[3][1]); } }
      }
      g.stroke();
    }
    // sonar rings + depth soundings, warm amber
    g.strokeStyle = 'rgba(224,161,94,.32)'; [520, 700].forEach(r => { g.setLineDash([2, 10]); g.beginPath(); g.ellipse(cx, cy + 120, r, r * .32, 0, 0, 7); g.stroke(); }); g.setLineDash([]);
    g.font = '300 24px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(224,161,94,.7)'; g.textAlign = 'left';
    [[.18, .3, '−3 412 M'], [.74, .26, '−3 388 M'], [.82, .62, '−3 430 M'], [.12, .72, '−3 455 M']].forEach(([x, y, t]) => { g.beginPath(); g.arc(x * CW, y * CH, 4, 0, 7); g.fill(); g.fillText(t, x * CW + 14, y * CH + 8); });
    // labels to the parts, thin and quiet
    g.strokeStyle = S.ink + '.45)'; g.fillStyle = S.ink + '.7)';
    const lead = (px, py, tx, ty, t) => { g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke(); g.beginPath(); g.arc(px, py, 4, 0, 7); g.stroke(); g.textAlign = tx < cx ? 'right' : 'left'; g.fillText(t, tx + (tx < cx ? -12 : 12), ty + 8); };
    lead(cx - 30, PB.y0 * CH + 20, cx - 380, PB.y0 * CH - 40, 'LOOP · STEEL');
    lead(cx + 60, PB.y0 * CH + 95, cx + 400, PB.y0 * CH + 50, 'LID · BAMBOO');
    lead(cx + 70, PB.y0 * CH + 330, cx + 420, PB.y0 * CH + 330, 'COAT · ' + v.coat);
    g.textAlign = 'right'; g.fillStyle = S.ink + '.45)'; g.fillText('TRENCH SURVEY · ' + v.code, CW - 70, CH - 60);
  },
};

function build(styleId) {
  const S = STYLES[styleId];
  return async function (stage, section) {
    const r = stage.renderer, KM = window.KalpiMaterials;
    const scene = stage.scene = new THREE.Scene();
    scene.background = U.lin(S.bgBot);
    const cam = stage.camera = new THREE.PerspectiveCamera(26, 16 / 9, .1, 60);
    scene.environment = KM.studioEnv(r, S.env);
    try { await Promise.all(['300 40px "IBM Plex Mono"', '400 40px "IBM Plex Mono"', '400 40px "Syncopate"', '700 40px "Syncopate"', '200 200px "Inter Tight"'].map(f => document.fonts.load(f))); } catch (e) { /* fallback fonts */ }
    const [glbs, imgs] = await Promise.all([
      Promise.all(KEYS.map(k => U.gltf(ROOT + 'media/example-bottle/' + V[k].glb))),
      Promise.all(KEYS.map(k => loadImg(ROOT + 'media/example-bottle/' + V[k].photo))),
    ]);
    const traces = imgs.map(im => { if (!im) return []; const p = tracePoints(im); const b = bbox(p); return p.filter(([x, y]) => x >= b.x0 - .02 && x <= b.x1 + .02 && y >= b.y0 - .02 && y <= b.y1 + .02).map(([x, y]) => [(x - b.x0) / (b.y1 - b.y0), (y - b.y0) / (b.y1 - b.y0)]); });

    /* floor that dissolves into the backdrop colour */
    const refl = U.PlanarReflection(r, { scale: .5, blur: 3 });
    const floorM = new THREE.MeshStandardMaterial({ color: U.lin(S.floor), roughness: S.floorRough, envMapIntensity: .25 });
    refl.patch(floorM, S.refl);
    const bgL = U.lin(S.bgBot).multiplyScalar(1.55 / S.exposure);
    { const ob = floorM.onBeforeCompile; floorM.onBeforeCompile = sh => { ob(sh); sh.uniforms.kBg = { value: bgL };
      sh.vertexShader = 'varying vec3 vFw;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vFw = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = 'varying vec3 vFw; uniform vec3 kBg;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'outgoingLight = mix(kBg, outgoingLight, exp(-max(length(vFw.xz * vec2(.7, 1.)) - .35, 0.) * 2.6)); gl_FragColor = vec4( outgoingLight, diffuseColor.a );'); }; }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    refl.hide.push(floor);

    /* products: original materials, plus a scan band (a) or an oil-slick rim (c) */
    const pu = { kT: { value: 0 }, kScan: { value: S.scan ? 1 : 0 }, kIri: { value: S.iri } };
    const prods = glbs.map((g, i) => { const p = U.fit(g.scene, 1.0, 0); p.visible = i === 0; scene.add(p);
      p.traverse(o => { if (!o.isMesh) return; const m = o.material; m.envMapIntensity = S.envI;
        m.onBeforeCompile = sh => { Object.assign(sh.uniforms, pu);
          sh.vertexShader = 'varying vec3 vPw;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vPw = (modelMatrix * vec4(transformed, 1.)).xyz;');
          sh.fragmentShader = 'uniform float kT, kScan, kIri; varying vec3 vPw;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `
            float kF = pow(1. - abs(dot(normal, normalize(vViewPosition))), 3.);
            vec3 iri = .5 + .5 * cos(6.2831 * (kF * 1.3 + vPw.y * .6 + vec3(0., .33, .67)));
            outgoingLight += kIri * iri * kF * .22;
            float sy = fract(kT * .08) * 1.3 - .1;
            outgoingLight += kScan * vec3(.9, .95, 1.) * .08 * exp(-pow((vPw.y - sy) * 60., 2.));
            gl_FragColor = vec4( outgoingLight, diffuseColor.a );`); };
        m.needsUpdate = true; });
      return p; });
    const cs = U.contactShadow(prods[0].userData.size.x * .5, styleId === 'a' ? .6 : .85); scene.add(cs);

    /* boards: backdrop + annotations (opaque), and the type layer in front of it */
    const CW = 2400, CH = 1350;
    const mkBoard = (z, opaque) => {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      const m = new THREE.MeshBasicMaterial({ map: t, transparent: !opaque, depthWrite: !!opaque, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); mesh.position.z = z; scene.add(mesh); refl.hide.push(mesh);
      return { c, g: c.getContext('2d'), t, m, mesh };
    };
    const board = mkBoard(-.75, true), type = mkBoard(-.6, false);
    const look = new THREE.Vector3(0, .85, 0);
    const fitBoard = (b, cover) => { const d = cam.position.z - b.mesh.position.z; const h = 2 * d * Math.tan(cam.fov * Math.PI / 360); const vw = h * cam.aspect;
      if (!cover && vw < h * CW / CH) b.mesh.scale.set(vw, vw * CH / CW, 1); else b.mesh.scale.set(h * CW / CH, h, 1);
      b.mesh.position.y = cam.position.y + (look.y - cam.position.y) * (d / cam.position.z); };
    // board colour is unlit, so show it at display brightness after the tone curve: compensate exposure roughly
    board.m.color.setScalar(1.55 / S.exposure);

    const drawType = k => {
      const g = type.g, v = V[k]; g.clearRect(0, 0, CW, CH); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = S.smallCol || S.textCol; g.globalAlpha = .8; g.font = S.smallFont;
      if ('letterSpacing' in g) g.letterSpacing = '12px';
      g.fillText(S.small, CW / 2, CH * .09); g.globalAlpha = 1;
      const px = Math.round(CH * S.nameSize); g.font = S.nameFont(px);
      if ('letterSpacing' in g) g.letterSpacing = Math.round(px * S.nameTrack) + 'px';
      const nm = styleId === 'b' ? v.name.toUpperCase() : v.name;
      // version-tinted, muted: blend the version colour into the scene's text colour
      const c1 = new THREE.Color(S.nameBase || S.textCol), c2 = new THREE.Color(v.tint); c1.lerp(c2, S.nameMix);
      g.fillStyle = '#' + c1.getHexString(); g.fillText(nm, CW / 2, CH * (styleId === 'b' ? .3 : styleId === 'a' ? .3 : .335));
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      type.t.needsUpdate = true;
    };
    const drawBoard = idx => { painters[styleId](board.g, S, V[KEYS[idx]], traces[idx], CW, CH); board.t.needsUpdate = true; };

    // scan line across the whole specimen (a)
    let scanLine = null;
    if (S.scan) { scanLine = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: U.lin('#A85A3C'), transparent: true, opacity: .35, depthWrite: false })); scanLine.position.z = .45; scanLine.layers.set(1); scene.add(scanLine); }

    let cur = 0, swapT = -10;
    const setVersion = (idx, t) => {
      cur = idx; swapT = t; prods.forEach((p, i) => { p.visible = i === idx; });
      drawType(KEYS[idx]); drawBoard(idx);
      if (section && !U.FILM) {
        const v = V[KEYS[idx]];
        section.style.setProperty('--vc', v.tint);
        section.querySelector('.r5vn').textContent = 'Version ' + KEYS[idx];
        section.querySelector('.r5h').textContent = v.name; section.querySelector('.r5p').textContent = v.line;
        section.querySelectorAll('.pills button').forEach(b => b.classList.toggle('on', b.dataset.v === KEYS[idx]));
      }
    };
    setVersion(0, 0);
    let lastT = 0, userT = -100;
    if (section && !U.FILM) section.querySelectorAll('.pills button').forEach(b => b.addEventListener('click', () => { userT = lastT; setVersion(KEYS.indexOf(b.dataset.v), lastT); }));

    /* light: neutral key so the coat stays true; style lives in fill, env and air */
    const key = new THREE.DirectionalLight(U.lin(S.key[0]), S.key[1]);
    key.position.set(styleId === 'b' ? -4 : -1.2, styleId === 'b' ? 2.2 : 5, styleId === 'b' ? 2.2 : 2.2); key.target.position.set(0, .5, 0); scene.add(key, key.target);
    key.castShadow = true; const sc = key.shadow.camera; sc.left = -2.5; sc.right = 2.5; sc.top = 2.5; sc.bottom = -2.5; sc.near = 1; sc.far = 12;
    key.shadow.mapSize.set(U.HI ? 4096 : 2048, U.HI ? 4096 : 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .01; key.shadow.radius = 11 * Math.tan(4 * Math.PI / 180) / 5;
    const fill = new THREE.DirectionalLight(U.lin(S.fill[0]), S.fill[1]); fill.position.set(2.5, 1.5, 4); scene.add(fill);
    stage.setKeyLight(key, 1);

    let parts = [];
    if (S.particles) {
      const P = S.particles;
      const mk = (col, seed) => { const p = U.particles({ count: U.HI ? P.n : P.n / 3 | 0, seed, min: new THREE.Vector3(-4, 0, -.5), size: new THREE.Vector3(8, 2.6, 3.8), wind: new THREE.Vector3(...P.wind), wander: .25, sizePx: P.size, color: U.lin(col), ambient: 1, gain: P.gain, aperture: .3 }); scene.add(p); return p; };
      parts.push(mk(P.col, 31)); if (P.col2) parts.push(mk(P.col2, 32));
    }

    const a = stage.atmos.uniforms;
    a.density.value = S.atmos.density; a.heightFall.value = S.atmos.heightFall; a.noiseScale.value = .9; a.noiseAmt.value = .6; a.wind.value.set(.05, .01, 0);
    a.ambCol.value.copy(U.lin(S.atmos.amb[0])).multiplyScalar(S.atmos.amb[1]);
    if (S.atmos.sun) a.lightCol.value.copy(U.lin(S.atmos.sun[0])).multiplyScalar(S.atmos.sun[1]); else a.lightCol.value.set(0, 0, 0);
    a.maxDist.value = 10; a.phaseG.value = .55; a.extinction.value = 1; a.skyFog.value = 1;
    const f = stage.final.uniforms; f.exposure.value = S.exposure; f.grain.value = S.grain; f.vignette.value = S.vignette; f.lift.value.set(...S.lift); f.sat.value = S.sat; f.ca.value = .0008;
    stage.bloom.strength = S.bloom[0]; stage.bloom.threshold = S.bloom[1]; stage.bloom.radius = .4;
    stage.aperture = .12; stage.focusRange = .6;
    stage.preRender.push(() => refl.render(scene, cam));

    return function update(t, ptr) {
      lastT = t; pu.kT.value = t;
      if (U.FILM) { const idx = Math.floor(t / 3.4) % 3; if (idx !== cur) setVersion(idx, Math.floor(t / 3.4) * 3.4); }
      else if (t - userT > 8 && t - swapT > 7) setVersion((cur + 1) % 3, t);
      const k = U.ease(Math.min(1, (t - swapT) / .7));
      type.m.opacity = k; const p = prods[cur]; p.rotation.y = t * .25 + Math.sin(t * .2) * .2; p.scale.setScalar(.96 + .04 * k);
      parts.forEach(q => { q.material.uniforms.t.value = t; q.material.uniforms.pr.value = stage.dpr; q.material.uniforms.focus.value = stage.focus; });
      const hh = U.handheld(t, .003);
      const cz = 4.2 * Math.pow(Math.max(1, 1.6 / cam.aspect), .75);
      cam.position.set(hh.x + ptr.x * .1, .95 + hh.y + ptr.y * .04, cz); cam.lookAt(look); cam.rotateZ(hh.rz * .2);
      fitBoard(board, true); fitBoard(type, false);
      board.mesh.position.x = type.mesh.position.x = cam.position.x * .9;
      if (scanLine) { const sy = (t * .08 % 1) * 1.3 - .1; scanLine.scale.set(board.mesh.scale.x, .0035, 1); scanLine.position.y = sy; scanLine.material.opacity = .3 * Math.sin(Math.PI * Math.min(1, Math.max(0, (sy + .1) / 1.3))); }
      stage.focus = cam.position.distanceTo(new THREE.Vector3(0, .5, 0));
    };
  };
}
window.SCENES.r5a = build('a');
window.SCENES.r5b = build('b');
window.SCENES.r5c = build('c');
})();
