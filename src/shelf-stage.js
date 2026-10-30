import {retailInterior} from './retail-interior.js';
import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {SHELF_PRESETS} from '../shared/shelf-presets.js';
export function buildShelfStage(r,layout){
 const base=SHELF_PRESETS.find(p=>p.id===layout.palette)||SHELF_PRESETS[0],p={...base,background:layout.wallColor||base.background,shelf:layout.shelfColor||layout.floorColor||base.shelf},scene=r.scene;
 scene.fog=null;scene.background=new T.Color(p.background);scene.environmentIntensity=.65;
 r.key.intensity=2;r.key.position.set(-2,4,2);r.key.shadow.camera.left=-3;r.key.shadow.camera.right=3;r.key.shadow.camera.top=3;r.key.shadow.camera.bottom=-3;r.key.shadow.camera.updateProjectionMatrix();
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(256,170,0,256,170,370);g.addColorStop(0,p.shelf);g.addColorStop(1,p.background);ctx.fillStyle=g;ctx.fillRect(0,0,512,512);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const bg=new T.Mesh(new T.PlaneGeometry(12,8),new T.MeshBasicMaterial({map}));bg.position.set(0,2,-2);if(layout.presentation!=="boutique")scene.add(bg);else {map.dispose();bg.geometry.dispose();bg.material.dispose();}
 const shelf=new T.Mesh(new T.BoxGeometry(3.3,.07,.65),new T.MeshStandardMaterial({color:p.shelf,roughness:.24,metalness:.3}));shelf.position.set(0,1.08,-.7);shelf.castShadow=shelf.receiveShadow=true;scene.add(shelf);
 const reflection=new Reflector(new T.PlaneGeometry(3.3,.65),{color:p.shelf,textureWidth:768,textureHeight:384,clipBias:.003});reflection.rotation.x=-Math.PI/2;reflection.position.set(0,1.116,-.7);scene.add(reflection);
 const rim=new T.DirectionalLight(p.accent,2);rim.position.set(1,3,-1.5);scene.add(rim);
 const ring=new T.Mesh(new T.RingGeometry(.16,.166,80),new T.MeshBasicMaterial({color:p.accent,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 if(layout.presentation==='boutique')retailInterior(r,layout);
 return {select(placement){ring.position.set(placement.x,1.123,placement.z);ring.visible=true;},dispose(){reflection.getRenderTarget().dispose();}};
}
