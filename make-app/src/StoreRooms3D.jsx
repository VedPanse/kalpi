// Store rooms — your Figma product in four 3D shop rooms. Drag to look around, scroll to zoom.
// Made with Label to Shelf. VERSIONS is the same product data as LabelToShelf3D.jsx.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createShopAssistant } from "./ShopAssistant.js";

const VERSIONS = [{"x":0,"parts":[{"color":"#9aae94","rh":[[0,0],[34,0],[36,4],[36,150],[33,172],[20,190],[15,198],[15,212]]},{"color":"#c9a56b","rh":[[0,212],[17,212],[17,238],[0,238]]}],"label":{"b0":30,"b1":120,"r":36.4,"angle":3.1648,"src":"data:image/jpeg;base64,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"}}];

const ROOMS = [
  { id: "gallery", name: "Gallery", stand: [0, 0.2], keeper: [-2.4, 0.3] },
  { id: "apothecary", name: "Apothecary", stand: [-0.7, -0.9], keeper: [1.2, -0.95] },
  { id: "stage", name: "Stage", stand: [0, -0.3], keeper: [1.9, -0.2] },
  { id: "loft", name: "Pop-up Loft", stand: [0.3, 0.1], keeper: [-2.6, 0.4] },
];

/* builds one room into `scene`; returns camera position/target */
function buildRoom(roomId, scene, camera, controls) {
  const reduce = false;
  const BRAND = "Hollow Oak";
  const pickables = [], anim = [];
  const CATALOG=[
 {id:'c1',type:'candle',name:'Fig & Cedar Candle',price:'$34.00',desc:'Soy wax in a smoked glass jar. 60-hour burn.',colors:['#3E4A3D','#8A5A44','#D9CDB8','#2E3550'],label:'FIG & CEDAR'},
 {id:'c2',type:'candle',name:'Sea Salt Candle',price:'$34.00',desc:'Coconut-soy blend with a cotton wick.',colors:['#A9C2C9','#E6DFD2','#556B7A','#C9A27A'],label:'SEA SALT'},
 {id:'b1',type:'bottle',name:'Body Wash',price:'$24.00',desc:'Gentle wash with cedar and sage, 250 ml.',colors:['#8FA595','#BA6246','#2C3A5C','#E8E0CE'],label:'BODY WASH'},
 {id:'b2',type:'bottle',name:'Hand Oil',price:'$22.00',desc:'Cold-pressed oils with vetiver, 50 ml.',colors:['#7B4B3A','#C8B27E','#3A4E48','#9E9EAF'],label:'HAND OIL'},
 {id:'x1',type:'box',name:'Gift Set',price:'$58.00',desc:'One candle, one mist and a matchbox in a rigid box.',colors:['#22262E','#C9B59A','#7D8F7A','#8E4E3E'],label:'GIFT SET'},
 {id:'m1',type:'mug',name:'Stoneware Mug',price:'$28.00',desc:'Hand-thrown, 300 ml, speckled glaze.',colors:['#E8E2D6','#5C6B73','#A0644E','#2F3530'],label:'HOLLOW OAK'},
 {id:'p1',type:'print',name:'Oak Leaf Print',price:'$40.00',desc:'A3 giclée print on cotton paper.',colors:['#C98B5B','#7A8F6A','#3E4C66','#D8C9A9'],label:'OAK'},
 {id:'p2',type:'print',name:'Shoreline Print',price:'$40.00',desc:'A3 giclée print on cotton paper.',colors:['#6F94A6','#D2B48C','#45584A','#B5747A'],label:'SHORE'}
];
const state={}; CATALOG.forEach(p=>state[p.id]={color:p.colors[0],label:p.label});

/* ---------- templates ---------- */
const TEMPLATES=[
 {id:'gallery',name:'Gallery',dot:'#E9E6E0',sw:['#F1EFEA','#C9B79C','#2B2B2B'],tag:'White walls, oak floor, spotlights. Products hang as prints or stand on plinths.',best:'Best for art, prints, ceramics'},
 {id:'apothecary',name:'Apothecary',dot:'#2F4A3C',sw:['#2F4A3C','#8C6A43','#D9B56A'],tag:'Deep green walls, wooden shelves and brass lamps. A small, warm shop.',best:'Best for candles, beauty, home scents'},
 {id:'stage',name:'Stage',dot:'#B4AAFF',sw:['#07060A','#B4AAFF','#3A2F55'],tag:'A dark stage with lit plinths and glowing rings, one product per light.',best:'Best for launches and hero products'},
 {id:'loft',name:'Pop-up Loft',dot:'#9AA3AB',sw:['#B9BEC2','#5E6670','#F2A65A'],tag:'Concrete loft with long tables, window light and a neon sign.',best:'Best for makers, merch, markets'}
];


  /* your Figma labels go on the labelled products, A, B, C, A, … */
  const loader = new THREE.TextureLoader();
  const figmaTex = VERSIONS.filter((v) => v.label).map((v) => { const t = loader.load(v.label.src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
  let nextLabel = 0;
  const nextFigmaLabel = () => (figmaTex.length ? figmaTex[nextLabel++ % figmaTex.length] : null);

  function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData={c,draw};return t;}
function redraw(t,draw){const c=t.userData.c,g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);draw(g,c.width,c.height);t.needsUpdate=true;}
const labelDraw=(text,bg,ink)=>(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=ink;g.globalAlpha=.5;g.lineWidth=3;g.strokeRect(w*.32,h*.12,w*.36,h*.76);g.globalAlpha=1;g.fillStyle=ink;g.textAlign='center';g.font='600 '+(h*.13)+'px "DM Sans", sans-serif';g.fillText(BRAND.toUpperCase(),w/2,h*.34);g.font='800 '+(h*.2)+'px Syne, sans-serif';fitText(g,text,w/2,h*.62,w*.34);g.font='400 '+(h*.1)+'px "IBM Plex Mono", monospace';g.fillText('HANDMADE',w/2,h*.8);};
function fitText(g,text,x,y,max){let s=parseFloat(g.font.split(' ')[1]);while(g.measureText(text).width>max&&s>8){s-=2;g.font=g.font.replace(/\d+(\.\d+)?px/,s+'px');}g.fillText(text,x,y);}
const artDraw=(seed,col,label)=>(g,w,h)=>{g.fillStyle='#F3EFE6';g.fillRect(0,0,w,h);const r=mulberry(seed);g.fillStyle=col;for(let i=0;i<5;i++){g.globalAlpha=.25+r()*.6;g.beginPath();g.ellipse(w*(.25+r()*.5),h*(.25+r()*.5),w*(.12+r()*.22),h*(.06+r()*.2),r()*3,0,7);g.fill();}g.globalAlpha=1;g.fillStyle='#2b2b2b';g.font='600 '+(h*.05)+'px "DM Sans", sans-serif';g.textAlign='center';g.fillText(label+' · '+BRAND,w/2,h*.93);};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function gradTex(inner,outer){return canvasTex(256,256,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,inner);gr.addColorStop(.55,inner);gr.addColorStop(.72,outer);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});}
function woodTex(base,line){return canvasTex(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const r=mulberry(7);for(let i=0;i<60;i++){g.strokeStyle=line;g.globalAlpha=.05+r()*.12;g.lineWidth=1+r()*3;g.beginPath();const y=r()*h;g.moveTo(0,y);g.bezierCurveTo(w*.3,y+r()*20-10,w*.6,y+r()*20-10,w,y+r()*16-8);g.stroke();}for(let i=1;i<6;i++){g.globalAlpha=.18;g.fillStyle='#000';g.fillRect(0,i*h/6,w,2);}});}
function noiseTex(base,amt){return canvasTex(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const r=mulberry(3);for(let i=0;i<9000;i++){g.globalAlpha=r()*amt;g.fillStyle=r()>.5?'#fff':'#000';g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}});}

/* ---------- products ---------- */
function std(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.6,metalness:0},o||{}));}
function makeProduct(p){
    const s=state[p.id], g=new THREE.Group(); g.userData.pid=p.id; const recol=[]; let labelTex=null;
  const lt=()=>{const f=nextFigmaLabel();labelTex=f||canvasTex(512,256,labelDraw(s.label,'#F4F0E8','#2A2A2A'));return labelTex;};
  if(p.type==='candle'){
    const glass=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.26,48,1,true),new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.08,metalness:0,transparent:true,opacity:.28,side:THREE.DoubleSide}));glass.position.y=.13;
    const wax=new THREE.Mesh(new THREE.CylinderGeometry(.122,.122,.2,48),std(s.color,{roughness:.85}));wax.position.y=.1;recol.push(wax.material);
    lt();const label=new THREE.Mesh(new THREE.CylinderGeometry(.1315,.1315,.11,48,1,true,-.9,1.8),std('#fff',{map:labelTex,roughness:.7}));label.position.y=.12;
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(.135,.135,.03,48),std('#B08D57',{metalness:.7,roughness:.35}));lid.position.y=.275;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.01,48),std('#333'));base.position.y=.005;
    g.add(glass,wax,label,lid,base);
  } else if(p.type==='bottle'){
    const pts=[[0,0],[.075,0],[.08,.01],[.08,.2],[.07,.24],[.03,.27],[.026,.3],[0,.3]].map(a=>new THREE.Vector2(a[0],a[1]));
    const body=new THREE.Mesh(new THREE.LatheGeometry(pts,48),new THREE.MeshPhysicalMaterial({color:s.color,roughness:.15,metalness:0,clearcoat:1,clearcoatRoughness:.05}));recol.push(body.material);
    lt();const label=new THREE.Mesh(new THREE.CylinderGeometry(.0815,.0815,.1,48,1,true,-.8,1.6),std('#fff',{map:labelTex}));label.position.y=.11;
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.07,32),std('#1E1E1E',{roughness:.4}));cap.position.y=.33;
    g.add(body,label,cap);
  } else if(p.type==='box'){
    lt();const side=std(s.color,{roughness:.5});recol.push(side);const front=std('#fff',{map:labelTex});
    const box=new THREE.Mesh(new THREE.BoxGeometry(.42,.2,.3),[side,side,side,side,front,side]);box.position.y=.1;
    const ribbon=new THREE.Mesh(new THREE.BoxGeometry(.43,.205,.03),std('#C9A86A',{metalness:.3,roughness:.4}));ribbon.position.y=.1;
    g.add(box,ribbon);
  } else if(p.type==='mug'){
    const m=std(s.color,{roughness:.45});recol.push(m);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.1,.09,.2,48,1,true),m);cup.position.y=.1;cup.material.side=THREE.DoubleSide;
    const bottom=new THREE.Mesh(new THREE.CircleGeometry(.09,32),m);bottom.rotation.x=-Math.PI/2;bottom.position.y=.002;
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,12,32,Math.PI),m);handle.position.set(.1,.1,0);handle.rotation.z=-Math.PI/2;
    lt();const band=new THREE.Mesh(new THREE.CylinderGeometry(.0985,.0965,.07,48,1,true,-.7,1.4),std('#fff',{map:labelTex,transparent:true}));band.position.y=.1;
    g.add(cup,bottom,handle,band);
  } else if(p.type==='print'){
    const art=canvasTex(512,700,artDraw(p.id.charCodeAt(1)*31,s.color,s.label));labelTex=art;
    const frame=new THREE.Mesh(new THREE.BoxGeometry(.62,.82,.035),std('#2A2622',{roughness:.5}));
    const pic=new THREE.Mesh(new THREE.PlaneGeometry(.52,.72),std('#fff',{map:art,roughness:.9}));pic.position.z=.019;
    g.add(frame,pic);g.userData.print=true;
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.pid=p.id;}});
  g.userData.recol=recol; g.userData.labelTex=labelTex; g.userData.type=p.type;
  return g;
}
/* ---------- room helpers ---------- */
function room(w,d,h,wallMat,floorMat,ceil){const g=new THREE.Group();
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,d),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);
  const mk=(W,H,x,z,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(W,H),wallMat);m.position.set(x,H/2,z);m.rotation.y=ry;m.receiveShadow=true;g.add(m);};
  mk(w,h,0,-d/2,0);mk(d,h,-w/2,0,Math.PI/2);mk(d,h,w/2,0,-Math.PI/2);
  if(ceil){const c=new THREE.Mesh(new THREE.PlaneGeometry(w,d),ceil);c.rotation.x=Math.PI/2;c.position.y=h;g.add(c);}
  return g;}
function plinth(x,z,h,mat,r){const m=r?new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat):new THREE.Mesh(new THREE.BoxGeometry(.42,h,.42),mat);m.position.set(x,h/2,z);m.castShadow=m.receiveShadow=true;return m;}
function spot(x,y,z,tx,ty,tz,col,int,ang){const s=new THREE.SpotLight(col,int,12,ang||.45,.55,1.4);s.position.set(x,y,z);s.target.position.set(tx,ty,tz);s.castShadow=true;s.shadow.mapSize.set(1024,1024);s.shadow.bias=-.0005;return [s,s.target];}
function place(id,x,y,z,ry){const p=CATALOG.find(c=>c.id===id);const g=makeProduct(p);g.position.set(x,y,z);g.rotation.y=ry||0;scene.add(g);pickables.push(g);return g;}

/* ---------- the four templates ---------- */
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
    anim.push(t=>{ring.material.opacity=.65+.3*Math.sin(t*1.6+i);if(!reduce)g.rotation.y+= .003;});
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

function dispose(o){o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}

  BUILD[roomId]();

  /* the featured stand: your Figma product at real size (1 mm = 0.001 m), versions side by side */
  const R = ROOMS.find((r) => r.id === roomId);
  const stand = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.8, 64), new THREE.MeshStandardMaterial({ color: "#2a2733", roughness: 0.4, metalness: 0.15 }));
  top.position.y = 0.4; top.castShadow = top.receiveShadow = true; stand.add(top);
  const MM = 0.0018; // a touch larger than life so it reads at shop distance
  VERSIONS.forEach((ver, i) => {
    const g = new THREE.Group();
    g.position.set((i - (VERSIONS.length - 1) / 2) * 0.17, 0.8, 0);
    for (const part of ver.parts) {
      const geo = new THREE.LatheGeometry(part.rh.map(([r, h]) => new THREE.Vector2(r * MM, h * MM)), 96);
      const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: part.color, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
      m.castShadow = true; g.add(m);
    }
    if (ver.label) {
      const L = ver.label, tex = loader.load(L.src);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(L.r * MM, L.r * MM, (L.b1 - L.b0) * MM, 128, 1, true, -L.angle / 2, L.angle),
        new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.2, side: THREE.DoubleSide })
      );
      sleeve.position.y = ((L.b0 + L.b1) / 2) * MM;
      g.add(sleeve);
    }
    stand.add(g);
  });
  stand.position.set(R.stand[0], 0, R.stand[1]);
  stand.lookAt(camera.position.x, 0, camera.position.z);
  scene.add(stand);
  const sp = new THREE.SpotLight("#fff6ea", 3, 8, 0.38, 0.5, 1.2);
  sp.position.set(R.stand[0], 3.2, R.stand[1] + 1.2); sp.target.position.set(R.stand[0], 1, R.stand[1]); sp.castShadow = true;
  scene.add(sp, sp.target);

  /* the rooms were lit for older three.js; brighten punctual lights for today's physically based lighting */
  scene.traverse((o) => {
    if (o.isPointLight || o.isSpotLight) { o.intensity *= Math.PI; o.decay = 0; }
    else if (o.isLight) o.intensity *= Math.PI;
  });
  const nameOf = (g) => (CATALOG.find((p) => p.id === g.userData.pid) || {}).name || "";
  return { anim, pickables, nameOf };
}

export default function StoreRooms3D() {
  const ref = useRef(null);
  const ctx = useRef(null);
  const [room, setRoom] = useState("apothecary");
  const [ask, setAsk] = useState("");
  const [reply, setReply] = useState("Ask the shopkeeper for anything on the shelves.");

  useEffect(() => {
    const el = ref.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 0.6; controls.maxDistance = 9; controls.enablePan = false;
    ctx.current = { renderer, camera, controls, scene: null, anim: [] };

    const fit = () => {
      const w = el.clientWidth || 600, h = el.clientHeight || 400;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(fit); ro.observe(el); fit();
    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = ctx.current, t = clock.getElapsedTime();
      c.anim.forEach((f) => f(t)); const dt = Math.min(0.05, t - (c.lastT ?? t)); c.lastT = t; if (c.keeper) c.keeper.update(dt); controls.update();
      if (c.scene) renderer.render(c.scene, camera);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => {
    const c = ctx.current; if (!c) return;
    if (c.scene) c.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
    const scene = new THREE.Scene();
    const built = buildRoom(room, scene, c.camera, c.controls);
    c.anim = built.anim;
    if (c.keeper) c.keeper.dispose();
    c.keeper = createShopAssistant({ scene, camera: c.camera, dom: c.renderer.domElement, pickables: built.pickables, nameOf: built.nameOf, home: ROOMS.find((r) => r.id === room).keeper });
    c.controls.update();
    c.scene = scene;
  }, [room]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 420, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ROOMS.map((r) => (
          <button key={r.id} onClick={() => setRoom(r.id)}
            style={{ font: "inherit", fontSize: 13, padding: "7px 13px", borderRadius: 999, cursor: "pointer",
              border: "1px solid rgba(255,255,255,.25)", background: r.id === room ? "#b4aaff" : "rgba(11,11,16,.65)", color: r.id === room ? "#0b0b10" : "#fff" }}>
            {r.name}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (ctx.current?.keeper) setReply(ctx.current.keeper.instruct(ask)); setAsk(""); }}
        style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder='Try "bring me a candle" or "show me the hand oil"'
          style={{ flex: "1 1 260px", font: "inherit", fontSize: 14, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.3)", background: "rgba(11,11,16,.7)", color: "#fff" }} />
        <button type="submit" style={{ font: "inherit", fontSize: 14, padding: "10px 14px", borderRadius: 10, border: 0, background: "#b4aaff", color: "#0b0b10", cursor: "pointer" }}>Ask</button>
        <span style={{ flexBasis: "100%", color: "#fff", fontSize: 13, textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>{reply}</span>
      </form>
    </div>
  );
}
