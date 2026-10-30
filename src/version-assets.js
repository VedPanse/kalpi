import * as T from 'three';
import {rows} from './client.js';
import {uploadAsset,artworkUrl} from './assets.js';
import {exportProduct} from './geometry.js';
import {thumbnailProduct} from './render.js';
export async function ensureVersionAssets(v,onProgress=()=>{},formats=["glb","usdz","thumb"]) {
 const p=JSON.parse(v.document);let artwork;
 try{
  if(p.label.assetId){artwork=await new T.TextureLoader().loadAsync(await artworkUrl(p.label.assetId));artwork.colorSpace=T.SRGBColorSpace;}
  for(const [format,mime,name] of [['glb','model/gltf-binary','3D model'],['usdz','model/vnd.usdz+zip','AR model'],['thumb','image/jpeg','Preview']]){
   if(!formats.includes(format))continue;
   const id=v.id+'-'+format;if(rows('myAssets').some(a=>a.id===id))continue;
   onProgress('Preparing '+name.toLowerCase());const data=format==='thumb'?await thumbnailProduct(p,artwork):await exportProduct(p,{format,artwork:artwork?.clone()});
   onProgress('Uploading '+name.toLowerCase()+' · '+(data.byteLength/1048576).toFixed(1)+' MB');await uploadAsset(v.projectId,data,mime,id);onProgress(name+' saved');
  }
 }finally{artwork?.dispose();}
}

export const ensureVersionPreview=(v,onProgress)=>ensureVersionAssets(v,onProgress,['thumb']);
