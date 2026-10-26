/* ==== KALPI STAGE KIT · the three.js dark stage, ring and product, taken verbatim from the approved options page
   (team-notes/design-options/kalpi-look-options.html: kStage, makePhoto, mountTexture, ring) and adapted to real products:
   one painted-back GLB per colour (meshopt + WebP), no hue shifting. Every colour comes from kalpi-stage.css. ==== */
(function () {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, t) => a + (b - a) * t;
function glOK() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }
function whenVisible(el, cb) { if (!('IntersectionObserver' in window)) { cb(true); return; } new IntersectionObserver(es => cb(es[es.length - 1].isIntersecting), { rootMargin: '100px' }).observe(el); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function softSprite(inner, outer) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; }
/* a whole photo on a white mount: the photo is drawn with its own aspect, never cropped */
function mountTexture(img, pad, mount, radius) {
  const W = 1024, ar = img.width / img.height, ph = W / ar, H = Math.round(ph + 0) ;
  const p = Math.round(W * pad), c = document.createElement('canvas'); c.width = W + 2 * p; c.height = H + 2 * p;
  const g = c.getContext('2d'); g.fillStyle = mount; const r = radius || 0;
  g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r); g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.fill();
  g.drawImage(img, p, p, W, H);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return { tex: t, aspect: c.width / c.height };
}

const VS_UV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }';
const NOISE = 'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }';
const HSV = 'vec3 rgb2hsv(vec3 c){ vec4 K = vec4(0., -1./3., 2./3., -1.); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); float e = 1.0e-10; return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x); } vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(1., 2./3., 1./3.)) * 6. - 3.); return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y); }';
/* the signature ring: a thin white-hot core inside a soft halo in the theme's own hue */
const RING_FS = 'uniform vec3 uC; uniform float uA; uniform float uR; uniform float uW; uniform float uFill; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float band = exp(-pow((r - uR) / uW, 2.)); float core = exp(-pow((r - uR) / (uW * .22), 2.)); float fill = uFill * smoothstep(uR, 0., r) * .2; vec3 c = uC * (band + fill) + vec3(1.) * core * .5; gl_FragColor = vec4(c * uA, 1.); }';
function kStage(stageEl, opt) {
  opt = opt || {};
  const cv = stageEl.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.NoToneMapping; /* colour fix: ACES washed the pinks out */
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(opt.fov || 26, 1, .1, 60);
  /* the studio: materials.js's procedural softbox room when it is loaded (glass and metal need its strip lights), else three's room */
  const KM = window.KalpiMaterials;
  const roomEnv = (() => { const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(new THREE.RoomEnvironment(), .04).texture; pm.dispose(); return t; })();
  const studio = KM ? KM.studioEnv(renderer) : null;
  scene.environment = roomEnv;
  /* glass: a screen-space transmission pass on good GPUs; 'low' (phones, software GPUs) keeps tinted gloss with no extra pass */
  const quality = KM ? KM.detectQuality(renderer) : 'low', pass = KM && quality === 'high' ? KM.Transmission(renderer, { scale: .5 }) : null, wd = KM ? KM.watchdog(34, 90) : null;
  const C = { bg: new THREE.Color(), top: new THREE.Color(), glow: new THREE.Color(), ring: new THREE.Color(), rimL: new THREE.Color(), rimR: new THREE.Color(), floor: new THREE.Color(), dust: new THREE.Color(), cone: new THREE.Color() };
  scene.fog = new THREE.Fog(0, 8, 18); scene.fog.color = C.bg;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), new THREE.ShaderMaterial({ fog: false, uniforms: { uI: { value: 1 }, uBg: { value: C.bg }, uTop: { value: C.top }, uGlow: { value: C.glow } }, vertexShader: VS_UV,
    fragmentShader: 'uniform float uI; uniform vec3 uBg; uniform vec3 uTop; uniform vec3 uGlow; varying vec2 vUv; void main(){ vec2 d = (vUv - vec2(.5,.42)) * vec2(2.2,1.); float g = exp(-dot(d,d)*8.) * smoothstep(.27, .4, vUv.y); vec3 base = mix(uBg, uTop, smoothstep(.28, .62, vUv.y)); gl_FragColor = vec4(mix(base, uGlow, g * uI), 1.); }' }));
  back.position.set(0, 4, -7); scene.add(back);

  const floorGeo = new THREE.PlaneGeometry(40, 40); let mirror = null;
  if (THREE.Reflector) { mirror = new THREE.Reflector(floorGeo, { textureWidth: 512, textureHeight: 512, color: 0x8a8a98, clipBias: .003 }); mirror.rotation.x = -Math.PI / 2; mirror.material.uniforms.color.value = C.floor; scene.add(mirror); }
  const veil = new THREE.Mesh(floorGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uPool: { value: 1 }, uCol: { value: C.bg }, uGlow: { value: C.glow } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uPool; uniform vec3 uCol; uniform vec3 uGlow; varying vec3 vW; void main(){ float d = length(vW.xz*vec2(.8,1.1)); float a = mix(.66, 1., smoothstep(.4, 4.2, d)); vec3 pool = uGlow * 1.6 * uPool * exp(-d*d*.55); gl_FragColor = vec4(uCol + pool, a); }' }));
  veil.rotation.x = -Math.PI / 2; veil.position.y = .002; veil.renderOrder = -1; scene.add(veil);
  const hideInMirror = [veil];
  if (mirror) { const ob = mirror.onBeforeRender; mirror.onBeforeRender = function () { hideInMirror.forEach(o => { o.userData.wasVis = o.visible; o.visible = false; }); ob.apply(this, arguments); hideInMirror.forEach(o => { o.visible = o.userData.wasVis; }); }; }

  const key = new THREE.SpotLight(0xf7f6f8, 2.3, 0, .5, .85, 1); key.position.set(.4, 5.6, 2.8); key.target.position.set(0, .6, 0); scene.add(key, key.target);
  const rimL = new THREE.DirectionalLight(0xffffff, 1.25); rimL.color = C.rimL; rimL.position.set(-3, 2.4, -2.6); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xffffff, .9); rimR.color = C.rimR; rimR.position.set(3.2, 2, -2.2); scene.add(rimR);
  const fill = new THREE.HemisphereLight(0xe9e9eb, 0x08080a, .18); scene.add(fill);
  const sweep = new THREE.PointLight(0xffffff, 0, 6, 2); sweep.position.set(-3, 1.1, 1.4); scene.add(sweep);

  const coneH = 5.4, coneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uI: { value: 1 }, uC: { value: C.cone } },
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y/' + coneH.toFixed(1) + ' + .5; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uI; uniform vec3 uC; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 2.2); float a = uI * .085 * f * smoothstep(0., .55, vY) * (1. - smoothstep(.85, 1., vY)); gl_FragColor = vec4(uC*a, 1.); }' });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(opt.coneR || 1.45, coneH, 64, 1, true), coneMat); cone.position.set(.08, coneH / 2, .55); cone.rotation.z = -.03; scene.add(cone);

  const dustTex = softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  function dust(n, spread, size, op, near) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * spread; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.random() * 4; p[i * 3 + 2] = Math.sin(a) * r * .7 + (near ? 2.6 : .4); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ map: dustTex, size, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); m.color = C.dust;
    const pts = new THREE.Points(g, m); pts.userData.op = op; scene.add(pts); return pts;
  }
  const motes = dust(opt.motes || 220, opt.dustSpread || 1.3, .022, .55, false), bokeh = dust(14, 1.6, .32, .07, true);
  const shadowTex = softSprite('rgba(0,0,0,0.9)', 'rgba(0,0,0,0)');

  const S = { renderer, scene, cam, C, mirror, hideInMirror, key, rimL, rimR, sweep, cone, studio, roomEnv, quality, pass, el: stageEl, cv, W: 1, H: 1, mouse: { x: 0, y: 0, sx: 0, sy: 0 }, onResize: null, rings: [] };
  S.light = li => { key.intensity = 2.3 * li * .75; rimL.intensity = 1.25 * li * .6; rimR.intensity = .9 * li * .6; fill.intensity = .18 * li; coneMat.uniforms.uI.value = li; back.material.uniforms.uI.value = li; veil.material.uniforms.uPool.value = li; motes.material.opacity = motes.userData.op * li; bokeh.material.opacity = bokeh.userData.op * li; };
  S.ring = (size, R, W, fill) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uC: { value: C.ring }, uA: { value: 0 }, uR: { value: R || .72 }, uW: { value: W || .1 }, uFill: { value: fill || 0 } }, vertexShader: VS_UV, fragmentShader: RING_FS }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 3; scene.add(m); hideInMirror.push(m); return m;
  };
  S.shadow = (w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: .75, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.position.y = .006; m.renderOrder = 2; scene.add(m); hideInMirror.push(m); return m; };
  const vf = () => THREE.MathUtils.degToRad(cam.fov / 2);
  S.fitDist = (hw, hh, extra) => { const hf = Math.atan(Math.tan(vf()) * cam.aspect); return Math.max(hw / Math.tan(hf), hh / Math.tan(vf())) + (extra == null ? .4 : extra); };
  const tmp = new THREE.Vector3();
  S.place = (el, x, y, z, op) => { tmp.set(x, y, z).project(cam); el.style.transform = 'translate(' + ((tmp.x * .5 + .5) * S.W).toFixed(1) + 'px,' + ((-tmp.y * .5 + .5) * S.H).toFixed(1) + 'px) translate(-50%,0)'; if (op != null) el.style.opacity = op; };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  S.pick = (e, objs) => { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const h = ray.intersectObjects(objs, true); return h.length ? h[0].object.userData.v : -1; };
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); S.mouse.x = ((e.clientX - r.left) / r.width - .5) * 2; S.mouse.y = ((e.clientY - r.top) / r.height - .5) * 2; });
  cv.addEventListener('pointerleave', () => { S.mouse.x = S.mouse.y = 0; });
  /* the camera drifts a little with the mouse anywhere on the page (opt.pageMouse) */
  if (opt.pageMouse) addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; S.mouse.x = (e.clientX / innerWidth - .5) * 2; S.mouse.y = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  /* theme cross-fade: every environment colour eases to the new theme in 0.9s */
  /* base = the theme's colours (cross-faded); C = what the scene uses: base plus the selected version's tint on the ring and rims */
  const base = {}, from = {}, to = {}; let tk = 1;
  for (const k in C) base[k] = new THREE.Color();
  function themeTo(t, instant) {
    const tg = { bg: t.bg, top: t.top || t.bg, glow: t.glow, ring: t.ring, rimL: t.rimL, rimR: t.rimR, floor: t.floor, dust: t.dust };
    for (const k in tg) { from[k] = base[k].clone(); to[k] = new THREE.Color(tg[k]); }
    from.cone = base.cone.clone(); to.cone = new THREE.Color(0xffffff).lerp(to.ring, .35);
    if (instant || reduce) { for (const k in to) base[k].copy(to[k]); tk = 1; } else tk = 0;
    derive();
  }
  const vc = new THREE.Color(), vcTo = new THREE.Color(); let vk = 0, vkTo = 0;
  /* the ring takes the selected product's colour and blends to it: S.version('#BA6246'), or S.version(null) for the theme's own ring */
  S.version = c => { if (c) { vcTo.set(c); if (vk < .01) vc.copy(vcTo); vkTo = 1; } else vkTo = 0; };
  function derive() {
    for (const k in base) C[k].copy(base[k]);
    if (vk > .001) { C.ring.lerp(vc, vk); C.rimL.lerp(vc, .35 * vk); C.rimR.lerp(vc, .2 * vk); C.cone.lerp(vc, .15 * vk); }
  }
  themeTo(tokTheme(), true);

  function resize() {
    S.W = Math.max(1, stageEl.clientWidth); S.H = Math.max(1, stageEl.clientHeight); renderer.setSize(S.W, S.H, false); cam.aspect = S.W / S.H; cam.updateProjectionMatrix();
    if (mirror) mirror.getRenderTarget().setSize(Math.min(1024, S.W * renderer.getPixelRatio() * .5), Math.min(1024, S.H * renderer.getPixelRatio() * .5));
    if (S.onResize) S.onResize();
  }
  new ResizeObserver(resize).observe(stageEl); resize();

  /* render only while this stage is on screen and the tab is visible */
  let visible = false, running = false, last = 0, upd = null;
  function loop() {
    if (running || !upd || !visible) return; running = true; last = 0;
    const f = now => {
      if (!visible || document.hidden) { running = false; return; }
      const raw = last ? (now - last) / 1000 : .016, dt = Math.min(.05, raw); last = now;
      if (tk < 1) { tk = Math.min(1, tk + raw / .9); const e = ease(tk); for (const k in to) base[k].copy(from[k]).lerp(to[k], e); }
      vk += (vkTo - vk) * Math.min(1, dt * 3); vc.lerp(vcTo, Math.min(1, dt * 3)); derive();
      renderer.setClearColor(C.bg, 1);
      const m = S.mouse; m.sx += (m.x - m.sx) * Math.min(1, dt * 2.2); m.sy += (m.y - m.sy) * Math.min(1, dt * 2.2);
      motes.rotation.y = now / 1000 * .02; bokeh.position.x = Math.sin(now / 10000) * .3;
      upd(dt, now / 1000, raw);
      if (S.pass && S.pass.enabled) S.pass.render(scene, cam, mirror ? [mirror] : []);
      if (wd && S.pass && wd.tick(raw * 1000)) S.pass.enabled = false;   /* too slow for the extra glass pass: drop it, keep the gloss */
      renderer.render(scene, cam); requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  whenVisible(stageEl, v => { visible = v; if (v) loop(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  S.start = fn => { upd = fn; loop(); };
  return S;
}

const setDim = (p, d, dt) => { p.dim += (d - p.dim) * Math.min(1, dt * 6); p.m.color.setScalar(p.dim); };

/* the seller's photo, whole, on a white mount (never cropped). It can dissolve along a scan line */
function makePhoto(S, img, h) {
  const t = mountTexture(img, .035, '#f3f2f7', 10), w = h * t.aspect;
  const u = { map: { value: t.tex }, uScan: { value: -99 }, uDir: { value: new THREE.Vector3(0, 1, 0) }, uA: { value: 1 }, uSweep: { value: -1 }, uGC: { value: S.C.ring } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform sampler2D map; uniform float uScan; uniform vec3 uDir; uniform float uA; uniform float uSweep; uniform vec3 uGC; varying vec2 vUv; varying vec3 vWP;\n' + NOISE + '\nvoid main(){ float n = vnoise(vUv*vec2(26.,32.))*.09; float e = dot(vWP, uDir) - uScan + n; if (e < 0.) discard; vec4 c = texture2D(map, vUv); c.rgb *= .88; float band = exp(-pow((vUv.x*.6 + vUv.y*.4 - uSweep)*6., 2.)); c.rgb += band * .26; float g = smoothstep(.07, 0., e); c.rgb = mix(c.rgb, uGC*1.5 + .15, g*.85); gl_FragColor = vec4(c.rgb, c.a * uA); }' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.userData.u = u; mesh.userData.h = h; mesh.userData.w = w; S.scene.add(mesh); return mesh;
}

/* the theme, read from kalpi-stage.css (the one source of truth) */
function tokTheme() { const cs = getComputedStyle(document.documentElement), t = n => cs.getPropertyValue(n).trim();
  return { bg: t('--st-bg') || '#070609', top: t('--st-top') || '#140E1D', glow: t('--st-glow') || '#261C39', ring: t('--st-ring') || '#B4AAFF', rimL: t('--st-rim-l') || '#B3A3EE', rimR: t('--st-rim-r') || '#D4E2EC', floor: t('--st-floor-ref') || '#8494A6', dust: t('--st-dust') || '#DCD8FF' }; }
const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* a real product: one painted-back GLB (meshopt + WebP). Loaded once per file, cloned per use */
const GLB = {};
let decP = null;
const decoder = () => decP || (decP = window.MeshoptDecoder ? window.MeshoptDecoder.ready.then(() => window.MeshoptDecoder) : Promise.reject(new Error('no meshopt decoder')));
function loadGLB(url) { return GLB[url] || (GLB[url] = Promise.all([decoder(), fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); })])
  .then(([dec, buf]) => new Promise((res, rej) => { const L = new THREE.GLTFLoader(); L.setMeshoptDecoder(dec); L.parse(buf, '', res, rej); })).then(g => {
    let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; }); if (!src) throw new Error('no mesh in ' + url);
    const box = new THREE.Box3().setFromObject(g.scene); return { scene: g.scene, src, box, size: box.getSize(new THREE.Vector3()), ctr: box.getCenter(new THREE.Vector3()) }; })); }

/* the product on the stage. Colour fix (3D-COLOUR-FIX.md): roughness .6, metalness 0, env .25, no tone mapping.
   opt.gloss keeps a crystal or metal part glossy: the file's own roughness/metal map, a lower roughness and a clear coat.
   uScan: the scan line builds it from the floor up. uCut/uSide: two colours hand over along a rising line (the ring passes up). */
function makeModel(S, M, h, opt) {
  opt = opt || {};
  const rc = opt.recolour || null;   /* free recolour: only texels near rc.hue (and saturated) change; the rest of the product is untouched */
  const u = { uDir: { value: new THREE.Vector3(0, 1, 0) }, uScan: { value: 99 }, uCut: { value: 99 }, uSide: { value: 1 }, uGlow: { value: 0 }, uMG: { value: 0 }, uLift: { value: 0 }, uGlowC: { value: S.C.ring },
    uRc: { value: new THREE.Vector4(rc ? rc.hue : 0, rc ? rc.width : 0, rc ? rc.sat : 1, 1) }, uTo: { value: new THREE.Vector3(-1, 1, 1) } };
  const om = M.src.material, map = om.map; if (map) { map.encoding = THREE.sRGBEncoding; map.anisotropy = 4; }
  const m = opt.gloss ? new THREE.MeshPhysicalMaterial({ map, normalMap: om.normalMap, roughnessMap: om.roughnessMap, metalnessMap: om.metalnessMap, roughness: .5, metalness: 1, clearcoat: .7, clearcoatRoughness: .12, envMapIntensity: .6 })
    : new THREE.MeshStandardMaterial({ map, normalMap: om.normalMap, roughness: .6, metalness: 0, envMapIntensity: .25 });
  m.side = THREE.DoubleSide;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = 'uniform vec3 uDir; uniform float uScan; uniform float uCut; uniform float uSide; uniform float uGlow; uniform float uMG; uniform float uLift; uniform vec3 uGlowC; uniform vec4 uRc; uniform vec3 uTo; varying vec3 vWP;\n' + HSV + '\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n if (uTo.x >= 0.) { vec3 sc = pow(max(diffuseColor.rgb, 0.), vec3(1./2.2)); vec3 hsv = rgb2hsv(sc); float d = abs(fract(hsv.x - uRc.x + .5) - .5); float k = smoothstep(uRc.y, uRc.y * .55, d) * smoothstep(uRc.z, uRc.z + .12, hsv.y) * uRc.w; sc = mix(sc, hsv2rgb(vec3(uTo.x, clamp(hsv.y * uTo.y, 0., 1.), clamp(hsv.z * uTo.z, 0., 1.))), k); diffuseColor.rgb = pow(sc, vec3(2.2)); }')
      .replace('void main() {', 'void main() {\n float sd = dot(vWP, uDir); if (sd > uScan) discard; if ((vWP.y - uCut) * uSide > 0.) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n { float g = uGlow * smoothstep(.07, 0., uScan - sd) + uMG * smoothstep(.05, 0., abs(uCut - vWP.y)); totalEmissiveRadiance += uGlowC * g * 2.2 + vec3(.05) * uLift; }');
  };
  const s = h / M.size.y, inner = M.scene.clone(true);
  inner.traverse(o => { if (o.isMesh) { o.material = m; o.userData.v = opt.idx == null ? 0 : opt.idx; } });
  inner.position.set(-M.ctr.x * s, -M.box.min.y * s, -M.ctr.z * s); inner.scale.setScalar(s);
  const g = new THREE.Group(); g.add(inner); S.scene.add(g);
  /* paint(hue, satMul, valMul) sets the version colour; paint(null) shows the file's own colour */
  const amount = a => { u.uRc.value.w = a; };
  const paint = (hue, sm, vm) => { if (hue == null) u.uTo.value.set(-1, 1, 1); else u.uTo.value.set(hue, sm == null ? 1 : sm, vm == null ? 1 : vm); };
  return { g, inner, m, u, paint, amount, lift: 0, dim: 1, w: M.size.x * s };
}

/* a part-split product with the real materials (team-notes/design-options/3d-test/lipstick/materials.js, copied to media/examples/):
   glass or crystal, polished and brushed metal, satin, ceramic. Variants change only what the recipe lists (the lipstick: the cap).
   The studio environment is set on these materials only, so the stage's other parts keep the plain room light. */
function makeParts(S, M, product, h, opt) {
  opt = opt || {}; const KM = window.KalpiMaterials, R = KM.PRODUCTS[product];
  const inner = M.scene.clone(true);
  const info = KM.apply(inner, product, { variant: opt.variant || R.defaultVariant, quality: S.quality, transmission: S.pass });
  inner.traverse(o => { if (o.isMesh) { o.userData.v = opt.idx == null ? 0 : opt.idx; if (S.studio) o.material.envMap = S.studio; o.material.needsUpdate = true; } });
  const yaw = new THREE.Group(); yaw.add(inner); yaw.rotation.y = THREE.MathUtils.degToRad(R.yaw || 0);
  const box = new THREE.Box3().setFromObject(yaw), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3()), s = h / size.y;
  yaw.scale.setScalar(s); yaw.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
  const g = new THREE.Group(); g.add(yaw); S.scene.add(g);
  const setVariant = v => { const r = KM.apply(inner, product, { variant: v, quality: S.quality, transmission: S.pass }); inner.traverse(o => { if (o.isMesh && S.studio) { o.material.envMap = S.studio; o.material.needsUpdate = true; } }); return r; };
  return { g, inner, info, ring: info.ring, setVariant, lift: 0, dim: 1, w: size.x * s };
}

function dragSpin(cv) {
  const st = { spin: 0, vel: 0, drag: null, moved: 0 };
  cv.addEventListener('pointerdown', e => { st.drag = e.clientX; st.moved = 0; });
  cv.addEventListener('pointermove', e => { if (st.drag == null) return; const dx = e.clientX - st.drag; st.drag = e.clientX; st.moved += Math.abs(dx); st.spin += dx * .008; st.vel = dx * .35; });
  addEventListener('pointerup', () => { st.drag = null; });
  st.step = dt => { if (st.drag == null) { st.spin += st.vel * dt; st.vel *= Math.pow(.04, dt); } };
  return st;
}

window.KalpiStage = { reduce, clamp, ease, easeOut, lerp, glOK, whenVisible, loadImg, softSprite, mountTexture, kStage, makePhoto, makeModel, makeParts, loadGLB, setDim, dragSpin, tok, VS_UV };
})();
