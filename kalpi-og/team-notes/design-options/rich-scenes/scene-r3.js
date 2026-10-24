/* R3 · Dune at dusk: the bottle on a dune crest at blue hour. Low sun, long soft shadows, sand blowing
   off the ridge, haze over distant dunes. Terrain is a displaced plane with baked (vertex) occlusion. */
(function () {
const { U, THREE } = window.RICH;
const A = 'assets/', ROOT = '../../../';
window.SCENES = window.SCENES || {};

/* value noise + dune profile (JS, for the mesh) */
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; }
function fbm(x, y, o) { let s = 0, a = .5, t = 0; for (let i = 0; i < (o || 4); i++) { s += a * vnoise(x, y); t += a; x *= 2.03; y *= 2.03; a *= .5; } return s / t; }
const LAMBDA = 46;
let OFFS = 0;
function duneRaw(x, z) {
  const r = Math.sqrt(x * x + z * z);
  const warp = (fbm(x * .006 + 3, z * .006) - .5) * 70 + Math.sin(z * .021 + fbm(x * .01, z * .01) * 3) * 9;
  const lam = LAMBDA * (1 + 3.5 * U.smooth(Math.min(1, Math.max(0, (r - 120) / 900))));
  const s = (x + warp) / lam + OFFS;
  const p = s - Math.floor(s);
  const prof = p < .78 ? Math.pow(p / .78, 1.7) : Math.pow(1 - (p - .78) / .22, 1.25);
  const amp = (3.2 + 3 * fbm(x * .01, z * .01 + 7)) * (1 + 9 * U.smooth(Math.min(1, Math.max(0, (r - 80) / 900))));
  const big = (fbm(x * .0016 + 11, z * .0016) - .3) * 70 * U.smooth(Math.min(1, Math.max(0, (r - 150) / 600)));
  return prof * amp + big;
}

window.SCENES.r3 = async function (stage) {
  const r = stage.renderer;
  const scene = stage.scene = new THREE.Scene();
  const cam = stage.camera = new THREE.PerspectiveCamera(24, 16 / 9, .05, 4000);
  const [hdr, sD, sN, sR, sage] = await Promise.all([
    U.hdr(A + 'qwantani_dusk_2_puresky_1k.hdr'),
    U.tex(r, A + 'aerial_sand_diff_2k.jpg', { srgb: true }), U.tex(r, A + 'aerial_sand_nor_gl_2k.jpg'), U.tex(r, A + 'aerial_sand_rough_1k.jpg'),
    U.gltf(ROOT + 'media/example-bottle/3d-sage.glb'),
  ]);
  // the sun: low, back-left of the bottle as seen from the camera (camera looks along +x)
  const sunDir = new THREE.Vector3(.5, .12, -.86).normalize();
  U.tintHDR(hdr, [1, 1, 1], 60, 1);
  U.aimHDR(hdr, sunDir);
  hdr.minFilter = hdr.magFilter = THREE.LinearFilter; hdr.generateMipmaps = false;
  const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromEquirectangular(hdr).texture; pm.dispose();

  /* sky dome straight from the HDRI */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { tex: { value: hdr }, k: { value: .42 } },
    vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.); }',
    fragmentShader: `uniform sampler2D tex; uniform float k; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); vec2 uv = vec2(atan(d.z, d.x) * .1591549 + .5, asin(clamp(d.y, -1., 1.)) * .3183099 + .5);
        vec3 c = texture2D(tex, uv).rgb; if (d.y < 0.) c = texture2D(tex, vec2(uv.x, .5 + .002)).rgb; gl_FragColor = vec4(c * k, 1.); }`,
  }));
  sky.renderOrder = -1; scene.add(sky); stage.hideInDepth.push(sky);

  /* hero dune: put a crest through the origin */
  { const p0 = (() => { const warp = (fbm(3, 0) - .5) * 70 + Math.sin(fbm(0, 0) * 3) * 9; return warp / LAMBDA; })(); OFFS = .755 - p0; }
  const N = U.HI ? 440 : 260, R = 1800;
  const g = new THREE.PlaneGeometry(2, 2, N, N); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  const col = new Float32Array(pos.count * 3);
  const warpC = u => Math.sign(u) * Math.pow(Math.abs(u), 2.6) * R;
  const CX = -1.2;
  for (let i = 0; i < pos.count; i++) {
    const x = warpC(pos.getX(i)) + CX, z = warpC(pos.getZ(i));
    const h = duneRaw(x, z);
    pos.setXYZ(i, x, h, z); uv.setXY(i, x / .8, z / .8);
    // baked occlusion: curvature + a coarse horizon test toward the sky
    const d = Math.max(.6, Math.sqrt(x * x + z * z) * .02);
    const lap = (duneRaw(x + d, z) + duneRaw(x - d, z) + duneRaw(x, z + d) + duneRaw(x, z - d)) / 4 - h;
    const ao = Math.min(1, Math.max(.45, 1 - lap / d * 2.2));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const sandM = new THREE.MeshStandardMaterial({ map: sD, normalMap: sN, roughnessMap: sR, roughness: 1, vertexColors: true, color: U.lin('#F1D9C0'), envMapIntensity: .5, normalScale: new THREE.Vector2(.9, .9) });
  const kB = { value: new THREE.Vector4(0, 0, 0, .05) };
  sandM.onBeforeCompile = sh => {
    sh.uniforms.kB = kB;
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vWp; uniform vec4 kB;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `
        float dCam = length(vWp - cameraPosition);
        vec4 t1 = texture2D(map, vUv); vec4 t2 = texture2D(map, vUv * .071 + .37);
        vec4 texelColor = mapTexelToLinear(mix(t1, t2, smoothstep(3., 30., dCam) * .6));
        texelColor.rgb = mix(vec3(.30, .245, .22), texelColor.rgb, .42);
        diffuseColor *= texelColor;
        { float db = length(vWp.xz - kB.xz); float aoB = 1. - .55 * exp(-max(db - kB.w, 0.) / (kB.w * .55)) - .25 * (1. - smoothstep(kB.w * .8, kB.w * 1.15, db)); diffuseColor.rgb *= aoB; }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // wind ripples (8 cm), fading with distance
          vec2 wd = normalize(vec2(1., .18 + .25 * sin(vWp.z * .6 + vWp.x * .2)));
          float ph = dot(vWp.xz, wd) * 70. + sin(vWp.z * 3.1 + vWp.x * .7) * 2.4 + sin(vWp.x * 11. + vWp.z * 5.) * .9;
          float rp = cos(ph) * .5 + .5; rp = pow(rp, 2.);
          float patchy = smoothstep(.2, .8, sin(vWp.x * 1.3 + sin(vWp.z * 2.1)) * .5 + .5);
          float fade = 1. - smoothstep(2.5, 14., dCam);
          vec3 tW = normalize(vec3(1., 0., .18)); vec3 tV = (viewMatrix * vec4(tW, 0.)).xyz;
          normal = normalize(normal + tV * (rp - .35) * (.12 + .22 * patchy) * fade);
        }`);
  };
  const terrain = new THREE.Mesh(g, sandM); terrain.receiveShadow = true; terrain.castShadow = true; scene.add(terrain);

  /* bottle on the crest, settled a few mm into the sand */
  const ray = new THREE.Raycaster();
  const heightAt = (x, z) => { ray.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObject(terrain)[0]; return h ? h.point.y : duneRaw(x, z); };
  terrain.updateMatrixWorld();
  const bottle = U.fit(sage.scene, .24, 0);
  const hB = Math.min(heightAt(0, 0), heightAt(.04, 0), heightAt(-.04, 0), heightAt(0, .04), heightAt(0, -.04));
  bottle.position.set(0, hB - .006, 0); bottle.rotation.y = 2.3; scene.add(bottle);
  bottle.traverse(o => { if (o.isMesh) o.material.envMapIntensity = .35; });
  const bs = bottle.userData.size; kB.value.set(0, hB, 0, Math.min(bs.x, bs.z) * .5);
  // tiny sand drift piled against the windward side

  /* light */
  const sun = new THREE.DirectionalLight(U.lin('#FFB38A'), 4.2);
  sun.position.copy(sunDir).multiplyScalar(40).add(new THREE.Vector3(0, hB, 0)); sun.target.position.set(0, hB, 0); scene.add(sun, sun.target);
  sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 6; sc.bottom = -6; sc.near = 20; sc.far = 70;
  sun.shadow.mapSize.set(U.HI ? 4096 : 2048, U.HI ? 4096 : 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  sun.shadow.radius = (sc.far - sc.near) * Math.tan(1.6 * Math.PI / 180) / (sc.right - sc.left);
  stage.setKeyLight(sun, 1);
  // warm bounce off the sunlit sand toward the camera side (keeps the bottle's sage readable)
  const bounce = new THREE.DirectionalLight(U.lin('#F2E6DA'), .7); bounce.position.set(-3, .6, 1.6); scene.add(bounce);

  /* blowing sand off the ridge */
  const grains = U.particles({ count: U.HI ? 3000 : 900, seed: 11, min: new THREE.Vector3(-4, hB - .05, -3.5), size: new THREE.Vector3(9, .35, 7),
    wind: new THREE.Vector3(1.7, .02, .25), wander: .05, sizePx: 1.1, color: U.lin('#FFD7B4'), ambient: .25, gain: 1.6, lightDir: sunDir, phaseG: .6, aperture: .7 });
  grains.userData.bind(sun); scene.add(grains);
  // a thin veil of spindrift streaming off the crest (scrolling noise sheet)
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(14, .5, 1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { t: { value: 0 }, col: { value: U.lin('#FFC9A0').multiplyScalar(.12) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float t; uniform vec3 col;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 p = vec2(vUv.x * 30. - t * 2.2, vUv.y * 3.);
        float v = n(p) * .6 + n(p * 2.3 + 4.) * .4; v = smoothstep(.45, .9, v);
        float m = smoothstep(0., .25, vUv.y) * smoothstep(1., .2, vUv.y) * smoothstep(0., .15, vUv.x) * smoothstep(1., .85, vUv.x);
        gl_FragColor = vec4(col * v * m, 1.); }`,
  }));
  veil.rotation.y = Math.PI / 2 - .08; veil.position.set(.9, hB + .12, .2); veil.layers.set(1); scene.add(veil);

  /* atmosphere: horizon-coloured haze, warm glow toward the sun */
  stage.staticShadows = true;   // nothing that casts moves: render the 4k shadow map once
  const a = stage.atmos.uniforms;
  a.density.value = .0016; a.heightFall.value = .012; a.baseY.value = 0; a.noiseScale.value = .012; a.noiseAmt.value = .35; a.wind.value.set(.08, 0, .01);
  a.lightCol.value.copy(U.lin('#FFB283')).multiplyScalar(5.5); a.ambCol.value.copy(U.lin('#B7A9C4')).multiplyScalar(.36);
  a.maxDist.value = 2600; a.phaseG.value = .72; a.stepPow.value = 2.2; a.extinction.value = 1; a.skyFog.value = .0;
  const f = stage.final.uniforms; f.exposure.value = .75; f.grain.value = .04; f.vignette.value = .4; f.lift.value.set(.01, .01, .016); f.sat.value = 1;
  stage.bloom.strength = .25; stage.bloom.threshold = 1.3; stage.bloom.radius = .7;
  stage.aperture = .55; stage.focusRange = 0.12;

  const camH = (x, z) => Math.max(hB + .085, duneRaw(x, z) + .07);
  return function update(t, ptr) {
    const gu = grains.material.uniforms; gu.t.value = t; gu.pr.value = stage.dpr; gu.focus.value = stage.focus;
    veil.material.uniforms.t.value = t;
    const drift = U.ease((Math.sin(t * .06 - 1.2) + 1) / 2);
    const hh = U.handheld(t, .0035);
    const cx = -1.45 + (drift - .5) * .12, cz = .52 - (drift - .5) * .55 + ptr.x * .06;
    cam.position.set(cx + hh.x * .3, camH(cx, cz) + hh.y + ptr.y * .02, cz + hh.x);
    cam.lookAt(.05, hB + .1, -.02); cam.rotateZ(hh.rz * .35);
    stage.focus = cam.position.distanceTo(bottle.position);
  };
};
})();
