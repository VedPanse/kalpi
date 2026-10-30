import { recordDiagnostic } from "./telemetry.js";
import { withViewerFallback } from "./viewer-fallback.js";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { productModel, disposeObject } from "./geometry.js";
export const LIGHTS = {
  daylight: { color: 0xf8faff, intensity: 1.6, background: "#e8e6e1" },
  warm: { color: 0xffd8aa, intensity: 1.5, background: "#ddd2c3" },
  cool: { color: 0xdceaff, intensity: 1.6, background: "#d9dee4" },
};
export function createRenderer(el, { background = "#15141c", preserveShadows = false, transparent = false } = {}) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: transparent });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  el.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  const scene = new T.Scene();
  scene.background = transparent ? null : new T.Color(background);
  const camera = new T.PerspectiveCamera(40, 1, 0.001, 100);
  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  room.dispose();
  const key = new T.DirectionalLight(0xffffff, 3);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.normalBias = 0.002;
  scene.add(key, new T.HemisphereLight(0xffffff, 0x635848, 0.45));
  const ro = new ResizeObserver(() => {
    const { width, height } = el.getBoundingClientRect();
    renderer.setSize(width, Math.max(height, 1));
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  });
  ro.observe(el);
  let frame,
    disposed = false,
    last = performance.now(),
    slow = 0;
  function loop(t) {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    const elapsed = (t - last) / 1000;
    const dt = Math.min(elapsed, 0.1);
    last = t;
    if (elapsed > 0.035) slow += elapsed;
    else slow = Math.max(0, slow - elapsed);
    if (slow > 3) {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
      renderer.shadowMap.enabled = preserveShadows;
      renderer.transmissionResolutionScale = 0.5;
      recordDiagnostic("render.adaptive", { fps: Math.round(1 / elapsed) });
      key.shadow.mapSize.set(512, 512);
      slow = 0;
    }
    api.update?.(dt);
    renderer.render(scene, camera);
  }
  const api = {
    scene,
    camera,
    renderer,
    key,
    update: null,
    lighting(name) {
      const l = LIGHTS[name] || LIGHTS.daylight;
      key.color.setHex(l.color);
      key.intensity = l.intensity;
      scene.background?.set(l.background);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      disposeObject(scene);
      scene.environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
  frame = requestAnimationFrame(loop);
  return api;
}
function makeStudioViewer(
  el,
  documents,
  {
    lighting = "daylight",
    shelf = false,
    reveal = false,
    autoRotate = false,
    onSelect = () => {},
    artworkUrls = {},
    onCameraChange = () => {},
  } = {},
) {
  const r = createRenderer(el, {transparent:reveal});
  r.lighting(lighting);
  const group = new T.Group();
  r.scene.add(group);
  const products = [];
  let x = 0;
  for (const [index, doc] of documents.entries()) {
    const m = productModel(doc);
    m.position.x = x;
    m.userData.ready?.then(()=>{if(m.userData.disposed)return;el.dataset.modelLoaded="true";}).catch(e=>{el.dataset.modelError=e.message;const note=document.createElement("p");note.className="model-error";note.textContent="The detailed model could not load. Check your connection and reopen the design.";el.append(note);recordDiagnostic("asset.model",{error:e.message});});
    group.add(m);
    products.push(m);
    x += doc.dimensions.width + 0.05;
    if (doc.label.assetId && artworkUrls[doc.label.assetId])
      new T.TextureLoader().load(artworkUrls[doc.label.assetId], (tex) => {
        tex.colorSpace = T.SRGBColorSpace;
        Promise.resolve(m.userData.ready).then(()=>{if(m.userData.disposed){tex.dispose();return;}
        const label = m.getObjectByName("Label");
        if (label) {
          label.material.map?.dispose();
          label.material.map = tex;
          label.material.needsUpdate = true;
        }else tex.dispose();
        }).catch(()=>tex.dispose());
      });
  }
  let box = new T.Box3();
  let offset=0;for(const doc of documents){const d=doc.dimensions;box.expandByPoint(new T.Vector3(offset-d.width/2,0,-d.depth/2));box.expandByPoint(new T.Vector3(offset+d.width/2,d.height,d.depth/2));offset+=d.width+.05;}
  let
    center = box.getCenter(new T.Vector3()),
    size = box.getSize(new T.Vector3());
  group.position.x = -center.x;
  center.x = 0;
  const max = Math.max(size.x, size.y, size.z, 0.1),
    target = new T.Vector3(0, size.y / 2, 0);
  // Fit the shadow frustum to the product rather than a store-sized room.
  // At perfume scale the old 16 m frustum lost nearly all contact detail.
  r.key.position.set(max * 2, max * 3, max * 2);
  r.key.shadow.camera.left = -max * 1.6;
  r.key.shadow.camera.right = max * 1.6;
  r.key.shadow.camera.top = max * 1.6;
  r.key.shadow.camera.bottom = -max * 1.6;
  r.key.shadow.camera.near = max * .01;
  r.key.shadow.camera.far = max * 10;
  r.key.shadow.normalBias = max * .0005;
  r.key.shadow.camera.updateProjectionMatrix();
  r.key.shadow.mapSize.set(2048, 2048);
  r.scene.environmentIntensity = .8;
  const rim = new T.DirectionalLight(0xffffff, 1.5);
  rim.position.set(-max * 2, max * 1.8, -max * 2);
  r.scene.add(rim);
  r.camera.position.set(max * .85, max * .65, max * 1.45);
  const controls = new OrbitControls(r.camera, r.renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.autoRotate = autoRotate&&!matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.autoRotateSpeed=.65;
  controls.minDistance = max * 0.3;
  controls.maxDistance = max * 8;
  controls.addEventListener("change", () => onCameraChange({position:r.camera.position.toArray().map(v=>v/max),target:controls.target.toArray().map(v=>v/max)}));
  // Reveal the real mesh with a short camera dolly once its assets are ready.
  let revealStart=null, revealDisposed=false;
  const restingCamera=r.camera.position.clone();
  const motion=reveal&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cancelReveal=()=>{revealStart=null;controls.autoRotate=false;};
  controls.addEventListener('start',cancelReveal);
  if(motion)Promise.all(products.map(m=>m.userData.ready)).then(()=>{
    if(!revealDisposed)revealStart=performance.now();
  }).catch(()=>{});
  r.update = () => {
    if(revealStart!==null){
      const t=Math.min(1,(performance.now()-revealStart)/850),ease=1-Math.pow(1-t,4);
      r.camera.position.copy(restingCamera).sub(target).multiplyScalar(1+.35*(1-ease)).applyAxisAngle(new T.Vector3(0,1,0),-.22*(1-ease)).add(target);
      if(t===1)revealStart=null;
    }
    controls.update();
  };
  if (shelf) {
    const platform = new T.Mesh(
      new T.BoxGeometry(Math.max(x, 0.8), 0.025, 0.6),
      new T.MeshStandardMaterial({ color: "#8f6b4a", roughness: 0.6 }),
    );
    platform.position.y = -0.013;
    platform.receiveShadow = true;
    r.scene.add(platform);
  } else {
    const floor = new T.Mesh(
      new T.PlaneGeometry(max * 200, max * 200),
      reveal ? new T.ShadowMaterial({opacity:.12}) : new T.MeshStandardMaterial({ color: "#e1dfda", roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.003;
    floor.receiveShadow = true;
    r.scene.add(floor);
  }
  const measure = new T.Box3Helper(new T.Box3().setFromObject(group), 0x8d6fd1);
  measure.visible = false;
  r.scene.add(measure);
  const ray = new T.Raycaster();
  let down;
  const pointerDown = (e) => (down = { x: e.clientX, y: e.clientY });
  const pointerUp = (e) => {
    if (!down || Math.hypot(down.x - e.clientX, down.y - e.clientY) > 5) return;
    const rect = r.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      r.camera,
    );
    const hit = ray.intersectObjects(group.children, true)[0];
    if (hit) onSelect(hit.object.userData.editPart || hit.object.name);
  };
  r.renderer.domElement.addEventListener("pointerdown", pointerDown);
  r.renderer.domElement.addEventListener("pointerup", pointerUp);
  return {
    setAutoRotate(value){controls.autoRotate=value&&!matchMedia("(prefers-reduced-motion: reduce)").matches;},
    syncCamera(state) {r.camera.position.fromArray(state.position).multiplyScalar(max);controls.target.fromArray(state.target).multiplyScalar(max);controls.update();},
    setLighting: (n) => r.lighting(n),
    dimensions: (show) => (measure.visible = show),
    view(name) {
      controls.autoRotate=false;
      const p = {
        front: [0, 0.5, 2.5],
        side: [2.5, 0.5, 0],
        top: [0, 3, 0.001],
        bottom: [0, -3, 0.001],
      }[name];
      if (p) {
        if (name === "bottom")
          r.scene.children
            .filter((n) => n.isMesh && !group.children.includes(n))
            .forEach((n) => (n.visible = false));
        else
          r.scene.children
            .filter((n) => n.isMesh)
            .forEach((n) => (n.visible = true));
        r.camera.position.set(p[0] * max, p[1] * max, p[2] * max);
        controls.target.copy(target);
        controls.update();
      }
    },
    capture() {
      r.renderer.render(r.scene, r.camera);
      return r.renderer.domElement.toDataURL("image/jpeg", 0.7);
    },
    dispose() {
      revealDisposed=true;
      controls.removeEventListener("start",cancelReveal);
      controls.dispose();
      r.dispose();
    },
  };
}
export async function loadImported(url) {
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(url);
  gltf.scene.traverse((n) => {
    if (!n.isMesh) return;
    const part = (n.name || "").toLowerCase();
    n.userData.editPart = part.includes("glass")
      ? "Body"
      : /cap|collar/.test(part)
        ? "Cap"
        : n.name;
  });
  return gltf.scene;
}
export async function thumbnailProduct(p, artwork) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(400, 320);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  const scene = new T.Scene();
  scene.background = new T.Color("#e8e6e1");
  const model = productModel(p, { artwork: artwork?.clone() });
  await model.userData.ready;
  scene.add(model);
  const pmrem = new T.PMREMGenerator(renderer),
    env = new RoomEnvironment(),
    target = pmrem.fromScene(env, 0.04);
  scene.environment = target.texture;
  env.dispose();
  pmrem.dispose();
  const max = Math.max(...Object.values(p.dimensions)),
    camera = new T.PerspectiveCamera(35, 1.25, 0.001, 100);
  camera.position.set(max * 1.4, max * 0.9, max * 2.2);
  camera.lookAt(0, p.dimensions.height / 2, 0);
  const key = new T.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 4);
  scene.add(key, new T.HemisphereLight(0xffffff, 0x635848, 0.45));
  renderer.render(scene, camera);
  const data = renderer.domElement.toDataURL("image/jpeg", 0.85);
  disposeObject(scene);
  target.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return Uint8Array.from(atob(data.split(",")[1]), (c) => c.charCodeAt(0));
}

export function studioViewer(el, documents, options) {
  return withViewerFallback(el, () => makeStudioViewer(el, documents, options));
}
