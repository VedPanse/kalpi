import * as T from 'three';
// Deterministic, subtle normal detail. Generated locally; no third-party textures.
// Canvas textures travel through both GLB and USDZ exporters.
export function surfaceNormal(kind) {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(256,256);
  let seed=1977;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const rows=Array.from({length:256},()=>random());
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4,grain=random()-.5;
    image.data[i]=kind==='fabric'?128+Math.cos(x*Math.PI/8)*45:128+grain*(kind==='paper'?45:6);
    image.data[i+1]=kind==='fabric'?128+Math.cos(y*Math.PI/8)*45:128+(kind==='metal'?(rows[y]-.5)*55:grain*35);
    image.data[i+2]=255;image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);const texture=new T.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(kind==='fabric'?5:kind==='paper'?4:2,kind==='fabric'?8:kind==='paper'?4:2);
  texture.anisotropy=4;return texture;
}
export function detailSurface(material,kind){
  if(!['metal','paper','satin','fabric','ceramic'].includes(kind))return material;
  const texture=surfaceNormal(kind);if(!texture)return material;
  material.normalMap=texture;const strength=kind==='fabric'?.35:kind==='paper'?.18:kind==='ceramic'?.10:.03;material.normalScale=new T.Vector2(strength,strength);
  if(kind==='fabric'){
    material.roughness=Math.max(.85,material.roughness);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const over=(Math.floor(x/8)+Math.floor(y/8))%2;const thread=Math.sin((over?x:y)*Math.PI/8);const shade=175+thread*32;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=shade;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);material.map=new T.CanvasTexture(canvas);material.map.colorSpace=T.SRGBColorSpace;material.map.wrapS=material.map.wrapT=T.RepeatWrapping;material.map.repeat.set(5,8);material.map.anisotropy=8;
  }
  return material;
}
