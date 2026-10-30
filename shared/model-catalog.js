import {GRAZA_MODELS} from './graza-models.js';
// Curated assets from Ioanna's branch. Dimensions are editable nominal defaults,
// not manufacturer measurements. Model files keep their original materials.
export const MODEL_CATALOG = [
 {id:"sola-fal-hunyuan",name:"Sola · fal reconstruction",source:"fal",file:"../generated/sola-hunyuan.glb",dimensions:{width:.064,height:.118,depth:.038}},
 {id:'perfume-parts',name:'Crystal perfume',file:'perfume-parts.glb',dimensions:{width:.075,height:.13,depth:.055}},
 {id:'bottle-parts',name:'Bamboo & steel bottle',file:'bottle-parts.glb',dimensions:{width:.085,height:.25,depth:.085}},
 {id:'candle-parts',name:'Marble candle',file:'candle-parts.glb',dimensions:{width:.10,height:.13,depth:.10}},
 {id:'lipstick-parts',name:'Crystal lipstick',file:'lipstick-parts.glb',dimensions:{width:.025,height:.085,depth:.025}},
 {id:'perfume-deco',name:'Art deco perfume',file:'perfume-deco.glb',dimensions:{width:.08,height:.12,depth:.045}},
 {id:'sage-bottle',name:'Sage bottle',file:'sage-bottle.glb',dimensions:{width:.072,height:.238,depth:.072}},
 ...Object.entries(GRAZA_MODELS).map(([key,base])=>({id:"graza-"+key,name:"Graza · "+base.title,source:"graza-photo",base,file:base.tex,dimensions:{width:base.widthMM/1000,height:base.heightMM/1000,depth:base.widthMM/1000*(base.kind==="lathe"?1:base.kind==="box"?.75:.18)}})),
];
export const modelById=id=>typeof id==='string'&&/^asset:[a-f0-9-]{36}$/.test(id)?{id,assetId:id.slice(6),name:'Generated model',source:'fal'}:MODEL_CATALOG.find(m=>m.id===id);
