// Ioanna's GrazaRooms3D photo-projected lathe, kept at nominal metres.
import * as T from 'three';
import {appURL} from './runtime.js';
export async function photoModel(base){
 const texture=await new T.TextureLoader().loadAsync(appURL('/models/ioanna/'+base.tex));texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const g=new T.Group();
 if(base.kind==='lathe'){
  const geo=new T.LatheGeometry(base.profile.map(([r,h])=>new T.Vector2(Math.max(r,.01)*.001,h*.001)),40),pos=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++){const x=pos.getZ(i)<0?-pos.getX(i):pos.getX(i);uv.setXY(i,base.axisU+x/(base.widthMM*.001),pos.getY(i)/(base.heightMM*.001));}
  uv.needsUpdate=true;geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,new T.MeshPhysicalMaterial({map:texture,roughness:.38,clearcoat:.4,side:T.DoubleSide,alphaTest:.5}));mesh.name='Body';g.add(mesh);
 }else{
  const w=base.widthMM*.001,h=base.heightMM*.001,d=w*(base.kind==='box'?.75:.18);
  const side=new T.MeshStandardMaterial({color:'#d9d3c7',roughness:.7}),face=new T.MeshPhysicalMaterial({map:texture,roughness:.45,clearcoat:base.kind==='flat'?.5:0,alphaTest:.5});
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),[side,side,side,side,face,face]);mesh.name='Body';mesh.position.y=h/2;g.add(mesh);
 }
 return g;
}
