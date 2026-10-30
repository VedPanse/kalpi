import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {floorTexture} from './room-finishes.js';
// Real geometry for joinery, reveals and lighting; no image backdrop masquerading as a room.
export function retailInterior(r,layout){
 const scene=r.scene,wall=layout.wallColor,floor=layout.floorColor,shelf=layout.shelfColor||'#8f7660';
 function surface(color,wood=false){const map=floorTexture(wood?'apothecary':'loft',color);map.anisotropy=8;return new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:wood?.006:.009,roughness:wood?.58:.86});}
 const plaster=surface(wall),timber=surface(floor,true),joinery=surface(shelf,true),brass=new T.MeshStandardMaterial({color:'#a58b58',metalness:.85,roughness:.28});
 function box(w,h,d,x,y,z,m,bevel=0){const a=new T.Mesh(bevel?new RoundedBoxGeometry(w,h,d,3,bevel):new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=a.receiveShadow=true;scene.add(a);return a;}
 box(4,.12,4,0,-.06,0,timber);box(4,3,.12,0,1.5,-2,plaster);box(.12,3,4,-2,1.5,0,plaster);box(.12,3,4,2,1.5,0,plaster);box(4,.08,4,0,3.04,0,surface('#e1dfd5'));
 // Floor joints, skirting and recessed wall panels give the room readable scale.
 const seam=new T.MeshStandardMaterial({color:'#443d32',roughness:.9});
 for(let x=-1.8;x<2;x+=.4)box(.004,.002,4,x,.002,0,seam);
 box(4,.09,.035,0,.045,-1.93,joinery);for(const x of [-1.93,1.93])box(.035,.09,4,x,.045,0,joinery);
 box(3.5,1.9,.07,0,1.8,-1.91,joinery,.025);box(3.36,1.72,.025,0,1.81,-1.86,plaster,.015);
 // Counter under the existing product shelf; five originals remain the only stock.
 box(3.18,1.03,.57,0,.515,-.7,joinery,.025);
 for(let x=-1.52;x<1.55;x+=.06)box(.022,.92,.018,x,.55,-.408,joinery,.006);
 box(3.1,.045,.5,0,.045,-.7,brass);
 const glow=new T.MeshStandardMaterial({color:'#fff4dd',emissive:'#ffe1ad',emissiveIntensity:2});
 box(3.28,.014,.018,0,2.64,-1.8,glow);
 // Frosted side window with proper frame depth.
 const pane=new T.MeshStandardMaterial({color:'#ebf0e9',emissive:'#d9e7eb',emissiveIntensity:.45,roughness:.45});
 box(.035,1.8,1.65,-1.91,1.85,.65,pane);
 for(const z of [-.2,.65,1.5])box(.07,1.9,.035,-1.86,1.85,z,joinery);
 box(.07,.035,1.75,-1.86,1.85,.65,joinery);
 for(const x of [-1.1,0,1.1]){
  const spot=new T.SpotLight(layout.lighting==='cool'?'#dae8ff':layout.lighting==='warm'?'#ffe2b7':'#fff7e9',9,5,.55,.7,2);spot.position.set(x,2.86,.15);spot.target.position.set(x,1.25,-.7);scene.add(spot,spot.target);
  const housing=new T.Mesh(new T.CylinderGeometry(.065,.065,.09,32),brass);housing.position.copy(spot.position);scene.add(housing);
 }
 const daylight=new T.DirectionalLight('#f0f3ff',1.8);daylight.position.set(-3,3,1);daylight.target.position.set(1,0,-1);daylight.castShadow=true;daylight.shadow.mapSize.set(1024,1024);Object.assign(daylight.shadow.camera,{left:-3,right:3,top:3,bottom:-3});daylight.shadow.normalBias=.004;scene.add(daylight,daylight.target);
 scene.environmentIntensity=.45;
}
