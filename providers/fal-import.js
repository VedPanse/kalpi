import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,simplify,textureCompress,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {put} from '@vercel/blob';
import {withService} from './spacetime.js';
import {validateAsset} from './assets.js';
import {defaultProduct,validateProduct} from '../shared/product.js';
export async function optimizeGeneratedModel(bytes){
 validateAsset(bytes,'model/gltf-binary',100*1024*1024);
 await MeshoptSimplifier.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(new Uint8Array(bytes));
 if(!doc.getRoot().listMeshes().length)throw Error('The generated file has no geometry.');
 for(const m of doc.getRoot().listMaterials()){const spec=m.getExtension('KHR_materials_specular');if(spec)spec.setSpecularColorFactor(spec.getSpecularColorFactor().map(v=>Math.min(1,Math.max(0,v))));}
 await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.5,error:.0003}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:95}),prune());
 return validateAsset(await io.writeBinary(doc),'model/gltf-binary');
}
export async function downloadFalModel(url){
 const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.fal.media')||u.username||u.password)throw Error('Untrusted model download.');
 const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Model download unavailable.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>100*1024*1024)throw Error('Generated model exceeds 100 MB.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks);
}
export async function importFalModel(job){
 const existing=await withService(c=>({asset:[...c.db.myAssets.iter()].find(a=>a.id===job.assetId),design:[...c.db.myDesigns.iter()].find(d=>d.id===job.designId)}));
 if(existing.design)return;
 if(!existing.asset){
  const bytes=await optimizeGeneratedModel(await downloadFalModel(job.providerResult.model_glb.url));
  const blob=await put(`generated/${job.projectId}/${job.assetId}.glb`,bytes,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'model/gltf-binary'});
  await withService(c=>c.reducers.registerAsset({id:job.assetId,projectId:job.projectId,path:blob.pathname,mime:'model/gltf-binary',size:BigInt(bytes.length)}));
 }
 const p=defaultProduct('assembly');p.shape.modelId='asset:'+job.assetId;p.dimensions=job.prepared.dimensions;p.facts.name=job.prepared.name;p.material={type:'satin',color:'#ffffff',roughness:.35,metalness:0};
 p.scale={confirmed:false,source:'AI-estimated from Figma board. Verify physical dimensions before scale-critical use.'};
 p.reconstruction={method:'fal Hunyuan3D Pro PBR',summary:'Generated from the main product image on the board. Unseen surfaces and dimensions are inferred. Original Figma artwork preserved.',confidence:.7};
 p.figma={nodeId:job.boardId,fileUrl:''};
 await withService(c=>c.reducers.createDesign({id:job.designId,projectId:job.projectId,kind:p.kind,document:JSON.stringify(validateProduct(p))}));
}
