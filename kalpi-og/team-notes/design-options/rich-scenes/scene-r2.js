/* R2 · Stone gallery: a rough stone plinth in a dim, hazy gallery; one top light cone through the haze,
   a softly reflective concrete floor, two more exhibits fading into the dark. */
(function () {
const { U, THREE } = window.RICH;
const A = 'assets/', ROOT = '../../../';
window.SCENES = window.SCENES || {};
window.SCENES.r2 = async function (stage) {
  const r = stage.renderer;
  const scene = stage.scene = new THREE.Scene();
  const cam = stage.camera = new THREE.PerspectiveCamera(17, 16 / 9, .05, 60);
  const [hdr, rockD, rockN, rockR, conD, conN, conR, sage] = await Promise.all([
    U.hdr(A + 'museum_of_ethnography_1k.hdr'),
    U.tex(r, A + 'rock_boulder_dry_diff_2k.jpg', { srgb: true }), U.tex(r, A + 'rock_boulder_dry_nor_gl_2k.jpg'), U.tex(r, A + 'rock_boulder_dry_rough_1k.jpg'),
    U.tex(r, A + 'smooth_concrete_floor_diff_1k.jpg', { srgb: true, repeat: [7, 7] }), U.tex(r, A + 'smooth_concrete_floor_nor_gl_1k.jpg', { repeat: [7, 7] }), U.tex(r, A + 'smooth_concrete_floor_rough_1k.jpg', { repeat: [7, 7] }),
    U.gltf(ROOT + 'media/example-bottle/3d-sage.glb'),
  ]);
  U.tintHDR(hdr, [.5, .75, 1.35], 3, .5);
  const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromEquirectangular(hdr).texture; pm.dispose();

  /* floor: polished concrete with a blurred planar reflection */
  const refl = U.PlanarReflection(r, { scale: .5, blur: 3 });
  const floorM = new THREE.MeshStandardMaterial({ map: conD, normalMap: conN, roughnessMap: conR, roughness: .85, color: new THREE.Color(.55, 1.05, 2.2).multiplyScalar(.75), envMapIntensity: .15, normalScale: new THREE.Vector2(.35, .35) });
  refl.patch(floorM, .85);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  refl.hide.push(floor);
  stage.preRender.push(() => refl.render(scene, cam));

  /* gallery shell: dark plaster walls */
  const wallM = new THREE.MeshStandardMaterial({ map: conD, color: new THREE.Color(.5, .9, 1.7).multiplyScalar(.5), roughness: .95, envMapIntensity: .2 });
  const wall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  wall(16, 6, 0, 3, -7, 0); wall(16, 6, -7, 3, 0, Math.PI / 2); wall(16, 6, 7, 3, 0, -Math.PI / 2); wall(16, 6, 0, 3, 8, Math.PI);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallM); ceil.rotation.x = Math.PI / 2; ceil.position.y = 5.2; scene.add(ceil);

  /* rough-hewn stone plinth (displaced box + Poly Haven rock) */
  const stoneM = new THREE.MeshStandardMaterial({ map: rockD, normalMap: rockN, roughnessMap: rockR, roughness: 1, color: U.lin('#CFCBC6'), envMapIntensity: .35, normalScale: new THREE.Vector2(.5, .5) });
  const plinth = (w, h, x, z, seed) => {
    const g = new THREE.BoxGeometry(w, h, w, 20, 40, 20); const p = g.attributes.position, rnd = U.rng(seed);
    const n = (x, y, z) => Math.sin(x * 23 + y * 7) * Math.sin(z * 19 - y * 13) * .5 + Math.sin(x * 61 + z * 47 + y * 29) * .25;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const edge = Math.max(Math.abs(v.x) / (w / 2), Math.abs(v.z) / (w / 2)), top = v.y > h / 2 - 1e-4;
      const k = (edge > .999 && !top ? .004 : .0015) * n(v.x + seed, v.y, v.z);
      v.x *= 1 + k * 2; v.z *= 1 + k * 2;
      if (!top) { v.x += (rnd() - .5) * .0008; v.z += (rnd() - .5) * .0008; }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    // per-face UVs scaled so 1 texture tile ~ 0.9 m
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / .32 + seed * .17, uv.getY(i) * (Math.abs(g.attributes.normal.getY(i)) > .5 ? w : h) / .32);
    const m = new THREE.Mesh(g, stoneM); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    const cs = U.contactShadow(w * .5, .7, { square: true, spread: 2.4 }); cs.position.set(x, .0005, z); scene.add(cs);
    return m;
  };
  const PH = .92;
  plinth(.46, PH, 0, 0, 1);
  plinth(.42, .78, -2.5, -3.4, 2);
  plinth(.5, 1.12, 2.7, -4.6, 3);

  /* exhibits on the far plinths */
  const ceramic = new THREE.MeshPhysicalMaterial({ color: U.lin('#C9BFB2'), roughness: .5, clearcoat: .5, envMapIntensity: .4 });
  const prof = []; for (let i = 0; i <= 24; i++) { const y = i / 24; prof.push(new THREE.Vector2(.05 + Math.sin(y * Math.PI) * .1, y * .38)); }
  const v1 = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), ceramic); v1.position.set(-2.5, .78, -3.4); v1.castShadow = true; scene.add(v1);
  const v2 = new THREE.Mesh(new THREE.SphereGeometry(.13, 40, 24), new THREE.MeshPhysicalMaterial({ color: U.lin('#6E7A7C'), roughness: .25, metalness: .2, clearcoat: 1, envMapIntensity: .6 })); v2.position.set(2.7, 1.12 + .13, -4.6); v2.castShadow = true; scene.add(v2);

  /* the hero */
  const bottle = U.fit(sage.scene, .24, 0); bottle.position.set(0, PH, 0); bottle.rotation.y = -.5; scene.add(bottle);
  bottle.traverse(o => { if (o.isMesh) o.material.envMapIntensity = .7; });
  const bs = bottle.userData.size; const cs = U.contactShadow(Math.min(bs.x, bs.z) * .5, .9); cs.position.set(0, PH + .0006, 0); scene.add(cs);

  /* one top light through the haze */
  const spot = new THREE.SpotLight(U.lin('#FFF0DC'), 11, 9, .11, .5, 1.1);
  spot.position.set(.1, 4.4, .15); spot.target.position.set(0, PH, 0); scene.add(spot, spot.target);
  spot.castShadow = true; spot.shadow.mapSize.set(U.HI ? 4096 : 2048, U.HI ? 4096 : 2048); spot.shadow.camera.near = 2; spot.shadow.camera.far = 7; spot.shadow.bias = -.0003; spot.shadow.normalBias = .004; spot.shadow.radius = 3.5;
  stage.setKeyLight(spot, 0);
  const dim = (x, z, h) => { const s = new THREE.SpotLight(U.lin('#FFE6C8'), 3, 7, .2, .7, 1.2); s.position.set(x + .1, 5, z + .2); s.target.position.set(x, h, z); scene.add(s, s.target); };
  dim(-2.5, -3.4, .78); dim(2.7, -4.6, 1.12);
  // soft wall washes so the room has edges (no void)
  const wash = new THREE.SpotLight(U.lin('#B9C4D6'), 5, 12, .5, 1, 1); wash.position.set(-3.5, 4.6, 2); wash.target.position.set(-1, 1.5, -7); scene.add(wash, wash.target);
  const wash2 = new THREE.SpotLight(U.lin('#D8C7B3'), 3.5, 12, .45, 1, 1); wash2.position.set(4, 4.6, 1); wash2.target.position.set(3.5, 1, -7); scene.add(wash2, wash2.target);
  const front = new THREE.DirectionalLight(U.lin('#E8ECF2'), .16); front.position.set(1, 1.2, 3); scene.add(front);
  // faint secondary light cones (additive, the haze already carries the key cone)
  const coneM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: U.lin('#FFE3C2').multiplyScalar(.06) } },
    vertexShader: 'varying float vY; varying vec3 vN, vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 col; varying float vY; varying vec3 vN, vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(col * e * smoothstep(0., .5, 1. - vY) * smoothstep(1., .7, 1. - vY), 1.); }' });
  [[-2.5, -3.4, .78], [2.7, -4.6, 1.12]].forEach(([x, z, h]) => {
    const H = 5 - h; const c = new THREE.Mesh(new THREE.CylinderGeometry(.06, H * Math.tan(.22) * 1.1, H, 32, 1, true), coneM); c.position.set(x, h + H / 2, z); c.layers.set(1); scene.add(c);
  });

  /* dust in the cone */
  const dust = U.particles({ count: U.HI ? 1600 : 500, seed: 7, min: new THREE.Vector3(-.9, .1, -.9), size: new THREE.Vector3(1.8, 4.6, 1.8),
    wind: new THREE.Vector3(.004, -.006, .003), wander: .08, sizePx: 2.2, color: U.lin('#FFE9D2'), ambient: 0, gain: 3.5, lightDir: new THREE.Vector3(0, 1, 0), phaseG: .2, aperture: 1.2 });
  dust.userData.bind(spot); dust.material.uniforms.outside.value = 0; scene.add(dust);

  stage.staticShadows = true;   // nothing that casts moves: render the 4k shadow map once
  const a = stage.atmos.uniforms;
  a.density.value = .09; a.heightFall.value = .12; a.baseY.value = 0; a.noiseScale.value = 1.3; a.noiseAmt.value = .85; a.wind.value.set(.06, .01, .03);
  a.lightCol.value.copy(U.lin('#FFE7CC')).multiplyScalar(110); a.ambCol.value.copy(U.lin('#5A6578')).multiplyScalar(.03);
  a.maxDist.value = 16; a.phaseG.value = .35; a.stepPow.value = 1.3; a.extinction.value = .5;
  const f = stage.final.uniforms; f.exposure.value = 1.25; f.grain.value = .045; f.vignette.value = .5; f.lift.value.set(.008, .009, .012); f.sat.value = .92;
  stage.bloom.strength = .12; stage.bloom.threshold = 2.2; stage.bloom.radius = .7;
  stage.aperture = .55; stage.focusRange = 0.12;

  const P0 = new THREE.Vector3(.9, 1.12, 2.55), T0 = new THREE.Vector3(-.01, 1.0, 0);
  return function update(t, ptr) {
    dust.material.uniforms.t.value = t; dust.material.uniforms.pr.value = stage.dpr; dust.material.uniforms.focus.value = stage.focus;
    const drift = U.ease((Math.sin(t * .07) + 1) / 2);
    const hh = U.handheld(t, .004);
    cam.position.set(P0.x + (drift - .5) * .45 + hh.x + ptr.x * .08, P0.y + hh.y + ptr.y * .04, P0.z - (drift - .5) * .25);
    cam.lookAt(T0); cam.rotateZ(hh.rz * .3);
    stage.focus = cam.position.distanceTo(bottle.position) - .02;
  };
};
})();
