import {ioannaLayout} from './retail-layout.js';
import {validateLayout} from './product.js';
// Preserve the merchant's room and existing placements. Repeating a handoff is idempotent.
export function addVersionToShop(current,versionId,product,documents={}) {
 const l=structuredClone(current);
 if(l.placements.some(p=>p.versionId===versionId))return l;
 const {width:w,depth:d,height:h}=product.dimensions;
 if(!l.placements.length&&!l.fixtures.length){Object.assign(l,ioannaLayout([versionId],'gallery'));l.placements=[];}
 const free=(x,z)=>l.placements.every(p=>{const dim=documents[p.versionId]?.dimensions||{width:.4,depth:.4};return Math.abs(x-p.x)>(w+dim.width)/2+.08||Math.abs(z-p.z)>(d+dim.depth)/2+.08;});
 if(Math.max(w,d)<=1.2&&h<1.2){
  for(const f of l.fixtures.filter(f=>f.kind!=='cabinet'&&Math.abs(f.rotation)<.01&&f.height<1.5&&f.width>=w+.04&&f.depth>=d+.04)){
   for(let x=f.x-f.width/2+w/2+.02;x<=f.x+f.width/2-w/2-.02+.001;x+=w+.12){
    if(free(x,f.z)){l.placements.push({id:'placed-'+versionId,versionId,x,y:f.height,z:f.z,rotation:0});return validateLayout(l);}
   }
  }
 }
 // Place larger objects on the floor, or add a correctly sized plinth for small objects.
 const candidates=[];
 for(let z=-l.depth/2+d/2+.5;z<l.depth/2-d/2-.5;z+=Math.max(.6,d+.3))for(let x=-l.width/2+w/2+.5;x<l.width/2-w/2-.5;x+=Math.max(.6,w+.3))candidates.push({x,z});
 candidates.sort((a,b)=>(a.x*a.x+(a.z-1.5)**2)-(b.x*b.x+(b.z-1.5)**2));
 for(const {x,z} of candidates){
  if(!free(x,z)||l.fixtures.some(f=>Math.abs(x-f.x)<(w+f.width)/2+.2&&Math.abs(z-f.z)<(d+f.depth)/2+.2))continue;
  const small=w<=1.2&&d<=1.2&&h<1.2;
  if(small)l.fixtures.push({id:'plinth-'+versionId,x,z,width:Math.max(.4,w+.12),depth:Math.max(.4,d+.12),height:.9,rotation:0,kind:'table'});
  l.placements.push({id:'placed-'+versionId,versionId,x,y:small?.9:0,z,rotation:0});return validateLayout(l);
 }
 throw Error('This shop has no free display space. Enlarge the room or remove a display, then send this saved model again.');
}
