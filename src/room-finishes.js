// Adapted from Ioanna's make-app/src/StoreRooms3D.jsx (origin/ioanna 9122831).
// Keeps her palettes and seeded wood/noise recipes; dimensions and products remain live Kalpi state.
import * as T from 'three';
export const ROOM_STYLES=['gallery','apothecary','stage','loft'];
export function roomPalette(style){return {
 gallery:{wall:'#F1EFEA',floor:'#C9B79C',accent:'#2B2B2B'},
 apothecary:{wall:'#2F4A3C',floor:'#8C6A43',accent:'#D9B56A'},
 stage:{wall:'#100e18',floor:'#211c30',accent:'#B4AAFF'},
 loft:{wall:'#B9BEC2',floor:'#5E6670',accent:'#F2A65A'},
}[style]||roomPalette('gallery');}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function floorTexture(style,color){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),r=mulberry(7);g.fillStyle=color;g.fillRect(0,0,512,512);
 if(['gallery','apothecary'].includes(style)){for(let i=0;i<70;i++){g.strokeStyle='#362719';g.globalAlpha=.04+r()*.1;g.lineWidth=1+r()*2;const y=r()*512;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(160,y+r()*12,340,y-r()*12,512,y+r()*10);g.stroke();}for(let i=1;i<6;i++){g.globalAlpha=.2;g.fillStyle='#352718';g.fillRect(0,i*512/6,512,1);}}
 else for(let i=0;i<7000;i++){g.globalAlpha=r()*.07;g.fillStyle=r()>.5?'#fff':'#000';g.fillRect(r()*512,r()*512,2,2);}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(4,4);return tex;}
export function decorateRoom(scene,layout,box){const style=layout.style||'gallery',p=roomPalette(style),w=layout.width,d=layout.depth,h=layout.height;
 // Recessed wall panels and a continuous skirting line give the room human scale.
 box(w,.12,.06,0,.06,-d/2+.09,p.accent);
 for(const side of [-1,1])box(.06,.12,d,side*(w/2-.09),.06,0,p.accent);
 for(let x=-w/2+1;x<w/2-1;x+=2){
  box(.035,h*.62,.025,x,h*.43,-d/2+.09,p.accent);
 }
 const track=box(w*.72,.04,.05,0,h-.15,-d*.15,p.accent);track.castShadow=false;
 for(const x of [-w*.25,0,w*.25]){
  const spot=new T.SpotLight(style==='stage'?0xc4b4ff:0xffedce,style==='stage'?28:18,Math.max(w,d),.65,.8,1.6);spot.position.set(x,h-.2,-d*.15);spot.target.position.set(x,0,-d*.2);scene.add(spot,spot.target);
  const lamp=new T.Mesh(new T.CylinderGeometry(.06,.075,.14,16),new T.MeshStandardMaterial({color:p.accent,metalness:.55,roughness:.3}));lamp.position.copy(spot.position);lamp.rotation.z=.22;scene.add(lamp);
 }
}
