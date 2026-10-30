import * as T from 'three';

// Precision-built demo asset in metres. Separate parts remain material-editable.
export function buildDecoPerfume(root,p,{materialFor,artwork}={}) {
 const {width:w,height:h,depth:d}=p.dimensions;
 const glass=new T.MeshPhysicalMaterial({color:'#fff4e9',transparent:true,opacity:.82,depthWrite:false,transmission:.65,ior:1.52,thickness:d*.18,roughness:.035,metalness:0,attenuationColor:'#e9bc95',attenuationDistance:.3,dispersion:.018});
 const liquid=new T.MeshPhysicalMaterial({color:'#edc09c',transparent:true,opacity:.6,depthWrite:false,transmission:.75,ior:1.36,thickness:d*.5,roughness:.06,attenuationColor:'#e5a46d',attenuationDistance:.16});
 const gold=new T.MeshPhysicalMaterial({color:'#d9b974',metalness:1,roughness:.2,clearcoat:.28,clearcoatRoughness:.12});
 if(p.material?.color&&p.material.color!=='#ffffff')glass.color.multiply(new T.Color(p.material.color));
 const darkGold=new T.MeshPhysicalMaterial({color:'#80602c',metalness:1,roughness:.28});
 function add(geometry,material,name,part='Body',x=0,y=0,z=0){const m=new T.Mesh(geometry,(p.parts?.[part]||(part==='Body'&&p.material?.type&&p.material.type!=='satin'))&&materialFor?materialFor(p,part):material);m.name=name;m.userData.editPart=part;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
 // A clipped octagon gives real plane changes and narrow bevel highlights.
 function vessel(width,depth,bottom,top,lower=.72,upper=1,mat=glass,name='Cut crystal vessel',part='Body'){
  const corners=[[-.5,-.33],[-.33,-.5],[.33,-.5],[.5,-.33],[.5,.33],[.33,.5],[-.33,.5],[-.5,.33]];
  const levels=[[bottom,lower*.94],[bottom+h*.015,lower],[top-h*.015,upper],[top,upper*.96]];
  const v=[],ix=[];
  for(const [y,s] of levels)for(const [x,z] of corners)v.push(x*width*s,y,z*depth*s);
  for(let l=0;l<3;l++)for(let k=0;k<8;k++){const a=l*8+k,b=l*8+(k+1)%8,c=b+8,e=a+8;ix.push(a,c,b,a,e,c);}
  for(let k=1;k<7;k++){ix.push(0,k,k+1,24,24+k+1,24+k);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ix);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return add(flat,mat,name,part);
 }
 vessel(w*.69,d*.88,h*.025,h*.60,.77,1);
 vessel(w*.53,d*.64,h*.075,h*.50,.79,1,liquid,'Warm amber perfume');
 vessel(w*.68,d*.86,0,h*.055,.82,.84,glass,'Heavy crystal heel');
 // Symmetric stepped wings, not a texture pretending to be fluting.
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const height=h*(.49-i*.055), x=side*w*(.275+i*.072);
  const rib=vessel(w*.105,d*(.79-i*.105),h*.045,height,.56,1,glass,`Crystal wing ${side}:${i}`);rib.position.x=x;
 }
 vessel(w*.30,d*.51,h*.60,h*.635,1,1,gold,'Machined shoulder collar','Cap');
 vessel(w*.24,d*.43,h*.635,h*.665,1,1,darkGold,'Closure seam','Cap');
 vessel(w*.29,d*.48,h*.665,h*.69,1,1,gold,'Gold cap foot','Cap');
 for(let i=-2;i<=2;i++){
  const top=h*(1-Math.abs(i)*.035),x=i*w*.061;
  const fin=vessel(w*.062,d*(.36-Math.abs(i)*.025),h*.69,top,.78,1,gold,`Stepped crown flute ${i}`,'Cap');fin.position.x=x;
 }
 // Recessed front cartouche with small etched lettering, not an opaque paper sticker.
 if(!artwork){
 const plate=add(new T.BoxGeometry(w*.24,h*.115,.00035),gold,'Gold cartouche','Label',0,h*.35,d*.441);
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');ctx.clearRect(0,0,1024,512);ctx.fillStyle='#3d2b15';ctx.textAlign='center';ctx.font='106px Georgia';ctx.fillText('S O L A',512,245);ctx.font='36px sans-serif';ctx.fillText('EXTRAIT · 01',512,350);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  add(new T.PlaneGeometry(w*.22,h*.105),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),'Etched signature','Label',0,plate.position.y,plate.position.z+.0002);
 }
 } else {
  add(new T.PlaneGeometry(w*p.label.width,h*p.label.height),new T.MeshStandardMaterial({map:artwork,roughness:.55,side:T.DoubleSide}),'Illustrated label','Label',0,h*p.label.y,d*.445+.0003);
 }
 const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());
 const group=new T.Group();for(const child of [...root.children])group.add(child);group.scale.set(w/size.x,h/size.y,d/size.z);root.add(group);
 root.userData.modelLoaded=true;
}
