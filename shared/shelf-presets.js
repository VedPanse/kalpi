import {defaultLayout,validateLayout} from './product.js';
export const SHELF_PRESETS=[
 {id:'midnight',name:'Midnight',background:'#100d1c',shelf:'#282038',accent:'#b9a2ff',lighting:'cool'},
 {id:'sage',name:'Sage',background:'#37483e',shelf:'#647866',accent:'#deebbc',lighting:'daylight'},
 {id:'sand',name:'Sand',background:'#c5b29a',shelf:'#ddd0ba',accent:'#fff1d3',lighting:'warm'},
 {id:'rose',name:'Rose',background:'#55383e',shelf:'#926b6c',accent:'#ffd5c6',lighting:'warm'}
];
export function shelfLayout(ids,presetId='midnight'){
 const p=SHELF_PRESETS.find(p=>p.id===presetId);if(!p)throw Error('Choose a shelf palette.');
 const unique=[...new Set(ids)];if(!unique.length||unique.length>5)throw Error('Choose one to five products for this shelf.');
 return validateLayout({...defaultLayout(),presentation:'shelf',palette:p.id,style:'stage',width:4,depth:4,height:3,wallColor:p.background,floorColor:p.shelf,shelfColor:p.shelf,lighting:p.lighting,sign:'',fixtures:[{id:'product-shelf',x:0,z:-.7,width:3.3,height:1.12,depth:.65,rotation:0}],placements:unique.map((versionId,i)=>({id:'shelf-'+i,versionId,x:(i-(unique.length-1)/2)*.61,y:1.12,z:-.7,rotation:0}))});
}
