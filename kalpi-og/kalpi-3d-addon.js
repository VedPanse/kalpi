// Kalpi: "Make it 3D" for the product picture in the Studio, with real product dimensions.
// Sends the picture to the local fal helper (label-to-shelf/server/fal_helper.py on :8795),
// shows the 3D model, lets you set W × H × D in mm, draws dimension lines, and downloads a GLB.
import * as THREE from "https://esm.sh/three@0.170.0";
import { OrbitControls } from "https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "https://esm.sh/three@0.170.0/examples/jsm/environments/RoomEnvironment.js";

const HELPER = "http://localhost:8795";
const MM = 0.001;

const css = `
#k3d-btn{position:fixed;right:96px;bottom:28px;z-index:2147483600;font:600 15px Inter,system-ui,sans-serif;padding:12px 18px;border-radius:999px;border:0;cursor:pointer;color:#0b0b10;background:#b4aaff;box-shadow:0 8px 30px rgba(180,170,255,.35)}
#k3d{position:fixed;inset:0;z-index:2147483647;display:none;background:rgba(8,8,12,.72);backdrop-filter:blur(6px)}
#k3d.on{display:grid;place-items:center}
#k3d .box{width:min(1100px,calc(100% - 32px));height:min(720px,calc(100% - 32px));display:grid;grid-template-columns:1fr 300px;background:#14131b;border:1px solid #2a2935;border-radius:18px;overflow:hidden;color:#f4f3f7;font:14px Inter,system-ui,sans-serif}
#k3d .view{position:relative;background:#f4f2ee}
#k3d canvas{display:block;width:100%;height:100%}
#k3d .side{padding:18px;display:flex;flex-direction:column;gap:12px;overflow:auto}
#k3d h3{margin:0;font-size:18px}
#k3d .mut{color:#a09eab;font-size:13px}
#k3d .grid{display:grid;grid-template-columns:auto 1fr;gap:8px 10px;align-items:center}
#k3d input[type=number]{width:100%;font:inherit;padding:7px 9px;border-radius:8px;border:1px solid #2a2935;background:#0b0b10;color:#fff}
#k3d select{font:inherit;padding:7px 9px;border-radius:8px;border:1px solid #2a2935;background:#0b0b10;color:#fff}
#k3d button{font:600 14px Inter,system-ui,sans-serif;padding:9px 12px;border-radius:10px;border:1px solid #2a2935;background:#1d1c26;color:#fff;cursor:pointer}
#k3d button.main{background:#b4aaff;color:#0b0b10;border-color:#b4aaff}
#k3d .x{position:absolute;right:12px;top:10px;background:rgba(0,0,0,.55);border:0;color:#fff;border-radius:50%;width:32px;height:32px;padding:0}
#k3d .src{width:100%;height:130px;object-fit:contain;border-radius:10px;background:#fff}
#k3d .size{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#k3d .size label{display:flex;flex-direction:column;gap:4px;color:#a09eab;font-size:12px}
#k3d .pics{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
#k3d .pics img{width:64px;height:64px;flex:none;object-fit:contain;background:#fff;border-radius:8px;border:2px solid transparent;cursor:pointer}
#k3d .pics img.on{border-color:#b4aaff}
#k3d .status{position:absolute;left:14px;bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(20,19,27,.85);color:#fff;font-size:13px}
@media(max-width:760px){#k3d .box{grid-template-columns:1fr;grid-template-rows:55% 45%}}
`;
document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }));

const btn = Object.assign(document.createElement("button"), { id: "k3d-btn", type: "button", textContent: "✨ Make it 3D" });
document.body.appendChild(btn);
const wrap = document.createElement("div"); wrap.id = "k3d";
wrap.innerHTML = `<div class="box">
  <div class="view"><canvas></canvas><button class="x" type="button" aria-label="Close">✕</button><div class="status">Pick a size, then Make it 3D.</div></div>
  <div class="side">
    <h3>Make it 3D</h3>
    <img class="src" alt="Your design">
    <div class="pics"></div>
    <button class="main" id="k3dGo" type="button">✨ Make it 3D</button>
    <div class="mut">Real size in mm</div>
    <div class="size"><label>H<input id="k3dH" type="number" min="1" value="250"></label><label>W<input id="k3dW" type="number" min="1" placeholder="auto"></label><label>D<input id="k3dD" type="number" min="1" placeholder="auto"></label></div>
    <button id="k3dGlb" type="button" hidden>Download 3D file</button>
    <div class="mut" id="k3dInfo"></div>
    <div hidden><select id="k3dModel"><option value="trellis">t</option><option value="tripo">p</option></select><input id="k3dLock" type="checkbox" checked><input id="k3dDims" type="checkbox" checked><input id="k3dSpin" type="checkbox" checked><button id="k3dApply" type="button"></button></div>
  </div></div>`;
document.body.appendChild(wrap);
const $ = (s) => wrap.querySelector(s);

// three.js view
const canvas = $("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color("#f4f2ee");
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 3, 2); scene.add(key);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.15 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const camera = new THREE.PerspectiveCamera(32, 1, 0.001, 100);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.autoRotateSpeed = 2.5;
const holder = new THREE.Group(); scene.add(holder);
const dims = new THREE.Group(); scene.add(dims);
let model = null, natural = null, lastGlb = null;

function fit() {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener("resize", fit);
renderer.setAnimationLoop(() => { controls.autoRotate = $("#k3dSpin").checked; controls.update(); renderer.render(scene, camera); });

function frame() {
  const b = new THREE.Box3().setFromObject(holder).union(new THREE.Box3().setFromObject(dims));
  if (b.isEmpty()) return;
  const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const d = Math.max(s.y / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), s.x / 2 / Math.tan(Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect))) * 1.25 + s.z / 2;
  controls.target.copy(c); camera.position.set(c.x + d * 0.35, c.y + d * 0.2, c.z + d); controls.update();
  floor.scale.setScalar(Math.max(s.x, s.z) * 1.2);
}

function tag(text, size) {
  const c = document.createElement("canvas"); c.width = 280; c.height = 76;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(22,23,27,.9)"; x.beginPath(); x.roundRect(4, 8, 272, 60, 16); x.fill();
  x.fillStyle = "#fff"; x.font = "600 36px Inter, system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 140, 39);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sp.scale.set(size * 0.34, size * 0.092, 1); sp.renderOrder = 20; return sp;
}
function line(a, b, text, size) {
  const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: 0x5b4fd6, depthTest: false });
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), m); l.renderOrder = 19; g.add(l);
  const t = tag(text, size); t.position.copy(a.clone().add(b).multiplyScalar(0.5)); g.add(t); return g;
}
function drawDims() {
  dims.clear();
  if (!model || !$("#k3dDims").checked) return;
  const b = new THREE.Box3().setFromObject(holder), s = b.getSize(new THREE.Vector3()), big = Math.max(s.x, s.y, s.z), o = big * 0.08;
  const mm = (v) => Math.round(v / MM) + " mm", { min, max } = b;
  dims.add(line(new THREE.Vector3(min.x, min.y, max.z + o), new THREE.Vector3(max.x, min.y, max.z + o), "W " + mm(s.x), big));
  dims.add(line(new THREE.Vector3(max.x + o, min.y, max.z), new THREE.Vector3(max.x + o, max.y, max.z), "H " + mm(s.y), big));
  dims.add(line(new THREE.Vector3(max.x + o, min.y, min.z), new THREE.Vector3(max.x + o, min.y, max.z), "D " + mm(s.z), big));
  $("#k3dInfo").textContent = `Prototype size: ${mm(s.x)} wide × ${mm(s.y)} tall × ${mm(s.z)} deep.`;
}
function applySize() {
  if (!model) return;
  const H = +$("#k3dH").value, W = +$("#k3dW").value, D = +$("#k3dD").value;
  let k = natural.y ? (H > 0 ? (H * MM) / natural.y : 1) : 1;
  const sx = $("#k3dLock").checked || !(W > 0) ? k : (W * MM) / natural.x;
  const sz = $("#k3dLock").checked || !(D > 0) ? k : (D * MM) / natural.z;
  model.scale.set(sx, k, sz);
  const b = new THREE.Box3().setFromObject(model), c = b.getCenter(new THREE.Vector3());
  model.position.x -= c.x; model.position.z -= c.z; model.position.y -= b.min.y;
  if ($("#k3dLock").checked) { const s = b.getSize(new THREE.Vector3()); $("#k3dW").value = Math.round(s.x / MM); $("#k3dD").value = Math.round(s.z / MM); }
  drawDims(); frame();
}

let pickedImg = null;
const usable = (i) => i && i.complete && i.naturalWidth > 60 && !wrap.contains(i);
// remember the product picture the person last clicked (a sample card, a version, the viewer)
function onPick(e) {
  if (wrap.contains(e.target) || e.target === btn) return;
  let el = e.target, img = null;
  for (let n = 0; el && n < 6 && !img; n++, el = el.parentElement) img = el.tagName === "IMG" ? el : el.querySelector && el.querySelector("img");
  if (usable(img)) pickedImg = img;
}
document.addEventListener("click", onPick, true);
const frameDocs = () => [...document.querySelectorAll("iframe")].map((f) => { try { return f.contentDocument; } catch { return null; } }).filter(Boolean);
const hooked = new WeakSet();
function hookDocs() {
  for (const d of frameDocs()) if (!hooked.has(d)) { hooked.add(d); d.addEventListener("click", onPick, true); watchDownloads(d); }
}
setInterval(hookDocs, 1000);
// the designs: the Studio's pictures (newest AI designs first); the page's own sample photos only if the Studio has none
function pagePictures() {
  const seen = new Set(), pick = (list) => list.filter((i) => usable(i) && !seen.has(i.src) && seen.add(i.src));
  const studio = frameDocs().flatMap((d) => [...d.querySelectorAll("img")]).filter((i) => i.naturalWidth > 200);
  const designs = pick([...studio].sort((a, b) => /concept|version|design/i.test(b.alt) - /concept|version|design/i.test(a.alt)));
  return designs.length ? designs : pick([...document.querySelectorAll("img")].filter((i) => i.offsetWidth > 40));
}
function showPicture(img) {
  pickedImg = img;
  $(".src").src = img ? img.src : "";
  wrap.querySelectorAll(".pics img").forEach((t) => t.classList.toggle("on", !!img && t.src === img.src));
}
function productImage() {
  if (pickedImg && pickedImg.isConnected) return pickedImg;
  const d = pagePictures(); if (d.length) return d[0];
  // the biggest visible picture in the Studio
  const imgs = [...document.querySelectorAll("#make img, img")].filter((i) => i.offsetWidth > 120 && i.complete && i.naturalWidth);
  return imgs.sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight)[0] || null;
}
async function imageB64(img) {
  const c = document.createElement("canvas"), k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png").split(",")[1];
}

btn.onclick = () => {
  const img = productImage();
  const pics = $(".pics"); pics.innerHTML = "";
  for (const p of pagePictures()) {
    const t = document.createElement("img"); t.src = p.src; t.alt = p.alt || "product";
    t.onclick = () => { showPicture(p); $(".status").textContent = "Design picked. Click ✨ Make it 3D."; };
    pics.appendChild(t);
  }
  showPicture(img);
  wrap.classList.add("on"); fit(); frame();
  $(".status").textContent = img ? "Pick your design, then ✨ Make it 3D." : "No product picture found on the page.";
};
$(".x").onclick = () => wrap.classList.remove("on");
$("#k3dApply").onclick = applySize;
$("#k3dH").oninput = () => { if (!$("#k3dW").value && !$("#k3dD").value) $("#k3dLock").checked = true; applySize(); };
$("#k3dW").oninput = $("#k3dD").oninput = () => { $("#k3dLock").checked = false; applySize(); };
$("#k3dDims").onchange = () => { drawDims(); frame(); };
for (const id of ["#k3dH", "#k3dW", "#k3dD"]) $(id).addEventListener("change", applySize);

$("#k3dGo").onclick = async () => {
  const img = productImage(); if (!img) return;
  const go = $("#k3dGo"); go.disabled = true;
  const t0 = performance.now(), tick = setInterval(() => ($(".status").textContent = `Making the 3D model… ${Math.round((performance.now() - t0) / 1000)} s`), 1000);
  try {
    let b64;
    try { b64 = await imageB64(img); } catch { const r = await fetch(img.src); const bl = await r.blob(); b64 = await new Promise((res) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(",")[1]); f.readAsDataURL(bl); }); }
    const r = await fetch(HELPER + "/make3d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: b64, mime: "image/png", model: $("#k3dModel").value }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "3D generation failed");
    const buf = Uint8Array.from(atob(d.glb), (c) => c.charCodeAt(0)).buffer; lastGlb = buf;
    const gltf = await new GLTFLoader().parseAsync(buf, "");
    if (model) holder.remove(model);
    model = gltf.scene; model.traverse((o) => { if (o.isMesh && o.material && o.material.map) o.material.map.anisotropy = 16; });
    holder.add(model);
    model.scale.set(1, 1, 1); natural = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    $("#k3dGlb").disabled = false; $("#k3dGlb").hidden = false;
    applySize();
    $(".status").textContent = "Done. Drag to look around; change the size any time.";
  } catch (e) {
    $(".status").textContent = /fetch/i.test(String(e)) ? "Start the 3D helper: python3 ~/label-to-shelf/server/fal_helper.py" : "Error: " + (e.message || e);
  } finally { clearInterval(tick); go.disabled = false; }
};
$("#k3dGlb").onclick = () => {
  if (!lastGlb) return;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lastGlb], { type: "model/gltf-binary" }));
  a.download = "kalpi-product-3d.glb"; a.click();
};

// also offer "Make it 3D" next to Download / New background in the picture viewer
function watchDownloads(doc) { new MutationObserver(() => {
  for (const b of doc.querySelectorAll("button")) {
    if (b.textContent.trim() !== "Download" || b.dataset.k3dDone) continue;
    b.dataset.k3dDone = "1";
    const m = document.createElement("button");
    m.type = "button"; m.className = b.className; m.textContent = "✨ Make it 3D";
    m.style.background = "#b4aaff"; m.style.color = "#0b0b10";
    m.onclick = (e) => {
      e.stopPropagation();
      const dlg = b.closest("[role=dialog], dialog, .modal, div");
      const imgs = [...(b.closest("dialog,[role=dialog]") || doc).querySelectorAll("img")].filter((i) => i.offsetWidth > 120);
      pickedImg = imgs.sort((x, y) => y.offsetWidth * y.offsetHeight - x.offsetWidth * x.offsetHeight)[0] || null;
      btn.click();
    };
    b.after(m);
  }
}).observe(doc.body, { childList: true, subtree: true }); }
watchDownloads(document); hookDocs();
