/* Kalpi material presets for three.js r128 (global THREE build).
 *
 *   <script src=".../three.min.js"></script>            r128
 *   <script src=".../GLTFLoader.js"></script>          + libs/meshopt_decoder.js (the part GLBs use meshopt)
 *   <script src="materials.js"></script>               → window.KalpiMaterials
 *
 * What is in here
 *   presets      glass, crystal, metalPolished, metalBrushed, lacquer, powderCoat, satin, wood, ceramic, liquid
 *                KalpiMaterials.make('crystal', { tint: '#6B2A63' }) → THREE.MeshPhysicalMaterial
 *   METALS       named metal colours (gold, roseGold, silver, chrome, steel, brass …)
 *   studioEnv    a procedural studio (softboxes + strip lights) baked with PMREM, for reflections
 *   Transmission a screen-space transmission pass. r128 has NO real transmission: its `transmission` only fades
 *                alpha and it has no ior / thickness / attenuationColor. The glass presets add those themselves
 *                (onBeforeCompile): refraction of the scene behind (this pass) and of the studio, Beer-Lambert tint
 *                by thickness, Fresnel, a little dispersion. Call pass.render(scene, camera) before every render.
 *   quality      'high' = the transmission pass (one extra scene render at half size) + 3-tap dispersion
 *                'low'  = no extra pass: tinted gloss + refracted studio only (glass looks solid but still faceted)
 *   PRODUCTS     recipes: which preset each named part of a part-split GLB gets, plus A/B/C variants
 *   apply()      KalpiMaterials.apply(gltf.scene, 'lipstick', { variant: 'B', quality, mode: 'after' | 'before' })
 *
 * Plain script, no build step. Nothing here fetches anything.
 */
(function (root) {
'use strict';
const THREE = root.THREE;
if (!THREE) { console.warn('materials.js: load three.js r128 first'); return; }

const KM = { version: '1.0' };
const col = c => (c && c.isColor) ? c.clone() : new THREE.Color(c == null ? 0xffffff : c);   // sRGB hex in → linear Color (r128 Color is not colour-managed, so convert)
const lin = c => { const k = col(c); if (!(c && c.isColor)) k.convertSRGBToLinear(); return k; };

KM.METALS = {
  gold: '#E9C27C', goldPale: '#EED9A6', roseGold: '#E4AD97', roseGoldPale: '#ECC5B5', silver: '#E4E6E9',
  chrome: '#CDD1D6', steel: '#C6CACF', brass: '#D9B468', brassPale: '#E2C489', copper: '#DE9F7B', gunmetal: '#6E7076',
};

/* ---------------------------------------------------------------- shader patches ---------- */
const NOISE = `
float kHash(float n){ return fract(sin(n) * 43758.5453123); }
float kNoise1(float x){ float i = floor(x), f = fract(x); return mix(kHash(i), kHash(i + 1.), f * f * (3. - 2. * f)); }
`;
/* object-space position for brushed streaks */
function addObjPos(sh) {
  sh.vertexShader = 'varying vec3 vKObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vKObj = position;');
  sh.fragmentShader = 'varying vec3 vKObj;\n' + sh.fragmentShader;
}

/* glass: transmission (scene behind + studio), Beer-Lambert absorption, Fresnel, dispersion */
function patchGlass(m, u) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 kTint; uniform float kAttDist; uniform float kThick; uniform float kIor; uniform float kTrans; uniform float kDisp;
uniform float kEnvRefr; uniform float kInner; uniform float kUseScene; uniform float kSceneRefr; uniform sampler2D kScene; uniform vec2 kScreen; uniform float kSceneSRGB;
uniform float kTintMapAmt; uniform float kEdge; uniform float kMapGain; uniform float kBaked; uniform vec3 kRecolor; uniform float kRecolorAmt;
uniform vec3 kSpark[3]; uniform float kSparkI; uniform float kSparkPow; uniform float kRim; uniform vec3 kRimCol; uniform float kSceneGain;`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
vec3 kalpiT = vec3(0.);
{
  vec3 Nv = normal; vec3 Vv = normalize(vViewPosition); vec3 Iv = -Vv;
  float NdV = clamp(abs(dot(Nv, Vv)), 0., 1.);
  float F0 = pow((kIor - 1.) / (kIor + 1.), 2.);
  float Fr = F0 + (1. - F0) * pow(1. - NdV, 5.);
  float pathLen = kThick / max(NdV, .22);                     // longer path at grazing angles → deeper colour at the edges
  vec3 tint = kTint;
  vec3 absorb = pow(max(tint, vec3(1e-4)), vec3(pathLen / kAttDist));
  vec3 body = vec3(1.); float baked = 0.;
  #ifdef USE_MAP
    // painted-back glass: the photo's colour of the glass is its body colour (smoky plum; blush + liquid). Variants keep
    // its lights and darks but take a new hue (luminance x recolour).
    vec3 mc = mapTexelToLinear(texture2D(map, vUv)).rgb;
    mc = mix(mc, vec3(dot(mc, vec3(.2126, .7152, .0722))) * kRecolor, kRecolorAmt);
    body = mix(vec3(1.), mc * kMapGain, kTintMapAmt); baked = kBaked * kTintMapAmt;
  #endif
  vec3 Rg = refract(Iv, Nv, 1. / kIor);
  vec3 trans = vec3(0.);
  #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
    #ifdef KALPI_DISPERSION
      vec3 Rr = refract(Iv, Nv, 1. / (kIor - kDisp)), Rb = refract(Iv, Nv, 1. / (kIor + kDisp));
      trans.r = textureCubeUV(envMap, inverseTransformDirection(Rr, viewMatrix), .04).r;
      trans.g = textureCubeUV(envMap, inverseTransformDirection(Rg, viewMatrix), .04).g;
      trans.b = textureCubeUV(envMap, inverseTransformDirection(Rb, viewMatrix), .04).b;
    #else
      trans = textureCubeUV(envMap, inverseTransformDirection(Rg, viewMatrix), .04).rgb;
    #endif
    // light bouncing off a back facet: the facet mirrored through the view axis, so every facet shows another patch of the studio
    vec3 Nb = normalize(reflect(-Nv, Vv)); vec3 Rin = reflect(Rg, Nb);
    trans += kInner * textureCubeUV(envMap, inverseTransformDirection(Rin, viewMatrix), .08).rgb;
    trans *= kEnvRefr * envMapIntensity;
  #endif
  if (kUseScene > .5) {
    vec2 suv = gl_FragCoord.xy / kScreen + Rg.xy * kSceneRefr;
    vec3 sc = texture2D(kScene, clamp(suv, vec2(.001), vec2(.999))).rgb;
    if (kSceneSRGB > .5) sc = pow(sc, vec3(2.2));
    trans += sc * kSceneGain;
  }
  kalpiT = (trans * (1. - Fr) * kTrans + baked) * absorb * body;
  // sparkle: three tiny hard lights; a flat facet flashes whole when it lines up
  float sp = 0.;
  for (int i = 0; i < 3; i++) { vec3 Lv = normalize((viewMatrix * vec4(kSpark[i], 0.)).xyz); sp += pow(max(dot(Nv, normalize(Lv + Vv)), 0.), kSparkPow); }
  kalpiT += kSparkI * sp * vec3(1., .98, .96);
  // fresnel rim: the glass edges pick up the stage light
  kalpiT += kRim * pow(1. - NdV, 3.) * kRimCol;
  #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
    // facet edges: where the flat normal jumps between neighbouring pixels, add a thin line of reflected light
    float edge = clamp(length(fwidth(normal)) * 5. - .05, 0., 1.);
    vec3 refl = textureCubeUV(envMap, inverseTransformDirection(reflect(Iv, Nv), viewMatrix), .15).rgb;
    kalpiT += kEdge * edge * (refl * .6 + .08) * envMapIntensity;
  #endif
}`)
      .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'outgoingLight += kalpiT;\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );');
  };
  m.customProgramCacheKey = () => 'kalpi-glass-' + (m.defines && m.defines.KALPI_DISPERSION ? 'd' : 'n');
}

/* brushed metal: fine streaks in roughness and a touch in colour, in object space so atlas seams do not show */
function patchBrush(m, u) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u); addObjPos(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float kBrush; uniform float kBrushFreq; uniform float kBrushDir;' + NOISE)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
{
  float ang = atan(vKObj.z, vKObj.x);
  float x = kBrushDir < .5 ? ang * kBrushFreq : vKObj.y * kBrushFreq * 6.;          // 0: vertical lines (straight brush), 1: rings (spun)
  float s = kNoise1(x) * .6 + kNoise1(x * 3.7 + 11.) * .4;
  roughnessFactor = clamp(roughnessFactor * (1. + kBrush * (s - .5) * 1.4), .04, 1.);
  diffuseColor.rgb *= 1. + kBrush * .08 * (s - .5);
}`);
  };
  m.customProgramCacheKey = () => 'kalpi-brush';
}

/* ---------------------------------------------------------------- presets ---------- */
const P = {};
function base(o, extra) {
  const m = new THREE.MeshPhysicalMaterial(Object.assign({
    color: lin(o.color != null ? o.color : 0xffffff), roughness: .5, metalness: 0, envMapIntensity: o.env != null ? o.env : 1,
    side: THREE.DoubleSide,       // Rodin meshes are not always closed or consistently wound (the candle's rim showed its inside as if glass)
  }, extra));
  if (o.map) { m.map = o.map; m.map.encoding = THREE.sRGBEncoding; if (o.color == null) m.color.set(0xffffff); }
  if (o.colorScale) m.color.multiplyScalar(o.colorScale);
  if (o.normalMap) { m.normalMap = o.normalMap; m.normalScale = new THREE.Vector2(o.normalScale || 1, -(o.normalScale || 1)); }
  return m;
}

/* glass and crystal. tint = the colour light takes on through ~attenuationDistance of glass ('#ffffff' = clear). */
P.glass = o => {
  o = Object.assign({ ior: 1.5, thickness: .2, attenuationDistance: .5, transmission: .92, roughness: .03, dispersion: .008, envRefraction: 1, inner: .25, sceneRefraction: .03, tint: '#ffffff', quality: 'high' }, o);
  const m = base({ color: o.surface || '#0a080c', env: o.env }, { roughness: o.roughness, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, side: THREE.FrontSide });
  m.reflectivity = Math.min(1, Math.sqrt(Math.pow((o.ior - 1) / (o.ior + 1), 2) / .16));     // r128: F0 = .16 * reflectivity²
  if (o.map) { m.map = o.map; m.map.encoding = THREE.sRGBEncoding; m.color.copy(lin(o.surface || '#0a080c')); o.tintMapAmount = o.tintMapAmount != null ? o.tintMapAmount : 1; }
  const u = {
    kTint: { value: lin(o.tint) }, kAttDist: { value: o.attenuationDistance }, kThick: { value: o.thickness }, kIor: { value: o.ior },
    kTrans: { value: o.transmission }, kDisp: { value: o.dispersion }, kEnvRefr: { value: o.envRefraction }, kInner: { value: o.inner },
    kUseScene: { value: 0 }, kSceneRefr: { value: o.sceneRefraction }, kScene: { value: null }, kScreen: { value: new THREE.Vector2(1, 1) },
    kSceneSRGB: { value: 0 }, kTintMapAmt: { value: o.tintMapAmount || 0 }, kEdge: { value: o.edges != null ? o.edges : 0 },
    kMapGain: { value: o.mapGain || 1 }, kBaked: { value: o.baked != null ? o.baked : .5 }, kRecolor: { value: new THREE.Color(1, 1, 1) }, kRecolorAmt: { value: 0 },
    kSpark: { value: (o.sparkDirs || [[-.55, .7, .45], [.6, .45, .65], [.1, .9, -.3]]).map(d => new THREE.Vector3().fromArray(d).normalize()) },
    kSparkI: { value: o.sparkle != null ? o.sparkle : 0 }, kSparkPow: { value: o.sparkPow || 900 }, kRim: { value: o.rim != null ? o.rim : .12 }, kRimCol: { value: lin(o.rimColor || '#DCD4FF') },
    kSceneGain: { value: o.sceneGain || 1.6 },
  };
  m.defines = m.defines || {}; if (o.quality === 'high' && o.dispersion > 0) m.defines.KALPI_DISPERSION = '';
  patchGlass(m, u);
  m.userData.kalpi = { preset: 'glass', u, quality: o.quality };
  if (o.recolor) { const c = lin(o.recolor), l = .2126 * c.r + .7152 * c.g + .0722 * c.b; u.kRecolor.value.copy(c).multiplyScalar(1 / Math.max(l, 1e-3)); u.kRecolorAmt.value = 1; }
  /* newer-three names (r128 lacks them; its own `ior` only drives reflectivity, so ours is kalpiIor) */
  const def = (k, get, set) => { if (!(k in m)) Object.defineProperty(m, k, { get, set, configurable: true }); };
  def('attenuationColor', () => u.kTint.value, v => u.kTint.value.copy(lin(v)));
  def('attenuationDistance', () => u.kAttDist.value, v => { u.kAttDist.value = v; });
  def('thickness', () => u.kThick.value, v => { u.kThick.value = v; });
  Object.defineProperty(m, 'kalpiIor', { get: () => u.kIor.value, set: v => { u.kIor.value = v; }, configurable: true });
  m.kalpiTransmission = o.transmission;
  return m;
};
/* faceted gem: higher ior, more fire, stronger inner bounces. Facets come from the geometry's flat normals. */
P.crystal = o => P.glass(Object.assign({ ior: 1.9, dispersion: .028, inner: .45, envRefraction: 1.15, thickness: .22, attenuationDistance: .2, edges: .7 }, o));

P.metalPolished = o => base(Object.assign({ color: KM.METALS.gold }, o), { metalness: 1, roughness: o.roughness != null ? o.roughness : .12, clearcoat: 0 });
P.metalBrushed = o => {
  const m = base(Object.assign({ color: KM.METALS.steel }, o), { metalness: 1, roughness: o.roughness != null ? o.roughness : .35 });
  const u = { kBrush: { value: o.brushAmount != null ? o.brushAmount : .6 }, kBrushFreq: { value: o.brushFreq || 90 }, kBrushDir: { value: o.brush === 'circular' ? 1 : 0 } };
  patchBrush(m, u); m.userData.kalpi = { preset: 'metalBrushed', u };
  return m;
};
const dielectric = o => Object.assign({ env: .5 }, o);
P.lacquer = o => base(dielectric(o), { roughness: o.roughness != null ? o.roughness : .28, clearcoat: 1, clearcoatRoughness: .03 });         // glossy lacquer / plastic
P.powderCoat = o => base(dielectric(o), { roughness: o.roughness != null ? o.roughness : .68, clearcoat: 0 });                                 // matte paint
P.satin = o => {                                                                                                                    // lipstick bullet, soft-touch
  const m = base(dielectric(o), { roughness: o.roughness != null ? o.roughness : .45, clearcoat: o.clearcoat || 0, clearcoatRoughness: .35 });
  if (o.sheen) m.sheen = lin(o.sheenColor || o.color || '#ffffff').multiplyScalar(o.sheen);
  return m;
};
P.wood = o => base(dielectric(o), { roughness: o.roughness != null ? o.roughness : .55, clearcoat: o.clearcoat != null ? o.clearcoat : .25, clearcoatRoughness: .3 });   // oiled bamboo; keep the texture as map
P.ceramic = o => {                                                                                                                  // glaze, polished stone
  const m = base(dielectric(o), { roughness: o.roughness != null ? o.roughness : .3, clearcoat: o.glaze != null ? o.glaze : 1, clearcoatRoughness: o.glazeRoughness != null ? o.glazeRoughness : .04 });
  /* marble: Rodin carved the candle's veins into the geometry (bumps), not the colour. The part GLB keeps Rodin's normals
     as _normal_orig and gives the vessel clean ones; where the two disagree, grey vein colour goes into the stone. */
  if (o.veins) {
    const u = { kVein: { value: o.veins }, kVeinGain: { value: o.veinGain || 6 }, kVeinCol: { value: lin(o.veinColor || '#80838b') } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'attribute vec3 _normal_orig;\nvarying float vKVein;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vKVein = 1. - clamp(dot(normalize(_normal_orig), normalize(objectNormal)), 0., 1.);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vKVein; uniform float kVein; uniform float kVeinGain; uniform vec3 kVeinCol;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n{ float v = smoothstep(.04, .7, vKVein * kVeinGain); diffuseColor.rgb = mix(diffuseColor.rgb, kVeinCol, v * kVein); }');
    };
    m.customProgramCacheKey = () => 'kalpi-veins';
  }
  return m;
};
P.liquid = o => {                                                                                                                   // seen through glass: glossy and a little self-lit
  const m = base(o, { roughness: .08, clearcoat: 1, clearcoatRoughness: .02 });
  m.emissive = lin(o.color || '#E8B477').multiplyScalar(o.glow != null ? o.glow : .18);
  return m;
};
KM.presets = Object.keys(P);
KM.make = (name, opts) => { if (!P[name]) throw new Error('unknown preset ' + name); return P[name](opts || {}); };

/* ---------------------------------------------------------------- studio environment ---------- */
/* A dark room with softboxes and strip lights, rendered once into a PMREM. Dark walls keep the stage near-black in
 * reflections; the bright strips are what metal and glass need in order to read as metal and glass. */
KM.studioEnv = function (renderer, opts) {
  opts = Object.assign({ warm: '#fff4ec', cool: '#e8eeff', rim: '#B3A3EE', floor: '#120d18' }, opts);
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 16, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: lin('#0d0b12') }));
  room.position.y = 4; s.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: lin(opts.floor) })); floor.rotation.x = -Math.PI / 2; floor.position.y = -2.5; s.add(floor);
  const card = (w, h, c, k, x, y, z, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: lin(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(look || new THREE.Vector3(0, 0, 0)); s.add(m); return m;
  };
  card(5, 5, opts.warm, 2.6, 0, 9.5, 1.5);               // overhead softbox
  card(16, 9, '#d8cfe4', .9, 0, 3, -11.5);               // big dim backdrop: what clear glass shows through itself
  card(1.6, 9, opts.warm, 6.5, -7.5, 2, 2.5);            // left strip (the long highlight down metal)
  card(1.2, 9, opts.cool, 6, 7.5, 1.5, -1.5);            // right strip
  card(7, 2.2, '#ffffff', 1.6, 0, 1.2, 10);              // soft front fill
  card(10, 1, opts.rim, 4, 0, 3.5, -10);                  // lilac rim behind
  card(.7, .7, '#ffffff', 40, -3.2, 5.2, 6);              // three small hot cards: pin-point sparkle in facets
  card(.5, .5, '#ffffff', 40, 4.5, 3.8, 5);
  card(.5, .9, '#ffffff', 30, 2.5, 7, -4);
  card(.4, .4, '#ffffff', 25, -5, 1.2, -5); card(.4, .4, '#fff6ee', 25, 5.5, 2.5, -4.5); card(.3, .6, '#ffffff', 25, -1.5, -1, -7);   // behind: points the glass refracts
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(s, .01).texture; pm.dispose();
  s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return t;
};
/* the "before" lighting the old viewers used: three's RoomEnvironment at env .25 */
KM.roomEnv = function (renderer) {
  if (!THREE.RoomEnvironment) return null;
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(new THREE.RoomEnvironment(), .04).texture; pm.dispose(); return t;
};

/* ---------------------------------------------------------------- transmission pass ---------- */
/* Renders the scene without its glass into a texture (half size by default) that the glass samples, refracted.
 * Cost: one extra scene render per frame. Floors with Reflector are hidden in this pass (they would cost a third render). */
KM.Transmission = function (renderer, opts) {
  opts = Object.assign({ scale: .5 }, opts);
  const gl = renderer.getContext(), webgl2 = renderer.capabilities.isWebGL2;
  const half = webgl2 || (renderer.extensions.has('OES_texture_half_float') && renderer.extensions.has('OES_texture_half_float_linear'));
  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, encoding: half ? THREE.LinearEncoding : THREE.sRGBEncoding, depthBuffer: true });
  const size = new THREE.Vector2(), glassMeshes = new Set();
  const self = {
    rt, enabled: true,
    add(mesh) { glassMeshes.add(mesh); hookMesh(mesh); },
    clear() { glassMeshes.clear(); },
    render(scene, camera, hide) {
      renderer.getDrawingBufferSize(size);
      const w = Math.max(2, Math.round(size.x * opts.scale)), h = Math.max(2, Math.round(size.y * opts.scale));
      if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
      const live = [...glassMeshes].filter(m => m.visible && m.material.userData.kalpi && m.material.userData.kalpi.preset === 'glass');
      live.forEach(m => { const u = m.material.userData.kalpi.u; u.kScene.value = rt.texture; u.kScreen.value.copy(size); u.kSceneSRGB.value = half ? 0 : 1; });
      if (!self.enabled || !live.length) { live.forEach(m => { m.material.userData.kalpi.u.kUseScene.value = 0; }); return; }
      const hidden = live.concat(hide || []).filter(o => o.visible); hidden.forEach(o => { o.visible = false; });
      const old = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(old);
      hidden.forEach(o => { o.visible = true; });
      live.forEach(m => { m.material.userData.kalpi.u.kUseScene.value = 1; });
    },
    dispose() { rt.dispose(); },
  };
  /* inside other render passes (a mirror floor) the screen-space texture does not line up: fall back to the studio */
  function hookMesh(mesh) {
    if (mesh.userData.kalpiHooked) return; mesh.userData.kalpiHooked = true;
    mesh.onBeforeRender = (r) => {
      const k = mesh.material.userData.kalpi; if (!k || k.preset !== 'glass') return;
      const inPass = r.getRenderTarget() !== null;
      k.u.kUseScene.value = (!inPass && self.enabled && k.u.kScene.value) ? 1 : 0;
    };
  }
  return self;
};

/* ---------------------------------------------------------------- quality ---------- */
/* 'low' on weak or software GPUs and small-memory phones; '?q=high' / '?q=low' in the address wins. */
KM.detectQuality = function (renderer) {
  try {
    const q = new URLSearchParams(location.search).get('q'); if (q === 'high' || q === 'low') return q;
  } catch (e) { /* no location */ }
  const nav = root.navigator || {};
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '');
  let gpu = '';
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { /* hidden */ }
  if (/SwiftShader|llvmpipe|Software|Mali-[4T]|Adreno \(TM\) [3-5]\d\d|PowerVR SGX/i.test(gpu)) return 'low';
  if (mobile && ((nav.deviceMemory && nav.deviceMemory <= 3) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4))) return 'low';
  if (!renderer.capabilities.isWebGL2 && mobile) return 'low';
  return 'high';
};
/* frame-time watchdog: call tick(ms) each animated frame; returns true once when it is time to drop to 'low' */
KM.watchdog = function (limitMs, frames) {
  limitMs = limitMs || 30; frames = frames || 90; let n = 0, sum = 0, fired = false;
  return { tick(ms) { if (fired || ms > 250) return false; n++; sum += ms; if (n >= frames) { const avg = sum / n; n = 0; sum = 0; if (avg > limitMs) { fired = true; return true; } } return false; } };
};

/* ---------------------------------------------------------------- product recipes ---------- */
/* part names = mesh names in the *-parts.glb files. Variant overrides touch only what they list. */
const M = KM.METALS;
KM.PRODUCTS = {
  /* yaw (degrees) turns the default view to the photo's front. painted-back products: the shared map is the photo projected onto the front (and mirrored onto the back), colour-matched
     elsewhere. The presets add what a photo cannot: roughness, metalness, clearcoat, refraction, sparkle. */
  lipstick: {
    label: 'Diamond lipstick', file: 'lipstick-parts.glb', before: 'before/lipstick-rodin-diffuse.webp', yaw: 10,
    parts: {
      cap:    { preset: 'crystal', useMap: true, tint: '#ffffff', mapGain: 1.0, baked: .45, rimColor: '#ffffff', ior: 1.9, thickness: .24, attenuationDistance: 1, dispersion: .03, inner: .6, envRefraction: 1, sparkle: 2.4, rim: .08 },
      collar: { preset: 'metalPolished', useMap: true, color: '#ffffff', colorScale: 1.4, roughness: .2, env: 1.8 },
      case:   { preset: 'metalBrushed', useMap: true, color: '#ffffff', colorScale: 1.2, env: 1.25, roughness: .32, brush: 'vertical', brushAmount: .12, brushFreq: 300 },
      bullet: { preset: 'satin', useMap: true, useNormalMap: true, roughness: .45, env: .25 },
    },
    variants: {                                   // only the crystal cap changes; the bullet stays the photo's plum-red
      A: { name: 'Amethyst', ring: '#B4AAFF', swatch: '#5E3A4C', parts: {} },
      B: { name: 'Ruby',     ring: '#FF8FA6', swatch: '#8E1028', parts: { cap: { recolor: '#B0142E' } } },
      C: { name: 'Sapphire', ring: '#8FB3FF', swatch: '#1A3590', parts: { cap: { recolor: '#2246B4' } } },
    },
    defaultVariant: 'A',
  },
  perfume: {
    label: 'Art-deco perfume', file: 'perfume-parts.glb', before: 'before/perfume-rodin-diffuse.webp', yaw: 102,
    parts: {
      glass:  { preset: 'crystal', useMap: true, tint: '#ffffff', mapGain: 1.25, baked: .6, ior: 1.55, thickness: .2, attenuationDistance: 1, dispersion: .018, inner: .3, sceneRefraction: .05, sparkle: 2, rim: .16 },
      collar: { preset: 'metalPolished', useMap: true, color: '#ffffff', colorScale: 1.3, roughness: .14 },
      cap:    { preset: 'metalPolished', useMap: true, color: '#ffffff', colorScale: 1.45, roughness: .2, env: 1.9 },
    },
    variants: { A: { name: 'Blush', ring: '#FFB3C4', parts: {} } }, defaultVariant: 'A',
  },
  candle: {
    label: 'Marble candle', file: 'candle-parts.glb', before: 'before/candle-rodin-diffuse.webp', yaw: 36,
    parts: {
      vessel: { preset: 'ceramic', useMap: true, env: .32, roughness: .25, glaze: .6, glazeRoughness: .05 },   // polished Carrara: veins from the photo, no normal-map bumps
      lid:    { preset: 'metalBrushed', useMap: true, color: '#E8D2A8', colorScale: 1.1, env: 1.3, roughness: .4, brush: 'circular', brushAmount: .3, brushFreq: 160 },
      knob:   { preset: 'metalPolished', useMap: true, color: '#ffffff', colorScale: 1.2, env: 2, roughness: .16 },
    },
    variants: { A: { name: 'Carrara', ring: '#E8D7A8', parts: {} } }, defaultVariant: 'A',
  },
  bottle: {
    label: 'Sage bottle', file: 'bottle-parts.glb', yaw: 0,
    parts: {
      body:   { preset: 'powderCoat', useMap: true, roughness: .66 },
      lid:    { preset: 'wood', useMap: true, useNormalMap: true, roughness: .55 },
      rim:    { preset: 'metalPolished', color: M.steel, roughness: .12 },
      handle: { preset: 'metalPolished', color: M.steel, roughness: .12 },
    },
    variants: { A: { name: 'Sage', ring: '#B9D4B0', parts: {} } }, defaultVariant: 'A',
  },
};

/* textures of a part-split GLB: every part shares Rodin's one atlas; find it on whichever material kept it */
function sharedTextures(rootObj) {
  const t = {};
  rootObj.traverse(o => { if (!o.isMesh) return; const m = o.userData.kalpiOrig || o.material; ['map', 'normalMap', 'metalnessMap', 'roughnessMap'].forEach(k => { if (m[k] && !t[k]) t[k] = m[k]; }); });
  if (t.map) t.map.encoding = THREE.sRGBEncoding;
  return t;
}
/* "before": Rodin's single material exactly as GLTFLoader builds it from the original file (all factors 1) */
function beforeMaterial(tex, beforeMap) {
  return new THREE.MeshStandardMaterial({ map: beforeMap || tex.map || null, normalMap: tex.normalMap || null, metalnessMap: tex.metalnessMap || null, roughnessMap: tex.roughnessMap || tex.metalnessMap || null, metalness: 1, roughness: 1, envMapIntensity: .25, side: THREE.DoubleSide });
}

/* apply(rootObj, product, { variant, quality, mode, transmission, beforeMap })
 * — swaps materials in place; cheap to call again. beforeMap: Rodin's own diffuse (recipe.before), for an honest "before"
 * of a painted-back GLB; load it with KM.loadBeforeMap(url). */
KM.apply = function (rootObj, product, opts) {
  const R = typeof product === 'string' ? KM.PRODUCTS[product] : product;
  opts = Object.assign({ variant: R.defaultVariant || 'A', quality: 'high', mode: 'after' }, opts);
  const tex = sharedTextures(rootObj), V = (R.variants && R.variants[opts.variant]) || { parts: {} };
  const glass = [];
  rootObj.traverse(o => {
    if (!o.isMesh) return;
    if (!o.userData.kalpiOrig) { o.userData.kalpiOrig = o.material; o.userData.kalpiNormal = o.geometry.attributes.normal; }
    const g = o.geometry;
    if (opts.mode === 'before') {
      if (g.attributes._normal_orig) g.setAttribute('normal', g.attributes._normal_orig);      // Rodin's own smooth normals
      o.material = o.userData.kalpiBefore || (o.userData.kalpiBefore = beforeMaterial(tex, opts.beforeMap));
      if (o.name === 'liquid') o.visible = false;                                                 // the liquid is ours, not Rodin's
      return;
    }
    o.visible = true;
    g.setAttribute('normal', o.userData.kalpiNormal);
    const spec = R.parts[o.name]; if (!spec) return;
    const s = Object.assign({}, spec, (V.parts || {})[o.name] || {}, { quality: opts.quality });
    if (s.useMap) s.map = tex.map;
    if (s.useNormalMap) s.normalMap = tex.normalMap;
    const key = JSON.stringify(Object.assign({}, s, { map: !!s.map, normalMap: !!s.normalMap }));
    o.userData.kalpiCache = o.userData.kalpiCache || {};
    const m = o.userData.kalpiCache[key] || (o.userData.kalpiCache[key] = KM.make(s.preset, s));
    o.material = m;
    if (m.userData.kalpi && m.userData.kalpi.preset === 'glass') { glass.push(o); if (opts.transmission) opts.transmission.add(o); }
  });
  return { glass, ring: V.ring || '#B4AAFF', name: V.name || '' };
};

KM.loadBeforeMap = url => new Promise(res => new THREE.TextureLoader().load(url, t => { t.flipY = false; t.encoding = THREE.sRGBEncoding; res(t); }, undefined, () => res(null)));

root.KalpiMaterials = KM;
})(typeof window !== 'undefined' ? window : this);
