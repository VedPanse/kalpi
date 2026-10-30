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

// Adapted from Ioanna's ShopAssistant.js (origin/ioanna 3756177).
// Keep pickup authority in Kalpi's transactional shared-room flow.
export function createRetailHost(scene, camera, home = [-1.9, -.2]) {
 const {g,arms,legs}=buildShopkeeper('#5d6f3a');
 g.position.set(home[0],0,home[1]); scene.add(g);
 let elapsed=0, delivery=null, returning=false;
 const homePoint=g.position.clone();
 function finish(){if(delivery){const done=delivery.resolve;delivery=null;returning=true;done();}}

 return {deliver(model){
  if(delivery)throw Error('The shopkeeper is already helping you.');
  returning=false;return new Promise(resolve=>{delivery={model,resolve,phase:'fetch',target:new THREE.Vector3(model.position.x,0,model.position.z+.4)};});
 },cancel(){finish();},update(dt){
  elapsed+=dt;
  if(delivery){
   const d=delivery;
   if(d.phase==='bring')d.target.copy(camera.position).setY(0).add(new THREE.Vector3(0,0,-.7).applyQuaternion(camera.quaternion).setY(0));
   const to=d.target.clone().sub(g.position);to.y=0;
   const distance=to.length();
   if(distance>.06){g.position.addScaledVector(to.normalize(),Math.min(distance,dt*1.15));g.rotation.y=Math.atan2(to.x,to.z);}
   legs[0].rotation.x=Math.sin(elapsed*8)*.35;legs[1].rotation.x=-legs[0].rotation.x;
   arms.forEach(a=>{a.rotation.z=0;a.rotation.x=d.phase==='bring'?-1.1:0;});
   if(d.phase==='bring'){d.model.position.copy(new THREE.Vector3(0,1.12,.35).applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y).add(g.position));d.model.rotation.set(0,g.rotation.y,0);}
   if(distance<=.06){if(d.phase==='fetch'){d.phase='bring';}else{finish();}}
   return;
  }
  if(returning){
   const to=homePoint.clone().sub(g.position);to.y=0;
   if(to.length()<.05){returning=false;}else{g.position.addScaledVector(to.normalize(),Math.min(to.length(),dt*1.15));g.rotation.y=Math.atan2(to.x,to.z);legs[0].rotation.x=Math.sin(elapsed*8)*.3;legs[1].rotation.x=-legs[0].rotation.x;arms.forEach(a=>{a.rotation.x=0;a.rotation.z=0;});return;}
  }
  legs.forEach(l=>l.rotation.x=0);

  const angle=Math.atan2(camera.position.x-g.position.x,camera.position.z-g.position.z);
  const delta=Math.atan2(Math.sin(angle-g.rotation.y),Math.cos(angle-g.rotation.y));
  g.rotation.y+=delta*Math.min(1,dt*4);
  arms[1].rotation.z=Math.sin(elapsed*.7)>.85?-2.6+Math.sin(elapsed*10)*.25:0;
  arms[0].rotation.x=Math.sin(elapsed*1.5)*.04;
 },dispose(){finish();scene.remove(g);const geometries=new Set(),materials=new Set();g.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());}};
}
