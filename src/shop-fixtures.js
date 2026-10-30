import {floorTexture} from './room-finishes.js';
// Shelving, counter and brass pendant composition adapted from Ioanna's
// StoreRooms3D.jsx apothecary room (9122831); live products stay in store-view.
import * as T from 'three';
export function shopFixture(scene,f,style='apothecary'){
 const g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=f.rotation;scene.add(g);
 const grain=floorTexture('apothecary',style==='apothecary'?'#8c6a43':'#b7a48c');grain.repeat.set(1,1);
 const wood=new T.MeshStandardMaterial({color:'#ffffff',map:grain,roughness:.6});
 const brass=new T.MeshStandardMaterial({color:'#b99b61',metalness:.72,roughness:.3});
 const stone=new T.MeshStandardMaterial({color:'#e5dfd2',roughness:.4});
 function box(w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 if(f.kind==='cabinet'){
  box(f.width,f.height,.035,0,f.height/2,-f.depth/2,new T.MeshStandardMaterial({color:style==='apothecary'?'#23382c':'#817766',roughness:.95}));
  for(const x of [-1,1])box(.055,f.height,f.depth,x*(f.width/2-.025),f.height/2,0,wood);
  box(f.width,.45,f.depth,0,.225,0,wood);
  for(const y of [.78,1.32,1.86]){
   box(f.width,.045,f.depth,0,y-.0225,0,wood);
   box(f.width-.1,.012,.018,0,y+.015,-f.depth/2+.055,new T.MeshStandardMaterial({color:'#ffe6bb',emissive:'#ffd79a',emissiveIntensity:2}));
   box(f.width,.012,.012,0,y-.025,f.depth/2,brass);
  }
  for(const x of [-.25,.25])box(.07,.014,.018,x,.28,f.depth/2+.01,brass);
  box(f.width+.05,.06,f.depth+.03,0,f.height,0,wood);
 }else if(f.kind==='counter'){
  box(f.width-.08,f.height-.08,f.depth-.08,0,(f.height-.08)/2,0,wood);
  // Fluted joinery on the customer-facing side.
  for(let x=-f.width/2+.08;x<f.width/2;x+=.055)box(.018,f.height-.16,.025,x,f.height/2,f.depth/2-.025,wood);
  box(f.width,.06,f.depth,0,f.height-.03,0,stone);
  box(f.width-.06,.045,f.depth-.06,0,.04,0,brass);
 }else{
  box(f.width,.06,f.depth,0,f.height-.03,0,wood);
  for(const x of [-1,1])for(const z of [-1,1])box(.045,f.height,.045,x*(f.width/2-.05),f.height/2,z*(f.depth/2-.05),brass);
  box(f.width,.04,f.depth,0,.3,0,wood);
 }
 return g;
}
export function shopPendants(scene,layout){
 if(layout.style!=='apothecary')return;
 const key=new T.SpotLight('#ffe8ca',24,8,.75,.6,2);key.position.set(0,layout.height-.2,1.3);key.target.position.set(0,1,.1);key.castShadow=true;key.shadow.mapSize.set(512,512);key.shadow.normalBias=.002;scene.add(key,key.target);
 for(const x of [-layout.width*.25,layout.width*.25]){
  const z=-layout.depth*.18,y=layout.height-.55;
  const brass=new T.MeshStandardMaterial({color:'#b99b61',metalness:.8,roughness:.28,side:T.DoubleSide});
  const cord=new T.Mesh(new T.CylinderGeometry(.008,.008,.4,8),new T.MeshStandardMaterial({color:'#272621'}));cord.position.set(x,y+.27,z);scene.add(cord);
  const shade=new T.Mesh(new T.ConeGeometry(.22,.17,32,1,true),brass);shade.position.set(x,y,z);scene.add(shade);
  const bulb=new T.Mesh(new T.SphereGeometry(.045,12,8),new T.MeshBasicMaterial({color:'#ffe6bb'}));bulb.position.set(x,y-.06,z);scene.add(bulb);
  const light=new T.PointLight('#ffe2b3',5,5,2);light.position.copy(bulb.position);scene.add(light);
 }
}
export function productTicket(scene,p,v){
 const c=document.createElement('canvas');c.width=512;c.height=160;const g=c.getContext('2d');g.fillStyle='#f4efe3';g.fillRect(0,0,512,160);g.fillStyle='#26372d';g.textAlign='center';g.font='600 32px sans-serif';g.fillText(v.document.facts.name.replace(' · Sample price',''),256,60,480);g.font='28px sans-serif';g.fillText(new Intl.NumberFormat('en-US',{style:'currency',currency:v.document.facts.currency}).format(v.document.facts.price)+(v.document.facts.name.includes('Sample price')?' · Sample price':''),256,112,480);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 const m=new T.Mesh(new T.PlaneGeometry(.26,.081),new T.MeshBasicMaterial({map:tex}));m.position.set(p.x,p.y-.055,p.z+.335);scene.add(m);
}
