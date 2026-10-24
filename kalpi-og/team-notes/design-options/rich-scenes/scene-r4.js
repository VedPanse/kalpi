/* R4 · Product orbit: thick rounded glass blocks on a slowly turning ring, each holding a real product model
   on a soft lightbox. Front card sharp, the rest tilt away, blur and dim. A liquid-chrome sculpture turns
   at the centre; plum/teal particle haze; the floor ring takes the front card's colour. */
(function () {
const { U, THREE } = window.RICH;
const ROOT = '../../../', LIP = ROOT + 'team-notes/design-options/3d-test/lipstick/';
window.SCENES = window.SCENES || {};
window.SCENE_OPTS = Object.assign(window.SCENE_OPTS || {}, { r4: { msaaAt2: true, dofScale: 1, blurPx: 6 } });
window.R4_ITEMS = [
  { L: 'A', name: 'Terracotta', votes: 41, st: 'Sample', col: '#C96847', url: ROOT + 'media/example-bottle/3d-terracotta.glb', h: 1.22 },
  { L: 'B', name: 'Navy', votes: 27, st: 'Sample', col: '#33416B', url: ROOT + 'media/example-bottle/3d-navy.glb', h: 1.22 },
  { L: 'C', name: 'Cream', votes: 19, st: 'Sample', col: '#E3D7C1', url: ROOT + 'media/example-bottle/3d-cream.glb', h: 1.22 },
  { L: 'D', name: 'Sage', votes: 33, st: 'Sample', col: '#8FA184', url: ROOT + 'media/example-bottle/3d-sage.glb', h: 1.22 },
  { L: 'E', name: 'Crystal perfume', votes: 24, st: '3D only', col: '#E7A9B6', url: LIP + 'perfume-parts.glb', km: 'perfume', yaw: 102, h: 1.0 },
  { L: 'F', name: 'Sage', votes: 22, st: 'Sample 2', col: '#9DB092', url: ROOT + 'media/example-bottle/3d-sage.glb', h: 1.22 },
];

window.SCENES.r4 = async function (stage, section) {
  const r = stage.renderer, KM = window.KalpiMaterials;
  const scene = stage.scene = new THREE.Scene();
  const cam = stage.camera = new THREE.PerspectiveCamera(30, 16 / 9, .1, 80);
  scene.environment = KM.studioEnv(r, { rim: '#7FD3C8', floor: '#0d0a12' });
  scene.background = null;
  const items = window.R4_ITEMS, n = items.length, RAD = 3.4;
  const models = await Promise.all(items.map(it => U.gltf(it.url).catch(() => null)));

  /* floor with blurred reflection */
  const refl = U.PlanarReflection(r, { scale: .5, blur: 3 });
  const floorM = new THREE.MeshStandardMaterial({ color: U.lin('#0c0a10'), roughness: .35, metalness: 0, envMapIntensity: .2 });
  // subtle large-scale roughness variation so the reflection is not a mirror
  { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const rnd = U.rng(3);
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { const v = 70 + rnd() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v},.08)`; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 8 + rnd() * 60, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); floorM.roughnessMap = t; }
  refl.patch(floorM, .5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  refl.hide.push(floor); stage.preRender.push(() => refl.render(scene, cam));
  // far backdrop: deep plum-to-teal gradient dome so there is no void
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { a: { value: U.lin('#160C1C') }, b: { value: U.lin('#06141A') }, c: { value: U.lin('#05040A') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 a, b, c; varying vec3 vP; void main(){ vec3 d = normalize(vP); float s = atan(d.x, -d.z) / 3.1416 * .5 + .5; vec3 col = mix(a, b, smoothstep(.2, .8, s)); col = mix(col, c, smoothstep(.0, .55, d.y)); col *= 1. + .6 * exp(-abs(d.y) * 7.); gl_FragColor = vec4(col, 1.); }' }));
  scene.add(dome); stage.hideInDepth.push(dome);

  /* the glass block */
  const W = 1.32, H = 1.74, D = .24, RR = .16;
  const shape = new THREE.Shape(); { const x = -W / 2, y = -H / 2;
    shape.moveTo(x + RR, y); shape.lineTo(x + W - RR, y); shape.quadraticCurveTo(x + W, y, x + W, y + RR); shape.lineTo(x + W, y + H - RR); shape.quadraticCurveTo(x + W, y + H, x + W - RR, y + H);
    shape.lineTo(x + RR, y + H); shape.quadraticCurveTo(x, y + H, x, y + H - RR); shape.lineTo(x, y + RR); shape.quadraticCurveTo(x, y, x + RR, y); }
  const blockG = new THREE.ExtrudeGeometry(shape, { depth: D - .07, bevelEnabled: true, bevelThickness: .035, bevelSize: .035, bevelSegments: 6, curveSegments: 14 });
  blockG.translate(0, 0, -(D - .07) / 2); blockG.computeVertexNormals();
  const glassMat = (side, rimCol) => {
    const m = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .04, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.0, side, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    const u = { kRim: { value: rimCol.clone() }, kDim: { value: 1 } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = 'uniform vec3 kRim; uniform float kDim;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `
        float NdV = abs(dot(normal, normalize(vViewPosition)));
        float fr = pow(1. - NdV, 2.6);
        float a = .05 + .75 * fr;
        vec3 c = outgoingLight * (.18 + .82 * fr) + kRim * fr * .3;
        gl_FragColor = vec4(c * kDim, a);`);
    };
    m.userData.u = u; return m;
  };
  /* lightbox backdrop inside each block */
  const boxShape = new THREE.ShapeGeometry(shape, 14); boxShape.scale(.93, .95, 1);
  const backMat = col => new THREE.ShaderMaterial({ uniforms: { c: { value: U.lin(col) }, k: { value: 1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 c; uniform float k; varying vec2 vP;
      void main(){ float d = length((vP - vec2(0., .05)) * vec2(1.1, .8)); vec3 base = mix(vec3(1.), c, .62);
        vec3 col = base * (1.0 - .6 * smoothstep(.05, 1.0, d)) * .85;
        col *= .78 + .22 * smoothstep(-.9, .4, vP.y);
        gl_FragColor = vec4(col * k, 1.); }` });

  const ring = new THREE.Group(); ring.position.y = 1.18; scene.add(ring);
  const cards = items.map((it, i) => {
    const g = new THREE.Group(); const col = U.lin(it.col);
    const back = new THREE.Mesh(blockG, glassMat(THREE.BackSide, col)); back.renderOrder = 2;
    const front = new THREE.Mesh(blockG, glassMat(THREE.FrontSide, col)); front.renderOrder = 3;
    const box = new THREE.Mesh(boxShape, backMat(it.col)); box.position.z = -D / 2 + .03;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W * .86, .01, D * .75), new THREE.MeshStandardMaterial({ color: U.lin(it.col).lerp(new THREE.Color(1, 1, 1), .35).multiplyScalar(.35), roughness: .85, envMapIntensity: .2 }));
    shelf.position.y = -H / 2 + .14; shelf.receiveShadow = true;
    g.add(box, back, front);
    let prod = null;
    if (models[i]) {
      const root = models[i].scene;
      if (it.km) KM.apply(root, it.km, { quality: 'low' });
      prod = U.fit(root, it.h, it.yaw || 0);
      prod.position.set(0, -H / 2 + .12, .0); g.add(prod);
      prod.traverse(o => { if (o.isMesh && o.material) { o.material.envMapIntensity = Math.max(o.material.envMapIntensity || 1, .8); } });
    }
    stage.hideInDepth.push(back, front);
    ring.add(g);
    return { g, prod, front, back, box, it, col };
  });

  /* sculpture: slowly morphing liquid chrome */
  const blobG = new THREE.IcosahedronGeometry(.95, 48);
  const blobM = new THREE.MeshPhysicalMaterial({ color: U.lin('#C9CDD6'), metalness: 1, roughness: .12, envMapIntensity: 1.3, clearcoat: .3 });
  const blobU = { kT: { value: 0 } };
  blobM.onBeforeCompile = sh => {
    sh.uniforms.kT = blobU.kT;
    const N = 'float bn(vec3 p, float t){ return sin(p.x * 2.1 + t) * sin(p.y * 1.7 - t * .8) * sin(p.z * 2.3 + t * .6) + .5 * sin(p.x * 4.3 - p.z * 3.1 + t * 1.3); }\n';
    sh.vertexShader = 'uniform float kT;\n' + N + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { vec3 p = position; float e = .02; vec3 nn = normalize(p);
          vec3 tg = normalize(cross(nn, vec3(0., 1., .1))); vec3 bt = cross(nn, tg);
          vec3 p0 = p + nn * bn(p, kT) * .16; vec3 p1 = (p + tg * e); p1 += normalize(p1) * bn(p1, kT) * .16; vec3 p2 = (p + bt * e); p2 += normalize(p2) * bn(p2, kT) * .16;
          objectNormal = normalize(cross(p1 - p0, p2 - p0)); if (dot(objectNormal, nn) < 0.) objectNormal = -objectNormal; }`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(position) * bn(position, kT) * .16;');
  };
  const blob = new THREE.Mesh(blobG, blobM); blob.position.set(0, 1.75, -.6); blob.scale.set(.62, .95, .62); blob.castShadow = true; scene.add(blob);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.42, .48, .82, 64), new THREE.MeshStandardMaterial({ color: U.lin('#17141c'), roughness: .3, envMapIntensity: .6 }));
  plinth.position.set(0, .41, -.6); plinth.castShadow = plinth.receiveShadow = true; scene.add(plinth);

  /* glowing floor ring (takes the front card's colour) */
  const ringMat = new THREE.MeshBasicMaterial({ color: U.lin(items[0].col).multiplyScalar(6) });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(RAD + .02, .016, 12, 384), ringMat); glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = .02; scene.add(glowRing); refl.hide.push(glowRing);
  const halo = new THREE.Mesh(new THREE.RingGeometry(RAD - .55, RAD + .6, 256, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: ringMat.color }, R: { value: RAD } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c; uniform float R; varying vec2 vP; void main(){ float d = abs(length(vP) - R); gl_FragColor = vec4(c * .05 * exp(-d * 9.), 1.); }' }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = .012; halo.layers.set(1); scene.add(halo);

  /* light */
  const key = new THREE.SpotLight(U.lin('#F4EEFF'), 8, 22, .38, .7, 1.1);
  key.position.set(.6, 8.5, 7.5); key.target.position.set(0, 1, RAD); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(U.HI ? 4096 : 2048, U.HI ? 4096 : 2048); key.shadow.camera.near = 3; key.shadow.camera.far = 16; key.shadow.bias = -.0001; key.shadow.normalBias = .01; key.shadow.radius = 2.5;
  stage.setKeyLight(key, 0);
  const teal = new THREE.PointLight(U.lin('#46C2B4'), 9, 12, 1.6); teal.position.set(-4.5, 2.2, 1); scene.add(teal);
  const plum = new THREE.PointLight(U.lin('#B35A9C'), 9, 12, 1.6); plum.position.set(4.5, 2.4, .5); scene.add(plum);
  const fill = new THREE.DirectionalLight(U.lin('#FFF6EE'), .3); fill.position.set(-1, 3, 8); scene.add(fill);

  /* particle haze */
  const mk = (col, seed, gain) => { const p = U.particles({ count: U.HI ? 2600 : 800, seed, min: new THREE.Vector3(-8, 0, -7), size: new THREE.Vector3(16, 4.5, 11.5), wind: new THREE.Vector3(.05, .02, -.03), wander: .5, sizePx: 3.2, color: U.lin(col), ambient: 1, gain, aperture: .9 }); scene.add(p); return p; };
  const pPlum = mk('#C86BB0', 21, .55), pTeal = mk('#4FD1C1', 22, .5);

  const a = stage.atmos.uniforms;
  a.density.value = .05; a.heightFall.value = .25; a.noiseScale.value = .45; a.noiseAmt.value = .7; a.wind.value.set(.05, .01, .02);
  a.lightCol.value.copy(U.lin('#E9E2FF')).multiplyScalar(30); a.ambCol.value.copy(U.lin('#2B1C38')).multiplyScalar(.25);
  a.maxDist.value = 30; a.phaseG.value = .3; a.stepPow.value = 1.2; a.extinction.value = .6;
  const f = stage.final.uniforms; f.exposure.value = .95; f.grain.value = .045; f.vignette.value = .5; f.lift.value.set(.006, .004, .01); f.sat.value = 1.02;
  stage.bloom.strength = .16; stage.bloom.threshold = 2.2; stage.bloom.radius = .65;
  stage.aperture = .25; stage.focusRange = .5;

  /* rotation control: idle auto-advance; drag / wheel / arrows / scroll nudge */
  const STEP = Math.PI * 2 / n;
  const ctl = { idx: 0, from: 0, to: 0, t0: -10, drag: 0, dragV: 0, user: -100 };
  const goto = (k, t) => { ctl.from = angleAt(t); ctl.to = k * STEP; ctl.t0 = t; ctl.idx = k; };
  let lastT = 0;
  const angleAt = t => { const k = Math.min(1, (t - ctl.t0) / 1.4); return ctl.from + (ctl.to - ctl.from) * U.ease(Math.max(0, k)); };
  const label = section && section.querySelector('#r4label');
  if (section && !U.FILM) {
    section.querySelectorAll('.arrows button').forEach(b => b.addEventListener('click', () => { ctl.user = lastT; goto(ctl.idx + (+b.dataset.dir), lastT); }));
    let down = null;
    section.addEventListener('pointerdown', e => { if (e.target.closest('input,button,a')) return; down = { x: e.clientX, a: angleAt(lastT) + ctl.drag }; });
    addEventListener('pointerup', () => { if (!down) return; const k = Math.round((angleAt(lastT) + ctl.drag) / STEP); ctl.from = angleAt(lastT) + ctl.drag; ctl.drag = 0; ctl.to = k * STEP; ctl.t0 = lastT; ctl.idx = k; ctl.user = lastT; down = null; });
    addEventListener('pointermove', e => { if (down) ctl.drag = (e.clientX - down.x) / innerWidth * -3.2; });
    section.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); ctl.user = lastT; if (lastT - ctl.t0 > .5) goto(ctl.idx + Math.sign(e.deltaX), lastT); } }, { passive: false });
    addEventListener('keydown', e => { const rc = section.getBoundingClientRect(); if (rc.top > innerHeight / 2 || rc.bottom < innerHeight / 2) return; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { ctl.user = lastT; goto(ctl.idx + 1, lastT); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { ctl.user = lastT; goto(ctl.idx - 1, lastT); } });
  }
  let shownIdx = -1;
  const P0 = new THREE.Vector3(0, 1.62, RAD + 6.4);
  const tmpC = new THREE.Color();
  return function update(t, ptr) {
    lastT = t;
    // idle: advance one card every 5 s (deterministic from t when nobody touches it)
    if (!U.FILM && t - ctl.user > 6 && t - ctl.t0 > 5) goto(ctl.idx + 1, t);
    const scrollNudge = section && !U.FILM ? (section.getBoundingClientRect().top / innerHeight) * -.35 : 0;
    let ang = angleAt(t) + ctl.drag + scrollNudge;
    if (U.FILM) { const k = Math.floor(t / 5), ph = t - k * 5; ang = (k + U.ease(Math.min(1, Math.max(0, (ph - 3.4) / 1.6)))) * STEP; }
    ring.rotation.y = -ang;
    let best = 0, bestF = -2;
    cards.forEach((c, i) => {
      const a0 = i * STEP; c.g.position.set(Math.sin(a0) * RAD, 0, Math.cos(a0) * RAD); c.g.rotation.y = a0;
      const wa = a0 - ang; const facing = Math.cos(wa);
      if (facing > bestF) { bestF = facing; best = i; }
      const k = .25 + .75 * Math.pow(Math.max(0, facing), 3);
      c.box.material.uniforms.k.value = k; c.front.material.userData.u.kDim.value = .5 + .5 * k;
      if (c.prod) c.prod.rotation.y = Math.sin(t * .35 + i) * .6 + t * .12;
    });
    const fc = cards[best];
    tmpC.copy(fc.col).multiplyScalar(6); ringMat.color.lerp(tmpC, U.FILM ? 1 : .06);
    if (best !== shownIdx && label) { shownIdx = best; label.style.opacity = 0; setTimeout(() => { const it = items[best]; label.textContent = `${it.L} · ${it.name} · ${it.votes} votes · ${it.st}`; label.style.opacity = .9; }, 250); }
    blobU.kT.value = t * .35; blob.rotation.y = t * .08;
    [pPlum, pTeal].forEach(p => { p.material.uniforms.t.value = t; p.material.uniforms.pr.value = stage.dpr; p.material.uniforms.focus.value = stage.focus; });
    const hh = U.handheld(t, .006);
    cam.position.set(P0.x + hh.x + ptr.x * .25, P0.y + hh.y + ptr.y * .12, P0.z);
    cam.lookAt(0, 1.22, RAD - 1.2); cam.rotateZ(hh.rz * .25);
    stage.focus = cam.position.distanceTo(new THREE.Vector3(0, 1.2, RAD)) - .05;
  };
};
})();
