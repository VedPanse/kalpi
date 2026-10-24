// A friendly shopkeeper built from three.js shapes (no downloads), for the store rooms.
// Click a product: they walk over, pick it up, bring it back to their spot and say so.
import * as THREE from "three";

const mat = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r });

function speech(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath(); g.roundRect(8, 8, 496, 112, 40); g.fill();
  g.beginPath(); g.moveTo(236, 118); g.lineTo(256, 152); g.lineTo(276, 118); g.fill();
  g.fillStyle = "#1e1e22"; g.font = "600 44px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 66, 470);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  s.scale.set(0.9, 0.28, 1);
  s.renderOrder = 10;
  return s;
}

function buildShopkeeper(apron) {
  const g = new THREE.Group();
  const skin = mat("#e2b48f", 0.6);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 8, 24), mat("#f3efe7"));
  torso.position.y = 1.08; g.add(torso);
  const apronM = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.235, 0.62, 32, 1, true, -1.15, 2.3), mat(apron, 0.7));
  apronM.position.y = 0.96; g.add(apronM);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16), skin); neck.position.y = 1.43; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), skin); head.position.y = 1.6; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.168, 32, 24, 0, Math.PI * 2, 0, Math.PI / 1.9), mat("#3b2a20", 0.85));
  hair.position.y = 1.62; hair.rotation.x = -0.3; g.add(hair);
  for (const x of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), mat("#1e1e22", 0.3)); e.position.set(x * 0.055, 1.62, 0.148); g.add(e);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 20, Math.PI), mat("#8a3b2e")); smile.position.set(0, 1.56, 0.15); smile.rotation.z = Math.PI; g.add(smile);
  const arms = [];
  for (const x of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(x * 0.26, 1.33, 0); g.add(pivot);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 6, 12), mat("#f3efe7")); arm.position.y = -0.26; pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), skin); hand.position.y = -0.52; pivot.add(hand);
    arms.push(pivot);
  }
  const legs = [];
  for (const x of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(x * 0.09, 0.72, 0); g.add(pivot);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 6, 12), mat("#2b2d33")); leg.position.y = -0.34; pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), mat("#4a3426")); shoe.position.set(0, -0.69, 0.04); pivot.add(shoe);
    legs.push(pivot);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, arms, legs };
}

/**
 * scene, camera, dom: the room's three.js scene, camera and canvas.
 * pickables: the product groups you can click.  home: [x, z] where the shopkeeper stands.
 * nameOf(item): the product's name, so instructions like "bring me the candle" can find it.
 */
export function createShopAssistant({ scene, camera, dom, pickables, home, apron = "#5d6f3a", nameOf = () => "" }) {
  const { g, arms, legs } = buildShopkeeper(apron);
  const homePos = new THREE.Vector3(home[0], 0, home[1]);
  g.position.copy(homePos);
  scene.add(g);
  let bubble = null;
  const say = (text, seconds = 3) => {
    if (bubble) g.remove(bubble);
    bubble = speech(text); bubble.position.y = 2.05; g.add(bubble);
    bubble.userData.until = performance.now() + seconds * 1000;
  };
  say("Hi! Click anything you like", 4);

  let path = [], carried = null, then = null, walking = false;
  const goTo = (p, cb) => { path = [p.clone()]; then = cb; walking = true; };

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const onDown = (e) => { down = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || walking) return;
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    if (!hit) return;
    let item = hit.object;
    while (item && !pickables.includes(item)) item = item.parent;
    if (!item) return;
    fetchItem(item);
  };

  function standNear(item) {
    const p = new THREE.Vector3(); item.getWorldPosition(p);
    const toward = new THREE.Vector3(camera.position.x - p.x, 0, camera.position.z - p.z).normalize();
    return new THREE.Vector3(p.x, 0, p.z).addScaledVector(toward, 0.5);
  }

  function fetchItem(item) {
    const p = new THREE.Vector3(); item.getWorldPosition(p);
    // stand just in front of the product, on the side facing the room
    const toward = new THREE.Vector3(camera.position.x - p.x, 0, camera.position.z - p.z).normalize();
    const stand = new THREE.Vector3(p.x, 0, p.z).addScaledVector(toward, 0.5);
    if (carried) { g.remove(carried); carried = null; }
    say("Let me get that for you");
    goTo(stand, () => {
      carried = item.clone(true);
      carried.userData.name = nameOf(item);
      carried.position.set(0, 0.95, 0.32); carried.rotation.set(0, 0, 0);
      carried.userData.spin = false;
      g.add(carried);
      goTo(homePos, () => say("Here you go! Added to your basket", 4));
    });
  }

  /* ---------- instructions: "bring me a candle", "show me the hand oil", "come back", "checkout" ---------- */
  const words = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const STOP = new Set(["the", "and", "please", "can", "you", "bring", "get", "fetch", "grab", "show", "find", "where", "want", "need", "some", "one", "for", "that", "this", "give"]);
  function findItem(text) {
    const want = words(text).filter((w) => !STOP.has(w)).map((w) => w.replace(/s$/, ""));
    let best = null, score = 0;
    for (const item of pickables) {
      const name = words(nameOf(item)).map((w) => w.replace(/s$/, ""));
      const sc = want.filter((w) => name.some((n) => n.startsWith(w) || w.startsWith(n))).length;
      if (sc > score) { score = sc; best = item; }
    }
    return best;
  }
  function instruct(text) {
    const t = text.toLowerCase().trim();
    if (!t) return "";
    if (walking) { say("One second, I'm on my way"); return "One second, I'm on my way."; }
    if (/^(hi|hello|hey)\b/.test(t)) { say("Hello! What can I get you?"); return "Hello! What can I get you?"; }
    if (/(come back|come here|stop|go back)/.test(t)) { goTo(homePos, () => say("I'm here")); return "Coming back."; }
    if (/(checkout|check out|pay|basket|cart)/.test(t)) {
      if (!carried) { say("Your basket is empty"); return "Your basket is empty. Ask me for something first."; }
      say("Ready! Pay at the counter", 4); return "Ready to pay: " + (carried.userData.name || "your item") + ".";
    }
    const item = findItem(t);
    if (!item) { say("Sorry, I couldn't find that"); return "Sorry, I couldn't find that here. Try a product name."; }
    const name = nameOf(item);
    if (/(show|where|find|look)/.test(t)) {
      say("This way!"); goTo(standNear(item), () => say(name + ", right here", 4));
      return "Showing you " + name + ".";
    }
    fetchItem(item);
    return "Getting " + name + ".";
  }
  dom.addEventListener("pointerdown", onDown);
  dom.addEventListener("pointerup", onUp);

  let t = 0;
  function update(dt) {
    t += dt;
    const target = path[0];
    if (target) {
      const to = target.clone().sub(g.position); to.y = 0;
      const d = to.length();
      if (d < 0.04) {
        path.shift(); walking = false;
        const cb = then; then = null; cb && cb();
      } else {
        g.position.addScaledVector(to.normalize(), Math.min(d, 1.1 * dt));
        g.rotation.y = Math.atan2(to.x, to.z);
      }
    }
    if (walking) {
      const s = Math.sin(t * 8);
      legs[0].rotation.x = s * 0.45; legs[1].rotation.x = -s * 0.45;
      arms[0].rotation.x = carried ? -1.2 : -s * 0.35; arms[1].rotation.x = carried ? -1.2 : s * 0.35;
      g.position.y = Math.abs(s) * 0.02;
    } else {
      legs.forEach((l) => (l.rotation.x = 0)); g.position.y = 0;
      const look = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
      g.rotation.y += (look - g.rotation.y) * Math.min(1, dt * 4);
      const wave = !carried && Math.sin(t * 0.7) > 0.85; // a little wave now and then
      arms[1].rotation.x = carried ? -1.2 : 0; arms[1].rotation.z = wave ? -2.6 + Math.sin(t * 10) * 0.25 : 0;
      arms[0].rotation.x = carried ? -1.2 : Math.sin(t * 1.5) * 0.04;
    }
    if (bubble && performance.now() > bubble.userData.until) { g.remove(bubble); bubble = null; }
  }

  function dispose() {
    dom.removeEventListener("pointerdown", onDown);
    dom.removeEventListener("pointerup", onUp);
    scene.remove(g);
  }
  return { update, dispose, say, instruct };
}
