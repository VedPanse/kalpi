/* Rich hero engine (three.js r128, global build).
 *
 * One Stage per scene: HDR render (MSAA) -> depth pre-pass -> half-res raymarched atmosphere
 * (height fog + drifting noise + god rays from the key light's shadow map) -> composer:
 * compose -> depth of field (half-res gather) -> bloom -> ACES / grain / vignette.
 * Shadows use a PCSS patch (contact-hard, distance-soft). Everything animated is a pure
 * function of time t, so renderFrame(t) is deterministic for film capture.
 */
(function () {
'use strict';
const Q = new URLSearchParams(location.search);
const FILM = Q.get('film') === '1';
const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;
const TIER = Q.get('q') || (MOBILE ? 'low' : 'high');
const HI = TIER === 'high';

/* ------------------------------------------------------------------ PCSS patch ---------- */
/* light.shadow.radius is reused as the penumbra factor: penumbra(uv) = (receiverDepth - blockerDepth) * radius.
   For an orthographic sun: radius = (far - near) * tan(angular size) / frustum width. */
(function patchPCSS() {
  const C = THREE.ShaderChunk;
  const fn = `
float kIGN(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float kPCSS(sampler2D sm, vec2 size, float pf, vec4 sc){
  float rot = kIGN(gl_FragCoord.xy) * 6.2831853;
  float texel = 1.0 / size.x;
  float searchR = clamp(pf * 0.25, 3.0 * texel, 0.06);
  float bsum = 0.0, bn = 0.0;
  for (int i = 0; i < ${FILM ? 16 : 10}; i++) {
    float r = sqrt((float(i) + 0.5) / ${FILM ? '16.0' : '10.0'}); float a = float(i) * 2.3999632 + rot;
    vec2 o = vec2(cos(a), sin(a)) * r * searchR;
    float d = unpackRGBAToDepth(texture2D(sm, sc.xy + o));
    if (d < sc.z) { bsum += d; bn += 1.0; }
  }
  if (bn < 0.5) return 1.0;
  float pen = clamp((sc.z - bsum / bn) * pf, 1.2 * texel, searchR);
  float s = 0.0;
  for (int i = 0; i < ${FILM ? 24 : HI ? 14 : 8}; i++) {
    float r = sqrt((float(i) + 0.5) / ${FILM ? '24.0' : HI ? '14.0' : '8.0'}); float a = float(i) * 2.3999632 + rot * 1.7;
    vec2 o = vec2(cos(a), sin(a)) * r * pen;
    s += step(sc.z, unpackRGBAToDepth(texture2D(sm, sc.xy + o)));
  }
  return s / ${FILM ? '24.0' : HI ? '14.0' : '8.0'};
}
float getShadow( sampler2D shadowMap, vec2 shadowMapSize`;
  C.shadowmap_pars_fragment = C.shadowmap_pars_fragment
    .replace('float getShadow( sampler2D shadowMap, vec2 shadowMapSize', fn)
    .replace('#if defined( SHADOWMAP_TYPE_PCF )\n', '#if defined( SHADOWMAP_TYPE_PCF )\n\t\t\treturn kPCSS( shadowMap, shadowMapSize, shadowRadius, shadowCoord );\n');
})();

/* ------------------------------------------------------------------ helpers ---------- */
const U = {};
U.lin = hex => new THREE.Color(hex).convertSRGBToLinear();
U.FILM = FILM; U.MOBILE = MOBILE; U.TIER = TIER; U.HI = HI;
U.ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
U.smooth = x => x * x * (3 - 2 * x);
/* seeded random */
U.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
/* handheld camera: sum of incommensurate sines (deterministic) */
U.handheld = (t, a) => {
  const s = (f, p) => Math.sin(t * f + p);
  return {
    x: a * (.55 * s(.37, 1.3) + .3 * s(.83, .2) + .15 * s(1.91, 2.1)),
    y: a * (.5 * s(.29, .7) + .35 * s(.97, 1.9) + .15 * s(2.3, .4)),
    rz: a * .9 * (.6 * s(.23, 2.2) + .4 * s(.71, .9)),
  };
};

const loaders = {};
U.gltf = url => {
  if (!loaders.g) { loaders.g = new THREE.GLTFLoader(); if (window.MeshoptDecoder) loaders.g.setMeshoptDecoder(window.MeshoptDecoder); }
  return new Promise((res, rej) => loaders.g.load(url, res, undefined, rej));
};
U.hdr = (url) => new Promise((res, rej) => new THREE.RGBELoader().setDataType(THREE.HalfFloatType).load(url, res, undefined, rej));
U.tex = (renderer, url, o) => new Promise(res => new THREE.TextureLoader().load(url, t => {
  o = o || {};
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (o.srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
  res(t);
}, undefined, () => res(null)));

/* fit a model to a height, base on y=0, centred in x/z; returns a wrapper group */
U.fit = (obj, h, yawDeg) => {
  const g = new THREE.Group(), inner = new THREE.Group();
  inner.add(obj); g.add(inner);
  if (yawDeg) obj.rotation.y = yawDeg * Math.PI / 180;
  obj.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(obj), s = new THREE.Vector3(); b.getSize(s);
  inner.scale.setScalar(h / s.y); inner.updateMatrixWorld(true);
  b = new THREE.Box3().setFromObject(inner); const c = new THREE.Vector3(); b.getCenter(c);
  inner.position.set(-c.x, -b.min.y, -c.z);
  b.getSize(s); g.userData.size = s.clone();
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
};

/* soft contact shadow + tight ambient occlusion under a round footprint (baked, not real-time) */
U.contactShadow = (radius, strength, opts) => {
  opts = opts || {};
  const size = radius * (opts.spread || 5);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { r: { value: radius }, k: { value: strength }, size: { value: size }, sq: { value: opts.square ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float r, k, size, sq;
      void main(){
        vec2 p = (vUv - .5) * size;
        float d = sq > .5 ? max(abs(p.x), abs(p.y)) : length(p);
        float core = 1. - smoothstep(r * .55, r * 1.04, d);
        float ring = exp(-max(d - r * .96, 0.) / (r * .07)) * step(r * .7, d);
        float soft = exp(-max(d - r, 0.) / (r * .55));
        float a = clamp(core * .55 + ring * .55 + soft * .35, 0., 1.) * k;
        gl_FragColor = vec4(0., 0., 0., a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .0004; mesh.renderOrder = 1;
  return mesh;
};

/* soft round sprite texture (for particles / bokeh) */
U.discTexture = (hard) => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (hard) { gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(.78, 'rgba(255,255,255,.9)'); gr.addColorStop(.9, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
};

/* lit particles: drift is a pure function of time; brightness = in the key light's shadow map (god-ray dust) */
U.particles = (opts) => {
  const n = opts.count, rnd = U.rng(opts.seed || 1);
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd(); pos[i * 3 + 1] = rnd(); pos[i * 3 + 2] = rnd();
    seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      t: { value: 0 }, boxMin: { value: opts.min }, boxSize: { value: opts.size }, wind: { value: opts.wind || new THREE.Vector3() },
      wander: { value: opts.wander || .02 }, sizePx: { value: opts.sizePx || 2 }, color: { value: opts.color || new THREE.Color(1, 1, 1) },
      amb: { value: opts.ambient != null ? opts.ambient : .05 }, map: { value: U.discTexture() },
      shadowMap: { value: null }, shadowMatrix: { value: new THREE.Matrix4() }, useShadow: { value: 0 }, outside: { value: 1 },
      focus: { value: 2 }, aperture: { value: opts.aperture != null ? opts.aperture : 1 }, pr: { value: 1 }, gain: { value: opts.gain || 1 },
      lightDir: { value: opts.lightDir || new THREE.Vector3(0, 1, 0) }, phaseG: { value: opts.phaseG != null ? opts.phaseG : .5 },
    },
    vertexShader: `
      #include <packing>
      attribute vec4 seed; uniform float t, wander, sizePx, focus, aperture, pr, useShadow, outside, phaseG, amb;
      uniform vec3 boxMin, boxSize, wind, lightDir; uniform sampler2D shadowMap; uniform mat4 shadowMatrix;
      varying float vA;
      void main(){
        vec3 p = position;
        p += wind * t / boxSize;                                          // advect, wrap in the box
        p += wander * vec3(sin(t * (.21 + seed.x * .3) + seed.y * 6.3), sin(t * (.17 + seed.z * .25) + seed.w * 6.3), sin(t * (.19 + seed.y * .2) + seed.x * 6.3)) / boxSize;
        p = fract(p);
        float edge = smoothstep(0., .08, p.x) * smoothstep(1., .92, p.x) * smoothstep(0., .08, p.z) * smoothstep(1., .92, p.z) * smoothstep(1., .9, p.y);
        vec3 w = boxMin + p * boxSize;
        vec4 mv = viewMatrix * vec4(w, 1.);
        gl_Position = projectionMatrix * mv;
        float lit = 1.;
        if (useShadow > .5) {
          vec4 sc = shadowMatrix * vec4(w, 1.); sc.xyz /= sc.w;
          if (sc.x < 0. || sc.x > 1. || sc.y < 0. || sc.y > 1. || sc.z > 1.) lit = outside;
          else lit = step(sc.z - .002, unpackRGBAToDepth(texture2D(shadowMap, sc.xy)));
        }
        vec3 V = normalize(cameraPosition - w);
        float c = dot(normalize(lightDir), -V);                           // forward scattering toward the camera
        float g = phaseG; float ph = (1. - g * g) / pow(1. + g * g - 2. * g * c, 1.5) * .25;
        float dist = -mv.z;
        float coc = aperture * abs(dist - focus) / dist;                  // out of focus -> bigger, dimmer disc
        float s = sizePx * (.5 + seed.w) * pr * (1. + coc * 18.) * (1.6 / max(dist, .2));
        gl_PointSize = clamp(s, 1., 22. * pr);
        vA = edge * (lit * ph * 4. + amb) * (.4 + .6 * seed.z) / (1. + coc * coc * 120.);
      }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float gain; varying float vA;
      void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(color * a * vA * gain, 1.); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.layers.set(1);
  pts.userData.bind = (light) => {
    m.uniforms.useShadow.value = 1;
    pts.onBeforeRender = () => { if (light.shadow.map) { m.uniforms.shadowMap.value = light.shadow.map.texture; m.uniforms.shadowMatrix.value.copy(light.shadow.matrix); } };
  };
  return pts;
};

/* tint an equirect HDR in place (HalfFloat data), e.g. to neutralise a blue window sky */
U.tintHDR = (tex, k, clampMax, sat) => {
  const d = tex.image.data, M = clampMax || 1e9, S = sat == null ? 1 : sat, st = d.length / (tex.image.width * tex.image.height);
  for (let i = 0; i < d.length; i += st) {
    let r = U.half(d[i]) * k[0], g = U.half(d[i + 1]) * k[1], b = U.half(d[i + 2]) * k[2];
    const L = .2126 * r + .7152 * g + .0722 * b; r = L + (r - L) * S; g = L + (g - L) * S; b = L + (b - L) * S;
    const l = Math.max(r, g, b), s = l > M ? M / l : 1;
    d[i] = THREE.DataUtils.toHalfFloat(r * s); d[i + 1] = THREE.DataUtils.toHalfFloat(g * s); d[i + 2] = THREE.DataUtils.toHalfFloat(b * s);
  }
  tex.needsUpdate = true; return tex;
};
/* rotate an equirect HDR about the vertical axis so its brightest spot points along azimuth of dir */
U.aimHDR = (tex, dir) => {
  const { width: w, height: h, data } = tex.image;
  const b = U.brightestDir(tex);
  const uB = Math.atan2(b.z, b.x) / (Math.PI * 2) + .5, uT = Math.atan2(dir.z, dir.x) / (Math.PI * 2) + .5;
  const sh = Math.round((uT - uB) * w), st = data.length / (w * h);
  const row = new Uint16Array(w * st);
  for (let y = 0; y < h; y++) {
    const o = y * w * st; row.set(data.subarray(o, o + w * st));
    for (let x = 0; x < w; x++) { const nx = ((x + sh) % w + w) % w; for (let c = 0; c < st; c++) data[o + nx * st + c] = row[x * st + c]; }
  }
  tex.needsUpdate = true; return b;
};
/* half-float decode (r128 has no DataUtils.fromHalfFloat) */
U.half = h => { const s = (h & 0x8000) >> 15, e = (h & 0x7C00) >> 10, f = h & 0x03FF; if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024); if (e === 0x1F) return f ? NaN : (s ? -1 : 1) * Infinity; return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024); };
/* brightest direction of an equirect HDR (to aim the sun where the sky glows) */
U.brightestDir = (tex) => {
  const { width: w, height: h, data } = tex.image; let best = -1, bi = 0; const st = data.length / (w * h);
  for (let y = 0; y < h / 2; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * st; const l = U.half(data[i]) + U.half(data[i + 1]) + U.half(data[i + 2]);
    if (l > best) { best = l; bi = y * w + x; }
  }
  const u = (bi % w) / w, v = Math.floor(bi / w) / h;
  const phi = u * Math.PI * 2, th = v * Math.PI;
  // three equirect convention: dir = (-cos(phi)... ) match equirectUv: u = atan(dir.z, dir.x) / (2pi) + .5
  const a = (u - .5) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * Math.sin(th), Math.cos(th), Math.sin(a) * Math.sin(th));
};

/* planar blurred reflection for a horizontal floor at y = 0 (R2 / R4) */
U.PlanarReflection = function (renderer, opts) {
  opts = Object.assign({ scale: .5, blur: 3 }, opts);
  const type = THREE.HalfFloatType;
  const rtA = new THREE.WebGLRenderTarget(2, 2, { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const rtB = rtA.clone(), rtC = rtA.clone();
  const cam = new THREE.PerspectiveCamera();
  const texMat = new THREE.Matrix4();
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tex, vUv) * .227;
        c += (texture2D(tex, vUv + dir * 1.385) + texture2D(tex, vUv - dir * 1.385)) * .316;
        c += (texture2D(tex, vUv + dir * 3.231) + texture2D(tex, vUv - dir * 3.231)) * .070;
        gl_FragColor = c; }`,
  }));
  const qs = new THREE.Scene(); qs.add(q); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();
  const self = {
    sharp: rtA.texture, blurred: rtC.texture, texMat, hide: [],
    render(scene, camera) {
      renderer.getDrawingBufferSize(size);
      const w = Math.max(2, Math.round(size.x * opts.scale)), h = Math.max(2, Math.round(size.y * opts.scale));
      if (rtA.width !== w || rtA.height !== h) { rtA.setSize(w, h); rtB.setSize(w, h); rtC.setSize(w, h); }
      cam.copy(camera);
      const p = camera.position.clone(); p.y = -p.y;
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = -dir.y;
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); up.y = -up.y;
      cam.position.copy(p); cam.up.copy(up); cam.lookAt(p.clone().add(dir)); cam.updateMatrixWorld(); cam.projectionMatrix.copy(camera.projectionMatrix);
      cam.layers.mask = camera.layers.mask;
      texMat.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
      texMat.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      self.hide.forEach(o => { o.userData._v = o.visible; o.visible = false; });
      const old = renderer.getRenderTarget();
      renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(scene, cam);
      self.hide.forEach(o => { o.visible = o.userData._v; });
      for (let i = 0; i < opts.blur; i++) {
        const k = 1 + i * 1.5;
        q.material.uniforms.tex.value = i === 0 ? rtA.texture : rtC.texture; q.material.uniforms.dir.value.set(k / w, 0);
        renderer.setRenderTarget(rtB); renderer.render(qs, qc);
        q.material.uniforms.tex.value = rtB.texture; q.material.uniforms.dir.value.set(0, k / h);
        renderer.setRenderTarget(rtC); renderer.render(qs, qc);
      }
      renderer.setRenderTarget(old);
    },
  };
  /* add the reflection to a standard floor material; roughness map steers sharp vs blurred */
  self.patch = (mat, strength) => {
    const u = { kRefA: { value: rtA.texture }, kRefB: { value: rtC.texture }, kTexMat: { value: texMat }, kRefK: { value: strength } };
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'uniform mat4 kTexMat; varying vec4 vRefUv;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vRefUv = kTexMat * modelMatrix * vec4(transformed, 1.);');
      sh.fragmentShader = 'uniform sampler2D kRefA, kRefB; uniform float kRefK; varying vec4 vRefUv;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `
        {
          vec2 ruv = vRefUv.xy / vRefUv.w + normal.xz * .015;
          vec3 ra = texture2D(kRefA, ruv).rgb, rb = texture2D(kRefB, ruv).rgb;
          float rr = clamp((roughnessFactor - .15) * 2.2, 0., 1.);
          vec3 rc = mix(ra, rb, rr);
          float NdV = clamp(dot(normal, normalize(vViewPosition)), 0., 1.);
          float fr = .04 + .96 * pow(1. - NdV, 5.);
          outgoingLight += rc * kRefK * mix(fr, 1., .25) * (1. - rr * .6);
        }
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );`);
    };
    return u;
  };
  return self;
};

/* ------------------------------------------------------------------ shaders ---------- */
const VQ = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const NOISE3 = `
float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
/* raymarched atmosphere: output rgb = in-scattered light, a = transmittance */
const AtmosShader = (steps) => ({
  uniforms: {
    tDepth: { value: null }, near: { value: .1 }, far: { value: 100 }, projInv: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
    shadowMap: { value: null }, shadowMatrix: { value: new THREE.Matrix4() }, useShadow: { value: 0 }, outside: { value: 1 },
    isSpot: { value: 0 }, lightPos: { value: new THREE.Vector3() }, lightDir: { value: new THREE.Vector3(0, 1, 0) }, spotDir: { value: new THREE.Vector3(0, -1, 0) },
    spotCos: { value: .9 }, spotPen: { value: .1 },
    lightCol: { value: new THREE.Color(1, 1, 1) }, ambCol: { value: new THREE.Color(.1, .1, .1) }, horizonCol: { value: new THREE.Color(0, 0, 0) },
    density: { value: .02 }, heightFall: { value: .5 }, baseY: { value: 0 }, noiseScale: { value: .5 }, noiseAmt: { value: .6 },
    wind: { value: new THREE.Vector3(.1, 0, 0) }, time: { value: 0 }, maxDist: { value: 30 }, phaseG: { value: .6 }, stepPow: { value: 1 },
    extinction: { value: 1 }, skyFog: { value: 1 }, frame: { value: 0 },
  },
  vertexShader: VQ,
  fragmentShader: `
    #include <packing>
    varying vec2 vUv;
    uniform sampler2D tDepth, shadowMap; uniform float near, far, useShadow, outside, isSpot, spotCos, spotPen, density, heightFall, baseY, noiseScale, noiseAmt, time, maxDist, phaseG, stepPow, extinction, skyFog, frame;
    uniform mat4 projInv, camWorld, shadowMatrix; uniform vec3 lightPos, lightDir, spotDir, lightCol, ambCol, wind, horizonCol;
    ${NOISE3}
    float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
    void main(){
      float d = unpackRGBAToDepth(texture2D(tDepth, vUv));
      bool sky = d > .99997;
      vec4 v = projInv * vec4(vUv * 2. - 1., (sky ? .5 : d) * 2. - 1., 1.); v /= v.w;
      vec3 ro = (camWorld * vec4(0., 0., 0., 1.)).xyz;
      vec3 wp = (camWorld * v).xyz;
      vec3 rd = normalize(wp - ro);
      float dist = sky ? maxDist : min(length(wp - ro), maxDist);
      float j = fract(ign(gl_FragCoord.xy) + frame * .618034);
      vec3 ins = vec3(0.); float T = 1.;
      float prev = 0.;
      float cth = dot(rd, isSpot > .5 ? -spotDir : lightDir);
      float g = phaseG; float ph = (1. - g * g) / pow(1. + g * g - 2. * g * cth, 1.5) * .0795775;
      for (int i = 0; i < ${steps}; i++) {
        float f = (float(i) + j) / float(${steps});
        float tt = dist * pow(f, stepPow);
        float dt = tt - prev; prev = tt;
        vec3 p = ro + rd * tt;
        float dens = density * exp(-max(p.y - baseY, 0.) * heightFall);
        dens *= max(0., 1. - noiseAmt + noiseAmt * 2. * (vn3(p * noiseScale + wind * time) * .65 + vn3(p * noiseScale * 2.7 - wind * time * 1.6) * .35));
        float lit = 1.;
        if (useShadow > .5) {
          vec4 sc = shadowMatrix * vec4(p, 1.); sc.xyz /= sc.w;
          if (sc.x < 0. || sc.x > 1. || sc.y < 0. || sc.y > 1. || sc.z > 1. || sc.z < 0.) lit = outside;
          else lit = step(sc.z - .0015, unpackRGBAToDepth(texture2D(shadowMap, sc.xy)));
        }
        vec3 L = lightCol * ph;
        if (isSpot > .5) {
          vec3 tl = p - lightPos; float dl = length(tl);
          float c = dot(tl / dl, spotDir);
          float cone = smoothstep(spotCos, spotCos + spotPen, c);
          float pph = (1. - g * g) / pow(1. + g * g - 2. * g * dot(rd, -tl / dl), 1.5) * .0795775;
          L = lightCol * pph * cone / (1. + dl * dl * .08);
        }
        vec3 S = (L * lit + ambCol) * dens;
        float e = exp(-dens * extinction * dt);
        ins += T * S * (1. - e) / max(dens * extinction, 1e-5);
        T *= e;
      }
      if (sky) { T = mix(1., T, skyFog); ins *= skyFog; }
      gl_FragColor = vec4(ins, T);
    }`,
});
const ComposeShader = {
  uniforms: { tScene: { value: null }, tAtmos: { value: null } },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tScene, tAtmos; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tScene, vUv).rgb; vec4 a = texture2D(tAtmos, vUv); gl_FragColor = vec4(c * a.a + a.rgb, 1.); }`,
};
/* depth of field: half-res scatter-as-gather (Gustafsson), then mixed with the sharp image by circle of confusion */
const DofGather = {
  uniforms: { tColor: { value: null }, tDepth: { value: null }, near: { value: .1 }, far: { value: 100 }, focus: { value: 2 }, range: { value: .08 }, aperture: { value: 1 }, maxBlur: { value: 14 }, px: { value: new THREE.Vector2() } },
  vertexShader: VQ,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tColor, tDepth; uniform float near, far, focus, range, aperture, maxBlur; uniform vec2 px; varying vec2 vUv;
    float lz(vec2 uv){ float d = unpackRGBAToDepth(texture2D(tDepth, uv)); return -perspectiveDepthToViewZ(min(d, .99999), near, far); }
    float coc(float z){ return clamp(aperture * max(abs(z - focus) - range, 0.) / z, 0., 1.) * maxBlur; }
    void main(){
      float zc = lz(vUv); float cc = coc(zc);
      vec3 col = texture2D(tColor, vUv).rgb; float tot = 1.;
      float r = .6;
      float a0 = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * 6.2831853;
      for (int i = 0; i < 260; i++) {
        if (r >= maxBlur) break;
        float a = float(i) * 2.3999632 + a0;
        vec2 tc = vUv + vec2(cos(a), sin(a)) * px * r;
        vec3 sc = texture2D(tColor, tc).rgb; float zs = lz(tc); float cs = coc(zs);
        if (zs > zc) cs = clamp(cs, 0., cc * 2.);
        float m = smoothstep(r - .5, r + .5, cs);
        col += mix(col / tot, sc, m); tot += 1.;
        r += .8 / r;
      }
      gl_FragColor = vec4(col / tot, cc / maxBlur);
    }`,
};
const DofMix = {
  uniforms: { tDiffuse: { value: null }, tBlur: { value: null } },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tDiffuse, tBlur; varying vec2 vUv;
    void main(){ vec3 s = texture2D(tDiffuse, vUv).rgb; vec4 b = texture2D(tBlur, vUv); gl_FragColor = vec4(mix(s, b.rgb, smoothstep(.1, .35, b.a)), 1.); }`,
};
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, exposure: { value: 1 }, grain: { value: .05 }, vignette: { value: .35 }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, ca: { value: .0015 }, lift: { value: new THREE.Color(0, 0, 0) }, sat: { value: 1 }, tint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: VQ,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float exposure, grain, vignette, time, ca, sat; uniform vec2 res; uniform vec3 lift, tint; varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + .0245786) - .000090537; vec3 b = v * (.983729 * v + .4329510) + .238081; return a / b; }
    vec3 aces(vec3 c){
      const mat3 I = mat3(vec3(.59719, .07600, .02840), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777));
      const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
      c *= exposure / .6; c = I * c; c = RRTAndODTFit(c); c = O * c; return clamp(c, 0., 1.);
    }
    float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 d = vUv - .5;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv - d * ca).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv + d * ca).b;
      c *= tint;
      c = aces(c);
      float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, sat);
      c = c + lift * (1. - c);
      c = pow(c, vec3(1. / 2.2));
      float v = smoothstep(.95, .2, length(d * vec2(res.x / res.y, 1.) * .85));
      c *= mix(1., v, vignette);
      float n = h(vUv * res + fract(time * 7.13) * 500.) + h(vUv * res * 1.31 - fract(time * 3.7) * 300.) - 1.;
      c += n * grain * (1. - l * .6);
      gl_FragColor = vec4(c, 1.);
    }`,
};

/* ------------------------------------------------------------------ Stage ---------- */
class Stage {
  constructor(canvas, opts) {
    this.opts = opts = Object.assign({ steps: HI ? 30 : 14, dof: HI && !MOBILE, msaa: HI ? 4 : 0, atmosScale: .5, dofScale: .5, maxDpr: 2, bloom: [.22, .55, 1.1], blurPx: 10 }, opts);
    if (FILM) { opts.msaa = 8; opts.dof = true; opts.steps = Math.max(opts.steps, 56); opts.blurPx = 16; }
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: FILM, stencil: false });
    r.outputEncoding = THREE.LinearEncoding; r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.shadowMap.autoUpdate = false;
    r.setClearColor(0x000000, 1);
    this.webgl2 = r.capabilities.isWebGL2;
    this.dpr = FILM ? (+Q.get('ss') || 1) : Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : (+Q.get('dpr') || opts.maxDpr));
    this.maxDpr = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : opts.maxDpr);
    const rtOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    this.sceneRT = (this.webgl2 && opts.msaa) ? new THREE.WebGLMultisampleRenderTarget(2, 2, rtOpt) : new THREE.WebGLRenderTarget(2, 2, rtOpt);
    if (this.sceneRT.samples !== undefined) this.sceneRT.samples = opts.msaa;
    this.depthRT = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.atmosRT = new THREE.WebGLRenderTarget(2, 2, rtOpt);
    this.dofRT = new THREE.WebGLRenderTarget(2, 2, rtOpt);
    this.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    this.quadScene = new THREE.Scene(); this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false; this.quadScene.add(this.quad);
    this.atmos = new THREE.ShaderMaterial(Object.assign(AtmosShader(opts.steps), { depthTest: false, depthWrite: false }));
    this.dofMat = new THREE.ShaderMaterial(Object.assign({}, DofGather, { uniforms: THREE.UniformsUtils.clone(DofGather.uniforms), depthTest: false, depthWrite: false }));
    this.composer = new THREE.EffectComposer(r, new THREE.WebGLRenderTarget(2, 2, rtOpt));
    this.compose = new THREE.ShaderPass(ComposeShader); this.compose.textureID = null;
    this.compose.uniforms.tScene.value = this.sceneRT.texture; this.compose.uniforms.tAtmos.value = this.atmosRT.texture;
    this.composer.addPass(this.compose);
    if (opts.dof) { this.dofMix = new THREE.ShaderPass(DofMix); this.dofMix.uniforms.tBlur.value = this.dofRT.texture; this.composer.addPass(this.dofMix); }
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom[0], opts.bloom[1], opts.bloom[2]);
    [this.bloom.renderTargetBright].concat(this.bloom.renderTargetsHorizontal, this.bloom.renderTargetsVertical).forEach(t => { t.texture.type = THREE.HalfFloatType; });
    this.composer.addPass(this.bloom);
    this.final = new THREE.ShaderPass(FinalShader); this.final.renderToScreen = true; this.composer.addPass(this.final);
    this.preRender = []; this.frame = 0;
    this.focus = 2; this.aperture = .6; this.focusRange = .08;
    this.hideInDepth = [];
  }
  setSize(w, h) {
    this.w = w; this.h = h;
    const r = this.renderer; r.setPixelRatio(this.dpr); r.setSize(w, h, !FILM);
    const W = Math.round(w * this.dpr), H = Math.round(h * this.dpr);
    this.sceneRT.setSize(W, H); this.depthRT.setSize(W, H);
    // keep the expensive half-res passes near a fixed pixel budget, whatever the DPR
    const hi = FILM ? 1 : Math.min(1, 1.15 / this.dpr);
    const as = this.opts.atmosScale * hi, ds = this.opts.dofScale * hi;
    this.atmosRT.setSize(Math.round(W * as), Math.round(H * as));
    this.dofRT.setSize(Math.round(W * ds), Math.round(H * ds));
    if (this.sceneRT.samples !== undefined && !FILM) this.sceneRT.samples = this.dpr > 1.6 && !this.opts.msaaAt2 ? 0 : this.opts.msaa;
    this.composer.setPixelRatio(this.dpr); this.composer.setSize(w, h);
    this.final.uniforms.res.value.set(W, H);
    this.dofMat.uniforms.px.value.set(1 / (W * ds), 1 / (H * ds));
    this.dofMat.uniforms.maxBlur.value = this.opts.blurPx * Math.max(.6, Math.min(1.4, H * ds / 540));
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  }
  /* key: { light, outside } for god rays from its shadow map */
  setKeyLight(light, outside) { this.key = light; this.keyOutside = outside != null ? outside : 1; }
  quadPass(mat, target) { this.quad.material = mat; this.renderer.setRenderTarget(target); this.renderer.render(this.quadScene, this.quadCam); }
  render(t) {
    const r = this.renderer, cam = this.camera, scene = this.scene;
    this.frame++;
    r.shadowMap.needsUpdate = !this.staticShadows || this.frame < 4;
    cam.updateMatrixWorld(); cam.layers.enable(1);
    this.preRender.forEach(f => f(t));
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(scene, cam);
    // depth pre-pass (opaque scene only: FX live on layer 1)
    cam.layers.disable(1);
    const bg = scene.background; scene.background = null; scene.overrideMaterial = this.depthMat;
    this.hideInDepth.forEach(o => { o.userData._v = o.visible; o.visible = false; });
    r.setClearColor(0xffffff, 1); r.setRenderTarget(this.depthRT); r.clear(); r.render(scene, cam);
    r.setClearColor(0x000000, 1);
    this.hideInDepth.forEach(o => { o.visible = o.userData._v; });
    scene.overrideMaterial = null; scene.background = bg; cam.layers.enable(1);
    // atmosphere
    const a = this.atmos.uniforms;
    a.tDepth.value = this.depthRT.texture; a.near.value = cam.near; a.far.value = cam.far;
    a.projInv.value.copy(cam.projectionMatrixInverse); a.camWorld.value.copy(cam.matrixWorld); a.time.value = t; a.frame.value = FILM ? Math.round(t * 30) : this.frame;
    const k = this.key;
    if (k && k.castShadow && k.shadow.map) {
      a.useShadow.value = 1; a.shadowMap.value = k.shadow.map.texture; a.shadowMatrix.value.copy(k.shadow.matrix); a.outside.value = this.keyOutside;
      if (k.isSpotLight) {
        a.isSpot.value = 1; a.lightPos.value.setFromMatrixPosition(k.matrixWorld);
        a.spotDir.value.setFromMatrixPosition(k.target.matrixWorld).sub(a.lightPos.value).normalize();
        a.spotCos.value = Math.cos(k.angle); a.spotPen.value = (1 - Math.cos(k.angle)) * k.penumbra;
      } else { a.isSpot.value = 0; a.lightDir.value.setFromMatrixPosition(k.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(k.target.matrixWorld)).normalize(); }
    } else a.useShadow.value = 0;
    this.quadPass(this.atmos, this.atmosRT);
    // depth of field (half res gather over the composed image) - needs the composed image, so compose first into dofRT source
    if (this.opts.dof) {
      const d = this.dofMat.uniforms;
      // compose into the composer's read buffer first
      this.compose.render(r, this.composer.readBuffer, null);
      d.tColor.value = this.composer.readBuffer.texture; d.tDepth.value = this.depthRT.texture; d.near.value = cam.near; d.far.value = cam.far;
      d.focus.value = this.focus; d.range.value = this.focusRange; d.aperture.value = this.aperture;
      this.quadPass(this.dofMat, this.dofRT);
    }
    this.final.uniforms.time.value = FILM ? t : t + this.frame * .37;
    r.setRenderTarget(null);
    this.composer.render();
  }
}

window.RICH = { Stage, U, THREE };
})();
