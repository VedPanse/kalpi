import {buildDecoPerfume} from './deco-perfume.js';
import {polishDemoMaterials,addDemoDetails} from './demo-polish.js';
import {detailSurface} from './surface-detail.js';
import {photoModel} from './photo-model.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {modelById} from '../shared/model-catalog.js';
import {storage,appURL} from './runtime.js';
const cache=new Map();
async function loadPrivateModel(id){
 const publication=globalThis.location?.pathname.match(/\/(?:store|ar)\/([^/]+)/)?.[1] || new URLSearchParams(globalThis.location?.search||'').get('publication');
 const token=storage.getItem((globalThis.__KALPI_NATIVE_URL__||globalThis.location?.pathname==='/plugin.html')?'kalpi-plugin-token':'kalpi-spacetime-token');
 const response=await fetch(appURL('/api/assets/'+id+(publication?'?publication='+encodeURIComponent(publication):'')),{headers:publication?{}:{Authorization:'Bearer '+token}});
 if(!response.ok)throw Error('Generated model could not be loaded. Sign in or reopen its published store.');
 return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await response.arrayBuffer(), '')).scene;
}
export function loadCatalogModel(id) {
 if(!modelById(id))return Promise.reject(Error('Unknown product model.'));
 if(!cache.has(id))cache.set(id,(modelById(id).assetId?loadPrivateModel(modelById(id).assetId):modelById(id).source==='graza-photo'?photoModel(modelById(id).base):new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(appURL('/models/ioanna/'+modelById(id).file)).then(g=>g.scene)).catch(e=>{cache.delete(id);throw e;}));
 return cache.get(id);
}
export async function populateCatalogModel(root,p,{artwork,materialFor}) {
 if(p.shape.modelId==='perfume-deco'){buildDecoPerfume(root,p,{materialFor,artwork});return;}
 const source=await loadCatalogModel(p.shape.modelId);
 if(root.userData.disposed)return;
 const model=source.clone(true);
 model.traverse(n=>{
  if(!n.isMesh)return;
  n.geometry=n.geometry.clone();
  const name=(n.name||'').toLowerCase(),part=/cap|lid|collar|knob/.test(name)?'Cap':'Body';
  n.userData.originalName=n.name;n.name=part;n.userData.editPart=part;
  const original=Array.isArray(n.material)?n.material:[n.material];
  const materials=original.map(m=>{const c=m.clone();for(const [k,v] of Object.entries(c))if(v?.isTexture)c[k]=v.clone();
   if(p.parts?.[part] || (part==='Body'&&p.material.type!=='satin')){for(const v of Object.values(c))if(v?.isTexture)v.dispose();c.dispose();return materialFor(p,part);}
   if(p.material.roughness!==.35)c.roughness=p.material.roughness;
   if(p.material.metalness!==0)c.metalness=p.material.metalness;
   if(p.material.color!=='#ffffff')c.color.multiply(new T.Color(p.material.color));
   if(modelById(p.shape.modelId).source!=='fal' && !c.normalMap && c.metalness>=.5)detailSurface(c,'metal');
   return c;});
  n.material=materials.length===1?materials[0]:materials;n.castShadow=true;n.receiveShadow=true;
 });
 polishDemoMaterials(model,p.shape.modelId);
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 if([size.x,size.y,size.z].some(v=>!Number.isFinite(v)||v<=0))throw Error('Generated model has invalid bounds.');
 const aligned=new T.Group();model.position.sub(new T.Vector3(center.x,box.min.y,center.z));aligned.add(model);
 aligned.scale.set(p.dimensions.width/size.x,p.dimensions.height/size.y,p.dimensions.depth/size.z);root.add(aligned);
 addDemoDetails(root,p);
 // A replaceable front label is kept separate from the source model and its UVs.
 if(artwork||p.label.assetId){
  const label=new T.Mesh(new T.PlaneGeometry(p.dimensions.width*p.label.width,p.dimensions.height*p.label.height),new T.MeshStandardMaterial({map:artwork,transparent:true,roughness:.65,polygonOffset:true,polygonOffsetFactor:-1}));
  label.name='Label';label.position.set(0,p.dimensions.height*p.label.y,p.dimensions.depth/2+.0005);root.add(label);
 }
 root.userData.modelLoaded=true;
}
