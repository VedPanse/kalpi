import {buildShelfStage} from './shelf-stage.js';
import {createRetailHost} from './ioanna-shopkeeper.js';
import {buildIoannaRoom} from './ioanna-room.js';
import {shopFixture,shopPendants,productTicket} from './shop-fixtures.js';
import {floorTexture,decorateRoom} from './room-finishes.js';
import { withViewerFallback } from "./viewer-fallback.js";
import * as T from "three";
import { createRenderer } from "./render.js";
import { productModel } from "./geometry.js";
function makeStoreViewer(
  el,
  snapshot,
  {
    walking = false,
    identity = "",
    onInspect = () => {},
    onMove = () => {},
    artworkUrls = {},
  } = {},
) {
  const { layout, versions } = snapshot,
    r = createRenderer(el,{preserveShadows:true}),
    scene = r.scene,
    camera = r.camera;
  scene.fog = new T.Fog("#ddd4c7", 15, 45);
  r.lighting(layout.lighting);
  if(layout.template === "boutique"){camera.fov=52;camera.updateProjectionMatrix();r.key.intensity=.8;scene.environmentIntensity=.25;}
  let yaw = 0,
    pitch = layout.template === "boutique" ? -.12 : 0,
    pos = new T.Vector3(0, 1.65, Math.min(3, layout.depth / 2 - 0.5)),
    inspecting = false,
    keys = new Set(),
    mouseDown = false,
    lastSend = 0,
    disposed = false,
    sequence = 0;
  const objects = new Map(),
    avatars = new Map();
  const box = (w, h, d, x, y, z, color) => {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.75 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  let shelfStage=null;
  if(['shelf','boutique'].includes(layout.presentation)){shelfStage=buildShelfStage(r,layout);}
  else if(layout.scene==='ioanna'){
    scene.children.filter(o=>o.isLight).forEach(o=>scene.remove(o));
    scene.environmentIntensity=.2;buildIoannaRoom(scene,layout);
  }else{
  const floor=box(layout.width, 0.12, layout.depth, 0, -0.06, 0, "#ffffff");floor.material.map=floorTexture(layout.style||"gallery",layout.floorColor);
  box(
    layout.width,
    layout.height,
    0.12,
    0,
    layout.height / 2,
    -layout.depth / 2,
    layout.wallColor,
  );
  box(
    0.12,
    layout.height,
    layout.depth,
    -layout.width / 2,
    layout.height / 2,
    0,
    layout.wallColor,
  );
  box(
    0.12,
    layout.height,
    layout.depth,
    layout.width / 2,
    layout.height / 2,
    0,
    layout.wallColor,
  );
  box(layout.width, 0.1, layout.depth, 0, layout.height + 0.05, 0, "#f2eee8");
  for (let z = -layout.depth / 2 + 1; z < layout.depth / 2; z += 2.5) {
    const light = box(0.07, 0.025, 1.5, 0, layout.height - 0.03, z, "#fff4dc");
    light.material = new T.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe6c7,
      emissiveIntensity: 2,
    });
  }
  const lines = new T.GridHelper(
    Math.max(layout.width, layout.depth),
    Math.round(Math.max(layout.width, layout.depth) * 2),
    0x766f66,
    0x958e84,
  );
  lines.position.y = 0.001;
  // Wood or concrete texture replaces the wire grid.
  lines.geometry.dispose();lines.material.dispose();
  decorateRoom(scene,layout,box);
  for (const f of layout.fixtures) shopFixture(scene,f,layout.style);
  shopPendants(scene,layout);
  }
  const cv = document.createElement("canvas");
  cv.width = 2048;
  cv.height = 256;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#e7e0d7";
  ctx.fillRect(0, 0, 2048, 256);
  ctx.fillStyle = "#2b2630";
  ctx.font = "90px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(layout.sign, 1024, 155, 1900);
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(
    new T.PlaneGeometry(Math.min(layout.width - 1, 3), 0.35),
    new T.MeshBasicMaterial({ map: tex }),
  );
  sign.position.set(0, Math.min(2.65,layout.height-.3), -layout.depth / 2 + 0.08);
  if(!["shelf","boutique"].includes(layout.presentation))scene.add(sign);
  const displayScale = ["shelf","boutique"].includes(layout.presentation) || (layout.scene === "ioanna" && layout.width === 4) ? 2.5 : 1;
  for (const p of layout.placements) {
    const v = versions.find((v) => v.id === p.versionId);
    if (!v) continue;
    const model = productModel(v.document);
    model.userData.ready?.then(()=>{if(!disposed)el.dataset.modelLoaded="true";}).catch(e=>{if(!disposed)el.dataset.modelError=e.message;});
    if (v.document.label.assetId && artworkUrls[v.document.label.assetId])
      new T.TextureLoader().load(
        artworkUrls[v.document.label.assetId],
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = T.SRGBColorSpace;
          Promise.resolve(model.userData.ready).then(()=>{if(disposed){texture.dispose();return;}
          const label = model.getObjectByName("Label");
          if (label) {
            label.material.map?.dispose();
            label.material.map = texture;
            label.material.needsUpdate = true;
          } else texture.dispose();
          }).catch(()=>texture.dispose());
        },
      );
    model.scale.setScalar(displayScale);
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = p.rotation;
    model.userData.instanceId = p.id;
    scene.add(model);
    objects.set(p.id, { model, placement: p, version: v });
    if(p.id.startsWith("tester-"))productTicket(scene,p,v);
  }
  // A visible, articulated-looking hand and sleeve anchors held products in the first-person view.
  const hand = new T.Group();
  hand.visible = false;
  const skin = new T.MeshStandardMaterial({
    color: "#bd8d72",
    roughness: 0.75,
  });
  const palm = new T.Mesh(new T.BoxGeometry(0.07, 0.025, 0.09), skin);
  hand.add(palm);
  for (let i = 0; i < 4; i++) {
    const finger = new T.Mesh(new T.CapsuleGeometry(0.007, 0.045, 4, 8), skin);
    finger.rotation.x = Math.PI / 2;
    finger.position.set((i - 1.5) * 0.017, 0.013, -0.035);
    hand.add(finger);
  }
  const sleeve = new T.Mesh(
    new T.CylinderGeometry(0.035, 0.045, 0.22, 12),
    new T.MeshStandardMaterial({ color: "#49424f" }),
  );
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.z = 0.12;
  hand.add(sleeve);
  camera.add(hand);
  hand.position.set(-0.1, -0.14, -0.36);
  scene.add(camera);
  if (!walking) {
    pos.set(layout.width * 0.65, layout.height * 1.6, layout.depth * 0.7);
    camera.position.copy(pos);
    camera.lookAt(0, 0.7, -1);
  } else camera.position.copy(pos);
  const ray = new T.Raycaster(),
    canvas = r.renderer.domElement;
  const inspect = (e) => {
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(
      document.pointerLockElement === canvas
        ? new T.Vector2()
        : new T.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          ),
      camera,
    );
    const hit = ray.intersectObjects(
      [...objects.values()].map((x) => x.model),
      true,
    )[0];
    if (hit) {
      let m = hit.object;
      while (m.parent && !m.userData.instanceId) m = m.parent;
      const item = objects.get(m.userData.instanceId);
      if (item) {shelfStage?.select(item.placement);onInspect(item.version, item.placement.id);}
    }
  };
  canvas.addEventListener("click", inspect);
  const down = (e) => {
    if (!walking || inspecting) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    keys.add(e.code);
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    )
      e.preventDefault();
  };
  const up = (e) => keys.delete(e.code);
  const blur = () => {
    keys.clear();
    mouseDown = false;
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  const move = (e) => {
    if (walking && (document.pointerLockElement === canvas || mouseDown)) {
      yaw -= e.movementX * 0.003;
      pitch = T.MathUtils.clamp(pitch - e.movementY * 0.003, -1.2, 1.2);
    }
  };
  canvas.addEventListener("pointerdown", (e) => {
    mouseDown = e.button === 2;
  });
  canvas.addEventListener("pointerup", () => (mouseDown = false));
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("mousemove", move);
  let touch;
  canvas.addEventListener(
    "touchstart",
    (e) => (touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }),
    { passive: true },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!touch || !walking) return;
      const t = e.touches[0];
      yaw -= (t.clientX - touch.x) * 0.005;
      pitch = T.MathUtils.clamp(
        pitch - (t.clientY - touch.y) * 0.005,
        -1.2,
        1.2,
      );
      touch = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );
  function blocked(x, z) {
    if (
      Math.abs(x) > layout.width / 2 - 0.25 ||
      Math.abs(z) > layout.depth / 2 - 0.25
    )
      return true;
    for (const f of layout.fixtures) {
      const dx = x - f.x,
        dz = z - f.z,
        c = Math.cos(f.rotation),
        s = Math.sin(f.rotation);
      if (
        Math.abs(dx * c - dz * s) < f.width / 2 + 0.22 &&
        Math.abs(dx * s + dz * c) < f.depth / 2 + 0.22
      )
        return true;
    }
    for (const { placement: p, version: v } of objects.values())
      if (Math.max(v.document.dimensions.width,v.document.dimensions.depth) > .6) {
        const dx = x - p.x,
          dz = z - p.z,
          c = Math.cos(p.rotation),
          s = Math.sin(p.rotation);
        if (
          Math.abs(dx * c - dz * s) < v.document.dimensions.width / 2 + 0.22 &&
          Math.abs(dx * s + dz * c) < v.document.dimensions.depth / 2 + 0.22
        )
          return true;
      }
    return false;
  }
  const retailHost = createRetailHost(scene,camera,[Math.min(.95,layout.width/2-.4),-.1]);
  let deliveryId = null;
  let heldId = null,
    inspectionRotation = 0;
  r.update = (dt) => {
    retailHost?.update(dt);
    if (walking) {
      let forward =
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
        side = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
      if (keys.has("ArrowLeft")) yaw += dt;
      if (keys.has("ArrowRight")) yaw -= dt;
      const len = Math.max(1, Math.hypot(forward, side)),
        speed = dt * 2;
      const dx =
          ((-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed) / len,
        dz = ((-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed) / len;
      if (!blocked(pos.x + dx, pos.z)) pos.x += dx;
      if (!blocked(pos.x, pos.z + dz)) pos.z += dz;
      camera.position.copy(pos);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      lastSend += dt;
      if (lastSend > 0.1) {
        onMove({ x: pos.x, z: pos.z, yaw, sequence: ++sequence });
        lastSend = 0;
      }
    }
    for (const a of avatars.values()) {
      a.group.position.lerp(a.target, 0.18);
      a.group.rotation.y = a.yaw;
      // Shared spawn points and narrow aisles can overlap visitors. Fade nearby
      // avatars so the camera never looks through another visitor's head.
      const distance = Math.hypot(
        a.group.position.x - camera.position.x,
        a.group.position.z - camera.position.z,
      );
      const opacity = T.MathUtils.clamp((distance - 0.5) / 0.5, 0, 1);
      a.group.visible = opacity > 0;
      a.group.traverse((node) => {
        if (!node.material) return;
        node.material.opacity = opacity;
        node.material.transparent = opacity < 1 || node.isSprite;
        if (!node.isSprite) node.material.depthWrite = opacity === 1;
      });
    }
    if (heldId && !deliveryId) {
      const item = objects.get(heldId);
      if (item) {
        item.model.position.copy(
          camera.localToWorld(new T.Vector3(-0.1, -0.12, -0.42)),
        );
        item.model.quaternion.copy(camera.quaternion);
        item.model.rotateY(inspectionRotation);
      }
    }
  };
  function sprite(name) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#292332";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "white";
    g.font = "28px sans-serif";
    g.textAlign = "center";
    g.fillText(name, 128, 43, 240);
    const s = new T.Sprite(
      new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }),
    );
    s.scale.set(0.8, 0.2, 1);
    s.position.y = 1.95;
    return s;
  }
  return {
    setInspecting(value){inspecting=value;if(value)keys.clear();},
    async deliverProduct(id){
      const item=objects.get(id);if(!retailHost||!item)throw Error('Shopkeeper unavailable.');
      deliveryId=id;
      item.model.scale.setScalar(1);
      item.model.position.set(item.placement.x,item.placement.y,item.placement.z);
      try{await retailHost.deliver(item.model);}finally{deliveryId=null;}
    },
    resetPosition() {
      pos.set(0, 1.65, Math.min(3, layout.depth / 2 - 0.6));
      yaw = pitch = 0;
      keys.clear();
      camera.position.copy(pos);
    },
    sync(visitors, holds) {
      if (disposed) return;
      const active = new Set();
      for (const v of visitors) {
        const id = v.identity.toHexString();
        if (id === identity) continue;
        active.add(id);
        let a = avatars.get(id);
        if (!a) {
          const g = new T.Group(),
            body = new T.Mesh(
              new T.CapsuleGeometry(0.17, 0.85, 4, 12),
              new T.MeshStandardMaterial({ color: "#817098" }),
            );
          body.position.y = 0.85;
          g.add(body);
          const head = new T.Mesh(
            new T.SphereGeometry(0.12, 16, 12),
            skin.clone(),
          );
          head.position.y = 1.5;
          g.add(head, sprite(v.name));
          g.position.set(v.x, 0, v.z);
          scene.add(g);
          a = { group: g, target: new T.Vector3(), yaw: 0 };
          avatars.set(id, a);
        }
        a.target.set(v.x, 0, v.z);
        a.yaw = v.yaw;
      }
      for (const [id, a] of avatars)
        if (!active.has(id)) {
          scene.remove(a.group);
          avatars.delete(id);
        }
      if(deliveryId && !holds.some(h=>h.instanceId===deliveryId && h.holder.toHexString()===identity && Number(h.expiresAt)>Date.now()))retailHost?.cancel();
      heldId = null;
      delete el.dataset.held;
      hand.visible = false;
      for (const [id, item] of objects) {
        const h = holds.find(
          (h) => h.instanceId === id && Number(h.expiresAt) > Date.now(),
        );
        item.model.scale.setScalar(h ? 1 : displayScale);
        if (h) {
          const holder = h.holder.toHexString();
          if (holder === identity) {
            heldId = id;
            el.dataset.held = id;
            hand.visible = true;
          } else {
            const v = visitors.find((v) => v.identity.toHexString() === holder);
            if (v) {
              item.model.position.set(
                v.x - Math.sin(v.yaw) * 0.35,
                1.25,
                v.z - Math.cos(v.yaw) * 0.35,
              );
              item.model.rotation.set(0, v.yaw, 0);
            }
          }
        } else {
          item.model.position.set(
            item.placement.x,
            item.placement.y,
            item.placement.z,
          );
          item.model.rotation.set(0, item.placement.rotation, 0);
        }
      }
    },
    rotateHeld(v) {
      inspectionRotation = v;
    },
    moveKey(key, pressed) {
      pressed ? keys.add(key) : keys.delete(key);
    },
    enterWalk() {
      canvas.requestPointerLock?.();
    },
    dispose() {
      disposed = true;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("mousemove", move);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      retailHost?.dispose();
      shelfStage?.dispose();
      r.dispose();
    },
  };
}

export function storeViewer(el, snapshot, options) {
  return withViewerFallback(el, () => makeStoreViewer(el, snapshot, options));
}
