import {defaultLayout,validateLayout} from './product.js';
// Ioanna's three-tier apothecary shelves, stocked with real publication instances.
export function apothecaryLayout(versionIds){
 if(!versionIds.length)throw Error('Choose products for the shop.');
 const layout={...defaultLayout('boutique'),width:5,depth:5,height:3,sign:'THE COLLECTION',floorColor:'#80664a',fixtures:[
  ...[-1.15,1.15].map((x,i)=>({id:'cabinet-'+i,kind:'cabinet',x,z:-2.2,rotation:0,width:2.1,depth:.42,height:2.2})),
  {id:'discovery-counter',kind:'counter',x:0,z:.15,rotation:0,width:1.8,depth:.65,height:1.08}],placements:[]};
 let n=0;
 for(const x of [-1.15,1.15])for(const y of [.78,1.32,1.86])for(const dx of [-.55,0,.55])layout.placements.push({id:'stock-'+n,versionId:versionIds[n++%versionIds.length],x:x+dx,y,z:-2.14,rotation:0});
 for(const x of [-.6,-.2,.2,.6])layout.placements.push({id:'tester-'+n,versionId:versionIds[n++%versionIds.length],x,y:1.08,z:.15,rotation:0});
 return validateLayout(layout);
}

// Physical placement and collision volumes from Ioanna's four Make store rooms.
export function ioannaLayout(versionIds,style='apothecary'){
 if(!versionIds.length)throw Error('Choose products for the shop.');
 if(!['apothecary','gallery','stage','loft'].includes(style))throw Error('Choose a room.');
 const sizes={apothecary:[6,6,3],gallery:[8,7,3.4],stage:[10,10,5],loft:[9,7,3.6]};
 const [width,depth,height]=sizes[style];
 const l={...defaultLayout('boutique'),scene:'ioanna',style,width,depth,height,sign:'THE COLLECTION',fixtures:[],placements:[]};
 const place=(x,y,z,rotation=0)=>l.placements.push({id:'tester-'+l.placements.length,versionId:versionIds[l.placements.length%versionIds.length],x,y,z,rotation});
 const fixture=(x,z,width,depth,height,kind='table')=>l.fixtures.push({id:'ioanna-'+l.fixtures.length,x,z,width,depth,height,kind,rotation:0});
 if(style==='apothecary'){
  fixture(0,-2.79,4.26,.38,2.3,'cabinet');fixture(1.2,-.4,1.8,.6,.95,'counter');
  for(const [ri,count] of [5,4,5].entries())for(let i=0;i<count;i++)place(-1.6+i*3.2/(count-1),[.775,1.375,1.975][ri],-2.75);
  place(1,.95,-.4,-.4);place(1.65,.95,-.35,.6);
 }else if(style==='gallery'){
  for(const [x,z] of [[-1.6,-1.2],[-.55,-.6],[.55,-.6],[1.6,-1.2]]){fixture(x,z,.42,.42,.95);place(x,.95,z,.4);}
  fixture(0,-2.3,.42,.42,.6);place(0,.6,-2.3,-.3);
 }else if(style==='stage'){
  for(const [x,z] of [[-2.2,-1.4],[-1.1,-2],[0,-2.3],[1.1,-2],[2.2,-1.4]]){fixture(x,z,.6,.6,.7);place(x,.7,z,-x*.2);}
 }else{
  for(const [x,z] of [[-1.2,-1.6],[1.4,-1]]){fixture(x,z,2.2,.8,.91);for(let i=0;i<4;i++)place(x-.75+i*.5,.91,z,(i-1.5)*.3);}
 }
 return validateLayout(l);
}

// One original product per display; no repeated stock or scaled-up products.
export function collectionLayout(versionIds){
 const ids=[...new Set(versionIds)];
 if(ids.length<1||ids.length>5)throw Error('Choose one to five original products.');
 const l={...defaultLayout('boutique'),scene:'ioanna',style:'apothecary',width:4,depth:4,height:3,lighting:'warm',sign:'SOLA · THE COLLECTION',fixtures:[
 {id:'collection-display',kind:'counter',x:-.3,z:-1.35,width:2.1,depth:.45,height:1.15,rotation:0},
 {id:'service-counter',kind:'counter',x:1.25,z:-.3,width:.85,depth:.5,height:.95,rotation:0}],placements:ids.map((versionId,i)=>({id:'tester-original-'+i,versionId,x:-.3+(i-(ids.length-1)/2)*.38,y:1.15,z:-1.35,rotation:0}))};
 return validateLayout(l);
}
