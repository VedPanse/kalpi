/* R1 · Morning marble: a marble counter against a plaster wall; low morning sun through a mullioned
   window (real geometry casts the frame shadow), a sheer curtain and a branch outside sway in the beam. */
(function () {
const { U, THREE } = window.RICH;
const A = 'assets/';
const ROOT = '../../../';

window.SCENES = window.SCENES || {};
window.SCENES.r1 = async function (stage) {
  const r = stage.renderer;
  const scene = stage.scene = new THREE.Scene();
  const cam = stage.camera = new THREE.PerspectiveCamera(24, 16 / 9, .03, 40);

  const [hdr, marble, marbleR, plaster, sage, perf] = await Promise.all([
    U.hdr(A + 'kiara_interior_1k.hdr'),
    U.tex(r, A + 'marble_veined_2k.jpg', { srgb: true }), U.tex(r, A + 'marble_veined_rough_1k.jpg'),
    U.tex(r, A + 'plastered_wall_02_diff_1k.jpg', { srgb: true, repeat: [3, 1.5] }),
    U.gltf(ROOT + 'media/example-bottle/3d-sage.glb'),
    U.gltf(ROOT + 'team-notes/design-options/3d-test/lipstick/perfume-parts.glb'),
  ]);
  const pm = new THREE.PMREMGenerator(r);
  U.tintHDR(hdr, [1.15, .85, .52], 6, .45);
  U.aimHDR(hdr, new THREE.Vector3(-1, 0, .42));
  const env = pm.fromEquirectangular(hdr).texture; pm.dispose();
  scene.environment = env;

  /* key light: low morning sun from the left window */
  const L = new THREE.Vector3(-1, .6, .42).normalize();
  const sun = new THREE.DirectionalLight(U.lin('#FFDDB8'), 2.5);
  sun.position.copy(L).multiplyScalar(7); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -2.6; sc.right = 2.6; sc.top = 2.6; sc.bottom = -2.6; sc.near = .5; sc.far = 13;
  sun.shadow.mapSize.set(U.HI ? 4096 : 2048, U.HI ? 4096 : 2048);
  sun.shadow.bias = -.0002; sun.shadow.normalBias = .002;
  sun.shadow.radius = (sc.far - sc.near) * Math.tan(1.1 * Math.PI / 180) / (sc.right - sc.left);
  stage.setKeyLight(sun, 0);
  /* soft bounce from the room behind the camera (keeps the product's true colour on its shaded side) */
  const fill = new THREE.DirectionalLight(U.lin('#F3F6F2'), .42); fill.position.set(1.2, .5, 2.2); scene.add(fill);

  /* marble counter */
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, .04, 1.9), new THREE.MeshPhysicalMaterial({
    map: marble, roughnessMap: marbleR, roughness: 1, metalness: 0, clearcoat: .3, clearcoatRoughness: .1, envMapIntensity: .3,
  }));
  top.position.set(-.1, -.02, .23); top.receiveShadow = true; scene.add(top);
  /* plaster walls */
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, color: U.lin('#E9DCCB'), roughness: .95, envMapIntensity: .38 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), wallMat); back.position.set(0, 1.5, -.72); back.receiveShadow = true; scene.add(back);
  // left wall with a window opening (boxes around the hole, so the reveal has depth)
  const wx = -1.5, oy0 = .32, oy1 = 1.66, oz0 = -.12, oz1 = 1.02, th = .18;
  const wallL = new THREE.MeshStandardMaterial({ color: U.lin('#E6D8C6'), roughness: .95, envMapIntensity: .5 });
  const box = (sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m || wallL); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
  box(th, oy0 + 1, 6, wx - th / 2, (oy0 - 1) / 2, 1.3);                  // below
  box(th, 3.5, 6, wx - th / 2, oy1 + 1.75, 1.3);                          // above
  box(th, oy1 - oy0, oz0 + 3, wx - th / 2, (oy0 + oy1) / 2, (oz0 - 3) / 2); // behind (toward back wall)
  box(th, oy1 - oy0, 4, wx - th / 2, (oy0 + oy1) / 2, oz1 + 2);          // front
  // window frame + mullions (painted wood)
  const frameM = new THREE.MeshStandardMaterial({ color: U.lin('#F1ECE4'), roughness: .6 });
  const fz = (oz0 + oz1) / 2, fy = (oy0 + oy1) / 2, fw = oz1 - oz0, fh = oy1 - oy0;
  box(.06, .05, fw, wx - .06, fy, fz, frameM);
  box(.06, .05, fw, wx - .06, oy0 + fh * .27, fz, frameM);
  box(.06, .05, fw, wx - .06, oy0 + fh * .73, fz, frameM);
  box(.06, fh, .05, wx - .06, fy, fz, frameM);
  box(.06, .07, fw, wx - .06, oy0 + .035, fz, frameM); box(.06, .07, fw, wx - .06, oy1 - .035, fz, frameM);
  box(.06, fh, .07, wx - .06, fy, oz0 + .035, frameM); box(.06, fh, .07, wx - .06, fy, oz1 - .035, frameM);
  // bright morning outside (only seen if the frame edge shows the window)
  const out = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ color: U.lin('#FFF4E6').multiplyScalar(5) }));
  out.position.set(-4.2, 1.5, .5); out.rotation.y = Math.PI / 2; scene.add(out);

  /* sheer curtain + a branch outside: shadow casters only, swaying (alpha-mapped depth materials) */
  const swayU = { kT: { value: 0 } };
  const swayDepth = (alphaMap, amp, freq) => {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap, alphaTest: .5, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.kT = swayU.kT;
      sh.vertexShader = 'uniform float kT; attribute vec3 sway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = sway.z;
        transformed += vec3(sin(kT * ${freq.toFixed(3)} + ph + position.y * 2.) * ${amp.toFixed(3)}, 0., sin(kT * ${(freq * .7).toFixed(3)} + ph * 1.3 + position.y * 3.) * ${(amp * 1.6).toFixed(3)}) * sway.x;`);
    };
    return m;
  };
  const canvasTex = (draw, n) => { const c = document.createElement('canvas'); c.width = c.height = n || 256; draw(c.getContext('2d'), c.width); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  // curtain: a loose linen weave (about 40 % open)
  const weave = canvasTex((g, n) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, n, n); const rnd = U.rng(5);
    for (let i = 0; i < 3200; i++) { g.fillStyle = `rgba(255,255,255,${.35 + rnd() * .4})`; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 6, 1 + rnd() * 2); }
    for (let i = 0; i < n; i += 4) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(i, 0, 1.4, n); }
  });
  weave.repeat.set(6, 8);
  const curtG = new THREE.PlaneGeometry(.62, 1.55, 12, 30);
  { const n = curtG.attributes.position.count, sw = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const y = curtG.attributes.position.getY(i); sw[i * 3] = (.78 - y) / 1.55 * .9 + .1; sw[i * 3 + 2] = curtG.attributes.position.getX(i) * 4; } curtG.setAttribute('sway', new THREE.BufferAttribute(sw, 3)); }
  const curtain = new THREE.Mesh(curtG, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  curtain.rotation.y = Math.PI / 2; curtain.position.set(wx + .05, fy + .02, oz1 - .22);
  curtain.castShadow = true; curtain.customDepthMaterial = swayDepth(weave, .05, .55); scene.add(curtain);
  stage.hideInDepth.push(curtain);
  // branch: ~60 leaves along a twig, outside the window in the sun's path
  const leafTex = canvasTex((g, n) => { g.fillStyle = '#000'; g.fillRect(0, 0, n, n); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(n / 2, n / 2, n * .2, n * .46, 0, 0, Math.PI * 2); g.fill(); g.fillRect(n * .48, n * .8, n * .04, n * .2); }, 128);
  const leaves = []; const rnd = U.rng(9);
  const base = new THREE.Vector3(0, .1, .2).add(L.clone().multiplyScalar(2.9));
  for (let i = 0; i < 70; i++) {
    const g = new THREE.PlaneGeometry(.07, .13); const s = .7 + rnd() * .6; g.scale(s, s, s);
    g.rotateZ((rnd() - .5) * 2.4); g.rotateX((rnd() - .5) * 1.2); g.rotateY(rnd() * 3);
    const t = rnd();
    const p = base.clone().add(new THREE.Vector3(0, -t * .55 + (rnd() - .5) * .25, -t * .65 + (rnd() - .5) * .3)).add(new THREE.Vector3(rnd() - .5, 0, 0).multiplyScalar(.4));
    g.translate(p.x, p.y, p.z);
    const n = g.attributes.position.count, sw = new Float32Array(n * 3); for (let k = 0; k < n; k++) { sw[k * 3] = .4 + t * .8; sw[k * 3 + 2] = i * .37; }
    g.setAttribute('sway', new THREE.BufferAttribute(sw, 3)); leaves.push(g);
  }
  const leafG = mergeGeoms(leaves);
  const branch = new THREE.Mesh(leafG, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  branch.castShadow = true; branch.customDepthMaterial = swayDepth(leafTex, .025, 1.1); scene.add(branch); stage.hideInDepth.push(branch);

  /* products */
  const bottle = U.fit(sage.scene, .24, 0);
  bottle.traverse(o => { if (o.isMesh) { o.material.envMapIntensity = 1; } });
  bottle.position.set(0, 0, 0); bottle.rotation.y = -.35; scene.add(bottle);
  const bs = bottle.userData.size;
  const cs1 = U.contactShadow(Math.min(bs.x, bs.z) * .5, .85); cs1.position.x = bottle.position.x; cs1.position.z = bottle.position.z; scene.add(cs1);
  // crystal perfume (Kalpi materials: refraction, Beer-Lambert tint, dispersion)
  let pass = null;
  if (window.KalpiMaterials) {
    const KM = window.KalpiMaterials;
    pass = U.HI ? KM.Transmission(r, { scale: .5 }) : null;
    KM.apply(perf.scene, 'perfume', { quality: U.HI ? 'high' : 'low', transmission: pass });
  }
  const perfume = U.fit(perf.scene, .135, 102);
  perfume.position.set(-.2, 0, .07); perfume.rotation.y = .25; scene.add(perfume);
  const ps = perfume.userData.size;
  const cs2 = U.contactShadow(Math.min(ps.x, ps.z) * .5, .7); cs2.position.set(perfume.position.x, 0, perfume.position.z); scene.add(cs2);
  if (pass) stage.preRender.push(() => pass.render(scene, cam, [curtain, branch]));
  // caustic the crystal throws on the marble (blush light focused through the facets)
  const shDir = new THREE.Vector2(-L.x, -L.z).normalize();
  const caus = new THREE.Mesh(new THREE.PlaneGeometry(.26, .14), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, col: { value: U.lin('#FFC9B8').multiplyScalar(1.6) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float t; uniform vec3 col;
      float c(vec2 p){ float v = 0.; for (int i = 0; i < 3; i++){ p = p * 1.7 + vec2(sin(p.y * 1.3 + t * .2), cos(p.x * 1.1 - t * .17)); v += pow(abs(sin(p.x) * sin(p.y)), .15); } return v / 3.; }
      void main(){ vec2 q = (vUv - .5) * vec2(2., 2.);
        float m = smoothstep(1., .25, length(q * vec2(.9, 1.2)));
        float k = pow(1. - c(vUv * vec2(9., 5.)), 6.) * 2.5 + .08;
        float near = smoothstep(-1., .2, -q.x);
        gl_FragColor = vec4(col * k * m * (.5 + near), 1.); }`,
  }));
  caus.rotation.x = -Math.PI / 2; caus.rotation.z = -Math.atan2(shDir.y, shDir.x);
  caus.position.set(perfume.position.x + shDir.x * .11, .0006, perfume.position.z + shDir.y * .11); caus.scale.setScalar(.7); caus.layers.set(1); scene.add(caus);

  /* soft styling in the background: ceramic vase with dried stems, two linen books */
  const ceramic = new THREE.MeshPhysicalMaterial({ color: U.lin('#D9CBB8'), roughness: .55, clearcoat: .3, envMapIntensity: .6 });
  const prof = []; for (let i = 0; i <= 24; i++) { const y = i / 24; prof.push(new THREE.Vector2(.07 + Math.sin(y * Math.PI * .95) * .06 - (y > .8 ? (y - .8) * .35 : 0), y * .3)); }
  const vase = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), ceramic); vase.position.set(-.85, 0, -.5); vase.castShadow = vase.receiveShadow = true; scene.add(vase);
  const stemM = new THREE.MeshStandardMaterial({ color: U.lin('#B89B74'), roughness: .8 });
  const rs = U.rng(3);
  for (let i = 0; i < 9; i++) {
    const h = .45 + rs() * .35, st = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .003, h, 5), stemM);
    st.position.set(-.85 + (rs() - .5) * .04, .27 + h / 2, -.5 + (rs() - .5) * .04); st.rotation.set((rs() - .5) * .5, 0, (rs() - .5) * .6);
    st.castShadow = true; scene.add(st);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.018 + rs() * .015, 8, 6), stemM); head.scale.y = 2.2; head.position.set(0, h / 2, 0); st.add(head); head.castShadow = true;
  }
  const book = (w, h, d, c, x, y, z, ry) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: U.lin(c), roughness: .85 })); b.position.set(x, y + h / 2, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; scene.add(b); };
  book(.32, .035, .24, '#CDBFAA', .95, 0, -.48, .12); book(.29, .03, .21, '#8E9A86', .95, .035, -.47, .05);
  { const cb = U.contactShadow(.15, .45, { square: true, spread: 2.6 }); cb.position.set(.95, .0004, -.48); cb.rotation.z = .1; scene.add(cb); }
  const csv = U.contactShadow(.1, .6); csv.position.set(-.85, .0004, -.5); scene.add(csv);

  /* dust motes in the beam */
  const dust = U.particles({ count: U.HI ? 1400 : 400, seed: 4, min: new THREE.Vector3(-1.35, 0, -.65), size: new THREE.Vector3(1.9, 1.3, 1.5),
    wind: new THREE.Vector3(.012, .004, -.006), wander: .06, sizePx: 2.6, color: U.lin('#FFE6C8'), ambient: 0, gain: 6, lightDir: L, phaseG: .55, aperture: 2 });
  dust.userData.bind(sun); dust.material.uniforms.outside.value = 0; scene.add(dust);

  /* atmosphere: faint room air that the sun turns into beams */
  const a = stage.atmos.uniforms;
  a.density.value = .085; a.heightFall.value = 0; a.noiseScale.value = 2.2; a.noiseAmt.value = .4; a.wind.value.set(.05, .015, -.02);
  a.lightCol.value.copy(U.lin('#FFD9B0')).multiplyScalar(40); a.ambCol.value.copy(U.lin('#2a2420')).multiplyScalar(.12);
  a.maxDist.value = 6; a.phaseG.value = .35; a.stepPow.value = 1; a.extinction.value = .35;
  const f = stage.final.uniforms; f.exposure.value = .95; f.grain.value = .035; f.vignette.value = .38; f.lift.value.set(.012, .01, .008); f.sat.value = .96;
  stage.bloom.strength = .18; stage.bloom.threshold = 1.4; stage.bloom.radius = .6;
  stage.aperture = 1.0; stage.focusRange = 0.14;

  /* camera: eye level with the product, long lens, slow drift + handheld + parallax */
  const P0 = new THREE.Vector3(.7, .2, 1.0), T0 = new THREE.Vector3(-.06, .085, -.05);
  const right = new THREE.Vector3(1, 0, -.7).normalize();
  return function update(t, ptr) {
    swayU.kT.value = t;
    dust.material.uniforms.t.value = t; dust.material.uniforms.pr.value = stage.dpr; dust.material.uniforms.focus.value = stage.focus;
    caus.material.uniforms.t.value = t;
    const drift = Math.sin(t * .09) * .5 + .5;
    const hh = U.handheld(t, .0028);
    cam.position.copy(P0).addScaledVector(right, (drift - .5) * .16 + hh.x + ptr.x * .03).add(new THREE.Vector3(0, hh.y + ptr.y * .015, (drift - .5) * -.05));
    cam.lookAt(T0); cam.rotateZ(hh.rz * .4);
    stage.focus = cam.position.distanceTo(bottle.position) - .03;
  };
};

function mergeGeoms(gs) {
  let n = 0; gs.forEach(g => { n += g.index ? g.index.count : g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); const names = Object.keys(gs[0].attributes);
  names.forEach(k => {
    const sz = gs[0].attributes[k].itemSize, arr = new Float32Array(n * sz); let o = 0;
    gs.forEach(g => { const a = g.attributes[k]; const idx = g.index ? g.index.array : null; const cnt = idx ? idx.length : a.count; for (let i = 0; i < cnt; i++) { const v = idx ? idx[i] : i; for (let c = 0; c < sz; c++) arr[o++] = a.array[v * sz + c]; } });
    out.setAttribute(k, new THREE.BufferAttribute(arr, sz));
  });
  return out;
}
window.RICH.mergeGeoms = mergeGeoms;
})();
