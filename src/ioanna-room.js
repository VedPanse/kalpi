// Room geometry and lighting ported from Ioanna's GrazaRooms3D.jsx, origin/ioanna 0307789.
// Product instances, picking, movement and votes are supplied by Kalpi's publication.
import * as THREE from 'three';
export function buildIoannaRoom(scene,layout){
 const BRAND=layout.sign,anim=[],camera={position:{set(){}}},controls={target:{set(){}}};
 const place=()=>new THREE.Group();
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData={c,draw};return t;}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function gradTex(inner,outer){return canvasTex(256,256,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,inner);gr.addColorStop(.55,inner);gr.addColorStop(.72,outer);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});}
function woodTex(base,line){return canvasTex(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const r=mulberry(7);for(let i=0;i<60;i++){g.strokeStyle=line;g.globalAlpha=.05+r()*.12;g.lineWidth=1+r()*3;g.beginPath();const y=r()*h;g.moveTo(0,y);g.bezierCurveTo(w*.3,y+r()*20-10,w*.6,y+r()*20-10,w,y+r()*16-8);g.stroke();}for(let i=1;i<6;i++){g.globalAlpha=.18;g.fillStyle='#000';g.fillRect(0,i*h/6,w,2);}});}
function noiseTex(base,amt){return canvasTex(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const r=mulberry(3);for(let i=0;i<9000;i++){g.globalAlpha=r()*amt;g.fillStyle=r()>.5?'#fff':'#000';g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}});}
function std(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.6,metalness:0},o||{}));}
function room(w,d,h,wallMat,floorMat,ceil){const g=new THREE.Group();
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,d),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
  const mk=(W,H,x,z,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(W,H),wallMat);m.position.set(x,H/2,z);m.rotation.y=ry;m.receiveShadow=true;g.add(m);};
  mk(w,h,0,-d/2,0);mk(d,h,-w/2,0,Math.PI/2);mk(d,h,w/2,0,-Math.PI/2);
  if(ceil){const c=new THREE.Mesh(new THREE.PlaneGeometry(w,d),ceil);c.rotation.x=Math.PI/2;c.position.y=h;g.add(c);}
  return g;}
function plinth(x,z,h,mat,r){const m=r?new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat):new THREE.Mesh(new THREE.BoxGeometry(.42,h,.42),mat);m.position.set(x,h/2,z);m.castShadow=m.receiveShadow=true;return m;}
function spot(x,y,z,tx,ty,tz,col,int,ang){const s=new THREE.SpotLight(col,int,12,ang||.45,.55,1.4);s.position.set(x,y,z);s.target.position.set(tx,ty,tz);s.castShadow=true;s.shadow.mapSize.set(1024,1024);s.shadow.bias=-.0005;return [s,s.target];}
const BUILD={
 gallery(){
  scene.background=new THREE.Color('#E8E5DF');scene.fog=new THREE.Fog('#E8E5DF',9,18);
  scene.add(room(8,7,3.4,std('#F1EFEA',{roughness:.95}),std('#ffffff',{map:woodTex('#C9B79C','#6b5233'),roughness:.7}),std('#F6F5F2')));
  scene.add(new THREE.HemisphereLight('#ffffff','#b9a98f',.55));
  const amb=new THREE.DirectionalLight('#fff7ee',.35);amb.position.set(2,5,4);scene.add(amb);
  place('p1',-1.2,1.65,-3.47);place('p2',1.2,1.65,-3.47);
  scene.add(...spot(-1.2,3.3,-2,-1.2,1.6,-3.5,'#fff3e2',2.2,.32),...spot(1.2,3.3,-2,1.2,1.6,-3.5,'#fff3e2',2.2,.32));
  const pm=std('#FAFAF8',{roughness:.8});
  [[-1.6,-1.2,'c1'],[-.55,-.6,'b1'],[.55,-.6,'m1'],[1.6,-1.2,'c2']].forEach(([x,z,id])=>{scene.add(plinth(x,z,.95,pm));place(id,x,.95,z,.4);scene.add(...spot(x,3.3,z+1.2,x,1,z,'#fff',1.3,.22));});
  scene.add(plinth(0,-2.3,.6,pm));place('x1',0,.6,-2.3,-.3);
  camera.position.set(0,1.6,3.2);controls.target.set(0,1,-1.2);
 },
 apothecary(){
  if(layout.width===4){
   scene.background=new THREE.Color(layout.wallColor||'#263c30');
   scene.add(room(4,4,3,std(layout.wallColor||'#304e3d'),std('#fff',{map:woodTex(layout.floorColor||'#8c6a43','#3b2914')}),std('#e2dac8')));
   scene.add(new THREE.HemisphereLight('#fff4de','#394334',.7));
   const wood=std('#fff',{map:woodTex('#8C6A43','#3b2914')}),stone=std('#e4dccb',{roughness:.45});
   for(const f of layout.fixtures){
    const base=new THREE.Mesh(new THREE.BoxGeometry(f.width,.12,f.depth),wood);base.position.set(f.x,.06,f.z);scene.add(base);
    const top=new THREE.Mesh(new THREE.BoxGeometry(f.width,.06,f.depth),stone);top.position.set(f.x,f.height-.03,f.z);scene.add(top);
    for(const x of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.045,f.height,.045),std('#b69a62',{metalness:.7,roughness:.3}));leg.position.set(f.x+x*(f.width/2-.04),f.height/2,f.z);scene.add(leg);}
   }
   for(const p of layout.placements){
    const light=new THREE.SpotLight('#ffe9cb',1.8,5,.35,.6,1);light.position.set(p.x,2.65,-.8);light.target.position.set(p.x,1.25,-1.35);scene.add(light,light.target);
   }
   for(const x of [-.9,.8]){const shade=new THREE.Mesh(new THREE.ConeGeometry(.2,.18,24,1,true),std('#c3a46a',{metalness:.8,side:THREE.DoubleSide}));shade.position.set(x,2.5,0);scene.add(shade);const light=new THREE.PointLight('#ffe2b3',1.4,5);light.position.set(x,2.35,0);scene.add(light);}
   return;
  }
  scene.background=new THREE.Color('#162319');scene.fog=new THREE.Fog('#162319',7,14);
  scene.add(room(6,6,3,std('#2F4A3C',{roughness:.9}),std('#fff',{map:woodTex('#5A3E26','#1d120a'),roughness:.75}),std('#1E2E24')));
  scene.add(new THREE.HemisphereLight('#FFE2B8','#1b2a20',.35));
  const wood=std('#fff',{map:woodTex('#8C6A43','#3b2914'),roughness:.6});
  const shelfY=[.75,1.35,1.95];
  shelfY.forEach(y=>{const sh=new THREE.Mesh(new THREE.BoxGeometry(4.2,.05,.38),wood);sh.position.set(0,y,-2.79);sh.castShadow=sh.receiveShadow=true;scene.add(sh);});
  [-2.1,2.1].forEach(x=>{const up=new THREE.Mesh(new THREE.BoxGeometry(.06,2.3,.38),wood);up.position.set(x,1.15,-2.79);up.castShadow=true;scene.add(up);});
  const rows=[['c1','c2','b1','b2','m1'],['b2','c2','x1','c1'],['m1','b1','c1','b2','c2']];
  rows.forEach((ids,ri)=>{const n=ids.length;ids.forEach((id,i)=>{place(id,-1.6+i*3.2/(n-1),shelfY[ri]+.025,-2.75,0);});});
  const counter=new THREE.Mesh(new THREE.BoxGeometry(1.8,.95,.6),wood);counter.position.set(1.2,.475,-.4);counter.castShadow=counter.receiveShadow=true;scene.add(counter);
  place('x1',1.0,.95,-.4,-.4);place('c1',1.65,.95,-.35,.6);
  [[-1.2,-1.8],[1.2,-1.8],[1.2,-.3]].forEach(([x,z])=>{
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.7,6),std('#111'));cord.position.set(x,2.65,z);scene.add(cord);
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.16,.18,32,1,true),std('#D9B56A',{metalness:.85,roughness:.3,side:THREE.DoubleSide}));shade.position.set(x,2.25,z);scene.add(shade);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.04,16,16),new THREE.MeshBasicMaterial({color:'#FFE6B0'}));bulb.position.set(x,2.2,z);scene.add(bulb);
    const l=new THREE.PointLight('#FFC97A',1.3,4.5,1.6);l.position.set(x,2.15,z);l.castShadow=true;l.shadow.mapSize.set(512,512);scene.add(l);});
  camera.position.set(-.6,1.55,2.4);controls.target.set(0,1.2,-2);
 },
 stage(){
  scene.background=new THREE.Color('#07060A');scene.fog=new THREE.Fog('#07060A',6,13);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(9,64),new THREE.MeshStandardMaterial({color:'#0F0D15',roughness:.35,metalness:.4}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(20,8),new THREE.MeshBasicMaterial({map:canvasTex(512,256,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h*.15,0,w/2,h*.15,w*.6);gr.addColorStop(0,'#3A2F55');gr.addColorStop(.5,'#140E1D');gr.addColorStop(1,'#07060A');g.fillStyle=gr;g.fillRect(0,0,w,h);})}));back.position.set(0,3.5,-5);scene.add(back);
  scene.add(new THREE.HemisphereLight('#B4AAFF','#07060A',.18));
  const ringTex=gradTex('rgba(0,0,0,0)','rgba(180,170,255,1)');
  const items=[['b1',-2.2,-1.4],['c1',-1.1,-2],['x1',0,-2.3],['c2',1.1,-2],['m1',2.2,-1.4]];
  const pm=new THREE.MeshStandardMaterial({color:'#18151F',roughness:.4,metalness:.3});
  items.forEach(([id,x,z],i)=>{scene.add(plinth(x,z,.7,pm,.3));const g=place(id,x,.7,z,-x*.2);
    const ring=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({map:ringTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.012,z);scene.add(ring);
    anim.push(t=>{ring.material.opacity=.65+.3*Math.sin(t*1.6+i);});
    scene.add(...spot(x*.6,4.2,z+1.6,x,.8,z,'#E9E6FF',2.4,.18));});
  camera.position.set(0,1.5,2.8);controls.target.set(0,.9,-1.6);
 },
 loft(){
  scene.background=new THREE.Color('#2A2E33');scene.fog=new THREE.Fog('#2A2E33',9,18);
  const wall=std('#fff',{map:noiseTex('#A9AEB2',.08),roughness:.95});
  scene.add(room(9,7,3.6,wall,std('#fff',{map:noiseTex('#7A8087',.12),roughness:.85}),std('#3A3F45')));
  const win=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2),new THREE.MeshBasicMaterial({color:'#E7F0F7'}));win.position.set(-4.49,1.8,-.5);win.rotation.y=Math.PI/2;scene.add(win);
  for(let i=1;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.04,2,.04),std('#1c1f22'));bar.position.set(-4.47,1.8,-.5-1.6+i*.8);scene.add(bar);}
  const sun=new THREE.DirectionalLight('#FFF4E5',1.6);sun.position.set(-6,4,0);sun.target.position.set(0,0,-1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5});scene.add(sun,sun.target);
  scene.add(new THREE.HemisphereLight('#dfe6ee','#3a3f45',.55));
  const top=std('#fff',{map:woodTex('#B08A5F','#4a331c'),roughness:.6}),leg=std('#22262A',{metalness:.6,roughness:.4});
  [[-1.2,-1.6],[1.4,-1.0]].forEach(([x,z],ti)=>{const t=new THREE.Mesh(new THREE.BoxGeometry(2.2,.06,.8),top);t.position.set(x,.88,z);t.castShadow=t.receiveShadow=true;scene.add(t);
    [[-1,-.33],[1,-.33],[-1,.33],[1,.33]].forEach(([a,b])=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.05,.85,.05),leg);l.position.set(x+a,.425,z+b);l.castShadow=true;scene.add(l);});
    const ids=ti?['m1','c2','b2','m1']:['c1','b1','x1','b2'];ids.forEach((id,i)=>place(id,x-.75+i*.5,.91,z,(i-1.5)*.3));});
  const neon=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.6),new THREE.MeshBasicMaterial({map:canvasTex(1024,256,(g,w,h)=>{g.fillStyle='rgba(0,0,0,0)';g.fillRect(0,0,w,h);g.font='700 150px Syne, sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#F2A65A';g.shadowBlur=40;g.fillStyle='#FFD3A3';g.fillText(BRAND.toLowerCase(),w/2,h/2);g.shadowBlur=12;g.fillText(BRAND.toLowerCase(),w/2,h/2);}),transparent:true}));neon.position.set(.4,2.5,-3.48);scene.add(neon);
  const glow=new THREE.PointLight('#F2A65A',.7,4);glow.position.set(.4,2.5,-3);scene.add(glow);
  place('p1',2.6,1.7,-3.47);
  camera.position.set(.2,1.6,2.8);controls.target.set(0,1,-1.4);
 }
};

 BUILD[layout.style||'apothecary']();
 scene.traverse(o=>{if(o.isLight){o.intensity*=Math.PI;if(layout.lighting==='cool')o.color.lerp(new THREE.Color('#dceaff'),.8);else if(layout.lighting==='daylight')o.color.lerp(new THREE.Color('#ffffff'),.7);}if(o.isPointLight||o.isSpotLight){o.decay=0;o.shadow.normalBias=.002;}});
}
