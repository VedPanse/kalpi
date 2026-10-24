/* R5 · Choose your version: oryzo-style product section. Cream display type behind a photoreal bottle on black,
   glowing hand-drawn annotations traced from the product photo, version pills that swap product + glow. */
(function () {
const { U, THREE } = window.RICH;
const ROOT = '../../../';
window.SCENES = window.SCENES || {};
const V = {
  A: { name: 'Terracotta', col: '#D9714B', glb: '3d-terracotta.glb', photo: 'terracotta.png', line: 'Same bottle, warm terracotta coat. 41 sample votes.' },
  B: { name: 'Navy', col: '#5C7CFF', glb: '3d-navy.glb', photo: 'navy.png', line: 'Same bottle, deep navy coat. 27 sample votes.' },
  C: { name: 'Cream', col: '#F1D9A8', glb: '3d-cream.glb', photo: 'cream.png', line: 'Same bottle, soft cream coat. 19 sample votes.' },
};
const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

/* trace the product photo into edge pixels (Sobel), returned as a canvas of white strokes on transparent */
function trace(img) {
  const w = 432, h = 576, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = .3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2];
  const out = g.createImageData(w, h); const rnd = U.rng(4);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
    const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
    const m = Math.sqrt(gx * gx + gy * gy);
    if (m > 46 && rnd() > .12) { const a = Math.min(255, (m - 46) * 4); out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = 255; out.data[i * 4 + 3] = a; }
  }
  g.clearRect(0, 0, w, h); g.putImageData(out, 0, 0); return c;
}

window.SCENES.r5 = async function (stage, section) {
  const r = stage.renderer, KM = window.KalpiMaterials;
  const scene = stage.scene = new THREE.Scene();
  const cam = stage.camera = new THREE.PerspectiveCamera(26, 16 / 9, .1, 60);
  scene.environment = KM.studioEnv(r, { rim: '#ffffff', floor: '#050505' });
  try { await Promise.all([document.fonts.load('400 200px "Instrument Serif"'), document.fonts.load('600 60px "Caveat"'), document.fonts.load('500 30px "JetBrains Mono"')]); } catch (e) { /* fallback fonts */ }
  const keys = Object.keys(V);
  const [glbs, imgs] = await Promise.all([
    Promise.all(keys.map(k => U.gltf(ROOT + 'media/example-bottle/' + V[k].glb))),
    Promise.all(keys.map(k => loadImg(ROOT + 'media/example-bottle/' + V[k].photo))),
  ]);
  const traces = imgs.map((im, i) => { if (!im) return null; const tr = trace(im); const g = tr.getContext('2d'); g.globalCompositeOperation = 'source-in'; g.fillStyle = V[keys[i]].col; g.fillRect(0, 0, tr.width, tr.height); return tr; });

  /* black glossy floor */
  const refl = U.PlanarReflection(r, { scale: .5, blur: 2 });
  const floorM = new THREE.MeshStandardMaterial({ color: U.lin('#050505'), roughness: .3, envMapIntensity: .05 });
  refl.patch(floorM, .45);
  { const ob = floorM.onBeforeCompile; floorM.onBeforeCompile = sh => { ob(sh); sh.vertexShader = 'varying vec3 vFw;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vFw = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vFw;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'outgoingLight *= exp(-max(length(vFw.xz * vec2(.7, 1.)) - .5, 0.) * 1.6); gl_FragColor = vec4( outgoingLight, diffuseColor.a );'); }; }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  refl.hide.push(floor);

  /* products */
  const prods = glbs.map((g, i) => { const p = U.fit(g.scene, 1.0, 0); p.visible = i === 0; scene.add(p); p.traverse(o => { if (o.isMesh) o.material.envMapIntensity = .75; }); return p; });
  const cs = U.contactShadow(prods[0].userData.size.x * .5, .9); scene.add(cs);

  /* type + sketch boards (canvas textures behind the product) */
  const CW = 2400, CH = 1350;
  const mkBoard = (z, additive) => {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); mesh.position.z = z; scene.add(mesh);
    return { c, g: c.getContext('2d'), t, m, mesh };
  };
  const sketch = mkBoard(-.75, true), type = mkBoard(-.6, false);
  refl.hide.push(sketch.mesh, type.mesh);
  // size the boards to fill the view at their depth
  const fitBoard = (b) => { const d = cam.position.z - b.mesh.position.z; const h = 2 * d * Math.tan(cam.fov * Math.PI / 360); const vw = h * cam.aspect; if (vw < h * CW / CH) b.mesh.scale.set(vw, vw * CH / CW, 1); else b.mesh.scale.set(h * CW / CH, h, 1); b.mesh.position.y = cam.position.y + (look.y - cam.position.y) * (d / cam.position.z); };
  const look = new THREE.Vector3(0, .85, 0);
  cam.position.set(0, .95, 4.2); cam.lookAt(look);

  const drawType = (k, glow) => {
    const g = type.g, v = V[k]; g.clearRect(0, 0, CW, CH);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(239,230,214,.92)'; g.font = '400 76px "Instrument Serif", Georgia, serif'; g.fillText('Choose yours', CW / 2, CH * .085);
    g.font = `400 ${Math.round(CH * .27)}px "Instrument Serif", Georgia, serif`;
    g.save(); g.shadowColor = v.col; g.shadowBlur = 90 * glow; g.fillStyle = '#EFE6D6'; g.fillText(v.name, CW / 2, CH * .335); g.restore();
    g.fillStyle = '#EFE6D6'; g.fillText(v.name, CW / 2, CH * .335);
    type.t.needsUpdate = true;
  };
  const wob = (x, y, s) => [x + Math.sin(y * .013 + s) * 3 + Math.sin(y * .051 + s * 2) * 1.2, y + Math.sin(x * .017 + s) * 3];
  const line = (g, pts, s) => { g.beginPath(); pts.forEach((p, i) => { const q = wob(p[0], p[1], s); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); };
  const arrow = (g, x0, y0, x1, y1, s) => {
    const pts = []; const mx = (x0 + x1) / 2 + (y1 - y0) * .25, my = (y0 + y1) / 2 - (x1 - x0) * .2;
    for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([(1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * mx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * my + t * t * y1]); }
    line(g, pts, s); const a = Math.atan2(y1 - pts[22][1], x1 - pts[22][0]);
    line(g, [[x1 - Math.cos(a - .45) * 22, y1 - Math.sin(a - .45) * 22], [x1, y1], [x1 - Math.cos(a + .45) * 22, y1 - Math.sin(a + .45) * 22]], s + 1);
  };
  const drawSketch = (idx) => {
    const g = sketch.g, k = keys[idx], v = V[k]; g.clearRect(0, 0, CW, CH);
    const ink = (pass) => {
      g.save();
      g.strokeStyle = g.fillStyle = v.col; g.lineWidth = pass ? 2.2 : 7; g.globalAlpha = pass ? .95 : .35; g.lineCap = g.lineJoin = 'round';
      if (!pass) g.filter = 'blur(9px)';
      const tr = traces[idx];
      if (tr) {
        // big ghost trace behind the product, a small side study left, a top-down study right
        g.globalAlpha = pass ? .4 : .2; g.drawImage(tr, CW / 2 - 560 + 60, CH * .2, 1120, 1493);
        g.globalAlpha = pass ? .85 : .35; g.drawImage(tr, CW * .08, CH * .42, 330, 440);
      }
      g.globalAlpha = pass ? .9 : .4;
      // top view study (circles) right
      const cx = CW * .84, cy = CH * .62; for (let i = 0; i < 3; i++) { const pts = []; const rr = [110, 92, 40][i]; for (let a = 0; a <= 6.4; a += .1) pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .42]); line(g, pts, i * 3); }
      line(g, [[cx - 130, cy + 80], [cx + 130, cy + 80]], 9); line(g, [[cx - 130, cy + 70], [cx - 130, cy + 90]], 2); line(g, [[cx + 130, cy + 70], [cx + 130, cy + 90]], 3);
      // dimension on the side study
      line(g, [[CW * .1 + 330, CH * .47], [CW * .1 + 330, CH * .44 + 380]], 4);
      // arrows to the parts
      arrow(g, CW * .3, CH * .5, CW * .455, CH * .54, 1);
      arrow(g, CW * .69, CH * .45, CW * .535, CH * .505, 2);
      arrow(g, CW * .7, CH * .74, CW * .55, CH * .7, 3);
      g.font = '600 64px "Caveat", cursive'; g.textAlign = 'left';
      if (pass) { g.fillText('steel loop', CW * .19, CH * .48); g.fillText('bamboo lid', CW * .69, CH * .43); g.fillText('matte powder coat', CW * .66, CH * .8); g.font = '600 46px "Caveat", cursive'; g.fillText('24 cm', CW * .1 + 345, CH * .66); g.fillText('top view', cx - 70, cy + 140); }
      g.restore();
    };
    ink(0); ink(1); sketch.t.needsUpdate = true;
  };
  let cur = 0, swapT = -10;
  const setVersion = (idx, t) => {
    cur = idx; swapT = t; prods.forEach((p, i) => { p.visible = i === idx; });
    drawType(keys[idx], 1); drawSketch(idx);
    if (section && !U.FILM) {
      const v = V[keys[idx]];
      section.style.setProperty('--glowc', v.col);
      section.querySelector('#r5vn').textContent = 'Version ' + keys[idx];
      section.querySelector('#r5h').textContent = v.name; section.querySelector('#r5p').textContent = v.line;
      section.querySelectorAll('#r5pills button').forEach(b => b.classList.toggle('on', b.dataset.v === keys[idx]));
    }
  };
  setVersion(0, 0);
  let lastT = 0, userT = -100;
  if (section && !U.FILM) {
    const tp = section.querySelector('.r5type'); if (tp) tp.style.display = 'none';
    section.querySelectorAll('#r5pills button').forEach(b => b.addEventListener('click', () => { userT = lastT; setVersion(keys.indexOf(b.dataset.v), lastT); }));
  }

  /* lights: soft key from upper left, cool fill, version-coloured rim from behind */
  const key = new THREE.DirectionalLight(U.lin('#FFF4EA'), 2.2); key.position.set(-3, 5, 3.2); key.target.position.set(0, .5, 0); scene.add(key, key.target);
  key.castShadow = true; const sc = key.shadow.camera; sc.left = -2; sc.right = 2; sc.top = 2; sc.bottom = -2; sc.near = 2; sc.far = 12;
  key.shadow.mapSize.set(U.HI ? 4096 : 2048, U.HI ? 4096 : 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .01; key.shadow.radius = (10 * Math.tan(4 * Math.PI / 180)) / 4;
  const fillL = new THREE.DirectionalLight(U.lin('#E6ECF5'), .35); fillL.position.set(3, 1.5, 4); scene.add(fillL);
  const rimU = { kRimC: { value: new THREE.Color() } };
  prods.forEach(p => p.traverse(o => { if (!o.isMesh) return; const m = o.material; m.onBeforeCompile = sh => { sh.uniforms.kRimC = rimU.kRimC;
    sh.fragmentShader = 'uniform vec3 kRimC;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'float kF = pow(1. - abs(dot(normal, normalize(vViewPosition))), 3.); outgoingLight += kRimC * kF * 1.4; gl_FragColor = vec4( outgoingLight, diffuseColor.a );'); };
    m.needsUpdate = true; }));
  stage.setKeyLight(key, 0);

  const a = stage.atmos.uniforms;
  a.density.value = .03; a.heightFall.value = .4; a.noiseScale.value = .8; a.noiseAmt.value = .6; a.wind.value.set(.04, .01, 0);
  a.lightCol.value.set(0, 0, 0); a.ambCol.value.copy(U.lin(V.A.col)).multiplyScalar(.06); a.maxDist.value = 12; a.useShadow.value = 0;
  const f = stage.final.uniforms; f.exposure.value = 1.0; f.grain.value = .045; f.vignette.value = .55; f.lift.value.set(0, 0, 0); f.sat.value = 1;
  stage.bloom.strength = .55; stage.bloom.threshold = .7; stage.bloom.radius = .5;
  stage.aperture = .12; stage.focusRange = 0.6;
  stage.preRender.push(() => refl.render(scene, cam));

  const glowC = new THREE.Color(), tmp = new THREE.Color();
  return function update(t, ptr) {
    lastT = t;
    if (U.FILM) { const idx = Math.floor(t / 3.4) % 3; if (idx !== cur) setVersion(idx, Math.floor(t / 3.4) * 3.4); }
    else if (t - userT > 8 && t - swapT > 6) setVersion((cur + 1) % 3, t);
    tmp.copy(U.lin(V[keys[cur]].col)); glowC.lerp(tmp, U.FILM ? 1 : .08);
    rimU.kRimC.value.copy(glowC); a.ambCol.value.copy(glowC).multiplyScalar(.05);
    const k = Math.min(1, (t - swapT) / .6);
    sketch.m.color.setScalar(1.6 + 1.6 * (1 - U.ease(k)));
    sketch.m.opacity = U.ease(Math.min(1, (t - swapT) / .9));
    const p = prods[cur]; p.rotation.y = t * .3 + Math.sin(t * .2) * .2;
    const s = .94 + .06 * U.ease(k); p.scale.setScalar(s);
    const hh = U.handheld(t, .004);
    const cz = 4.2 * Math.pow(Math.max(1, 1.6 / cam.aspect), .75);   // portrait phones: step back so the product fits
    cam.position.set(hh.x + ptr.x * .12, .95 + hh.y + ptr.y * .05, cz);
    cam.lookAt(look); cam.rotateZ(hh.rz * .2);
    fitBoard(sketch); fitBoard(type);
    sketch.mesh.position.x = type.mesh.position.x = cam.position.x * .9;
    stage.focus = cam.position.distanceTo(new THREE.Vector3(0, .5, 0));
  };
};
})();
