import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createRenderer} from './render.js';
import {productModel} from './geometry.js';
import {libraryProduct} from '../shared/library-product.js';
import {floorTexture} from './room-finishes.js';
const concepts=[
 {name:'Stone atelier',note:'Honed travertine · oak joinery · soft afternoon light',wall:'#d8cfba',floor:'#b9af99',wood:'#947452',stone:'#e1d7c0',metal:'#a88c55',light:'#fff0d5'},
 {name:'Walnut salon',note:'Smoked walnut · bronze details · intimate pools of light',wall:'#575747',floor:'#655344',wood:'#503827',stone:'#ada18a',metal:'#ac8852',light:'#ffdab0'},
 {name:'Quiet gallery',note:'Limewash · brushed aluminium · diffuse daylight',wall:'#d8ddd8',floor:'#b6bab5',wood:'#c4c4ba',stone:'#e3e4dd',metal:'#a3aaa8',light:'#f2f7ff'}
];
const ids=['perfume-parts','bottle-parts','candle-parts','lipstick-parts','perfume-deco'];
let view,controls,mode=0;
const el=document.querySelector('#scene');
function material(color,roughness=.6,metalness=0){return new T.MeshStandardMaterial({color,roughness,metalness});}
function textured(color,wood=false){const map=floorTexture(wood?'apothecary':'loft',color);map.repeat.set(wood?2:3,wood?2:3);return new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:wood?.006:.012,roughness:wood?.52:.82});}
function build(index){
 controls?.dispose();view?.dispose();mode=index;
 const p=concepts[index],r=createRenderer(el,{preserveShadows:true});view=r;
 r.scene.background=new T.Color(p.wall);r.scene.environmentIntensity=index===1?.3:.55;r.renderer.toneMappingExposure=.85;
 r.camera.fov=48;r.camera.updateProjectionMatrix();r.camera.position.set(2.5,1.95,3.1);
 controls=new OrbitControls(r.camera,r.renderer.domElement);controls.target.set(0,1.2,-.6);controls.enableDamping=true;controls.minDistance=1.1;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.49;
 r.update=()=>controls.update();
 const plaster=textured(p.wall),stone=textured(p.stone),wood=textured(p.wood,true),metal=material(p.metal,.3,.8),dark=material('#292b25');
 function box(w,h,d,x,y,z,mat,round=0){const mesh=new T.Mesh(round?new RoundedBoxGeometry(w,h,d,3,round):new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;r.scene.add(mesh);return mesh;}
 box(7,.16,7,0,-.08,0,textured(p.floor,index===1));
 box(7,3.6,.16,0,1.8,-3.5,plaster);box(.16,3.6,7,-3.5,1.8,0,plaster);box(.16,3.6,7,3.5,1.8,0,plaster);
 box(7,.12,7,0,3.65,0,material(p.stone));
 // Quiet construction details: joints, skirting and window mullions.
 for(let x=-3.5;x<=3.5;x+=1.16)box(.008,.002,7,x,.004,0,material(p.floor).clone());
 box(7,.10,.025,0,.05,-3.39,wood);
 for(const x of [-3.39,3.39])box(.025,.10,7,x,.05,0,wood);
 const windowMat=new T.MeshStandardMaterial({color:'#f9f4e8',emissive:'#fff5df',emissiveIntensity:.65,roughness:1});
 box(.025,2.55,3.7,-3.40,1.95,.25,windowMat);
 for(const z of [-1.6,.25,2.1])box(.08,2.65,.045,-3.34,1.95,z,wood);
 box(.1,.065,3.8,-3.34,1.95,.25,wood);
 const sun=new T.DirectionalLight(p.light,index===1?1.5:3);sun.position.set(-3,4,2);sun.target.position.set(1,0,-2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:15});sun.shadow.normalBias=.008;sun.shadow.bias=-.0001;r.scene.add(sun,sun.target);r.key.intensity=.25;
 // Built-in display niche, each product appears once.
 box(5.45,2.35,.18,0,1.65,-3.25,wood,.025);
 box(5.18,1.75,.12,0,1.85,-3.12,plaster);
 box(5.5,.65,.62,0,.325,-2.98,wood,.025);
 for(let x=-2.6;x<2.7;x+=.52)box(.012,.53,.015,x,.32,-2.66,metal);
 box(5.5,.055,.65,0,.68,-2.95,stone,.015);
 box(5.2,.045,.48,0,1.18,-2.94,stone,.01);
 const strip=material('#fff0cf');strip.emissive=new T.Color(p.light);strip.emissiveIntensity=2;
 box(5.1,.018,.025,0,2.67,-2.94,strip);
 for(let i=0;i<5;i++){
  const x=(i-2)*.94,y=1.2;
  box(.42,.035,.36,x,y,-2.87,stone,.014);
  const model=productModel(libraryProduct(ids[i]));model.position.set(x,y+.018,-2.87);r.scene.add(model);
  model.userData.ready?.catch(()=>document.querySelector('#status').textContent='Some product assets could not load.');
  const spot=new T.SpotLight(p.light,6,4,.36,.65,2);spot.position.set(x,2.62,-2.65);spot.target.position.set(x,1.25,-2.87);r.scene.add(spot,spot.target);
 }
 // Sculpted central consultation island.
 if(index===1){
  const base=new T.Mesh(new T.CylinderGeometry(.78,.78,.86,96),wood);base.position.set(0,.43,-.25);base.castShadow=base.receiveShadow=true;r.scene.add(base);
  const top=new T.Mesh(new T.CylinderGeometry(.84,.84,.09,96),stone);top.position.set(0,.905,-.25);top.castShadow=top.receiveShadow=true;r.scene.add(top);
  for(let i=0;i<72;i++){const angle=i*Math.PI*2/72;const rib=box(.026,.73,.03,Math.sin(angle)*.79,.43,-.25+Math.cos(angle)*.79,wood,.008);rib.rotation.y=angle;}
 }else if(index===2){
  for(const [x,z,h] of [[-.85,-.3,.75],[0,-.65,.95],[.85,-.3,.6]])box(.65,h,.65,x,h/2,z,stone,.018);
 }else{
  box(2.6,.86,1.05,0,.43,-.25,wood,.075);
  box(2.72,.11,1.15,0,.915,-.25,stone,.055);
  for(let x=-1.2;x<1.23;x+=.065)box(.025,.74,.018,x,.44,.28,wood,.008);
  box(2.3,.06,.9,0,.04,-.25,metal);
 }
 // Low bench, linen upholstery and suspended lighting.
 box(.7,.40,1.7,2.7,.2,.25,wood,.04);box(.72,.12,1.72,2.7,.46,.25,textured(index===1?'#9f967e':'#d8cbb6'),.045);
 for(const x of [-.85,.85]){
  box(.012,.65,.012,x,3.25,-.25,dark);
  const pendant=new T.Mesh(new T.CylinderGeometry(.24,.24,.13,64),metal);pendant.position.set(x,2.88,-.25);r.scene.add(pendant);
  const glow=new T.Mesh(new T.CircleGeometry(.215,48),new T.MeshBasicMaterial({color:p.light,side:T.DoubleSide}));glow.rotation.x=Math.PI/2;glow.position.set(x,2.81,-.25);r.scene.add(glow);
  const light=new T.PointLight(p.light,8,4,2);light.position.set(x,2.73,-.25);r.scene.add(light);
 }
 // Discreet engraved-style signage, no billboards.
 const c=document.createElement('canvas');c.width=1024;c.height=180;const ctx=c.getContext('2d');ctx.fillStyle=index===1?'#e5d9bd':'#47483e';ctx.textAlign='center';ctx.font='60px Georgia';ctx.fillText('S O L A',512,100);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(1.35,.24),new T.MeshBasicMaterial({map:tex,transparent:true}));sign.position.set(0,3.05,-3.4);r.scene.add(sign);
 document.querySelector('#name').textContent=p.name;document.querySelector('#note').textContent=p.note;document.querySelectorAll('[data-concept]').forEach((b,i)=>b.setAttribute('aria-pressed',i===index));
 document.querySelector('#status').textContent='Drag to look around · Scroll to move closer';
}
document.querySelectorAll('[data-concept]').forEach((b,i)=>b.onclick=()=>build(i));
document.querySelector('#reset').onclick=()=>build(mode);
build(0);
