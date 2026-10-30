import * as T from 'three';
import {detailSurface} from './surface-detail.js';
const supported=new Set(['perfume-parts','bottle-parts','candle-parts','lipstick-parts','perfume-deco']);
export function polishDemoMaterials(model,id){
 if(!supported.has(id))return;
 model.traverse(n=>{if(!n.isMesh)return;for(const m of (Array.isArray(n.material)?n.material:[n.material])){
  const name=(m.name||'').toLowerCase();
  if(m.map)m.map.anisotropy=8;
  if(/powder/.test(name)){m.roughness=.62;if(!m.normalMap)detailSurface(m,'ceramic');}
  if(/bamboo/.test(name)&&typeof document!=='undefined'){
   const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#bda078';g.fillRect(0,0,512,512);
   for(let i=0;i<160;i++){const y=i*3.21;g.strokeStyle=`rgba(85,57,29,${.07+(i%7)*.012})`;g.lineWidth=.5+i%3*.3;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(160,y+Math.sin(i)*3,330,y-2,512,y+1);g.stroke();}
   const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;m.map?.dispose();m.map=tex;m.roughness=.48;
  }
  if(m.transmission>0){m.ior=1.5;m.roughness=Math.min(m.roughness,.055);m.dispersion=.012;}
 }});
}
export function addDemoDetails(root,p){
 const id=p.shape.modelId;if(!supported.has(id))return;
 const {width:w,height:h,depth:d}=p.dimensions;
 const brass=detailSurface(new T.MeshPhysicalMaterial({color:'#b99a5e',metalness:.95,roughness:.24,clearcoat:.2}),'metal');
 function ring(name,y,r,t=.00035){const mesh=new T.Mesh(new T.TorusGeometry(r,t,12,128),brass);mesh.rotation.x=Math.PI/2;mesh.position.y=y;mesh.name=name;mesh.userData.editPart='Cap';root.add(mesh);}
 if(id==='bottle-parts'){ring('Machined base seam',h*.075,w*.465,.00024);ring('Steel closure bead',h*.78,w*.295,.00032);}
 if(id==='candle-parts'){ring('Lid rolled edge',h*.855,w*.475);ring('Lower brass inlay',h*.06,w*.47,.00022);}
 if(id==='lipstick-parts'){ring('Collar engraving bead',h*.49,w*.30,.00012);}
 // A separate, replaceable brand plaque; geometry and artwork export with the mesh.
 if(typeof document==='undefined'||id==='lipstick-parts'||p.label.artwork||p.label.assetId)return;
 const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
 const dark=id==='bottle-parts';g.fillStyle=dark?'#36443c':'#f4ecda';g.fillRect(0,0,1024,512);g.strokeStyle='#b69c64';g.lineWidth=4;g.strokeRect(22,22,980,468);g.fillStyle=dark?'#e8d9b7':'#494437';g.textAlign='center';g.font='86px Georgia';g.fillText(p.label.text||'S O L A',512,210,900);g.font='25px sans-serif';g.fillText(id==='candle-parts'?'ATELIER  /  SCENTED CANDLE':id==='bottle-parts'?'DAILY OBJECTS  /  REUSE':'EAU DE PARFUM  /  COLLECTION 01',512,295);g.font='22px sans-serif';g.fillText('DESIGNED TO STAY',512,373);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const mat=new T.MeshStandardMaterial({map,roughness:.65,metalness:0});
 const labelW=w*(id==='bottle-parts'?.46:.48),labelH=labelW*.5;
 const plaque=new T.Mesh(new T.BoxGeometry(labelW,labelH,.0003),mat);plaque.position.set(0,h*(id==='candle-parts'?.44:.43),d/2-.0002);plaque.name='Demo brand plaque';plaque.userData.editPart='Label';root.add(plaque);
}
