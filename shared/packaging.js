import {defaultProduct,validateProduct} from './product.js';
// A new editable concept; never mutate or masquerade as the imported mesh.
export function packagingBase(family='bottle',source=null){
 if(!['bottle','carton'].includes(family))throw Error('Choose bottle or carton packaging.');
 const p=defaultProduct(family==='carton'?'assembly':'bottle');
 if(family==='carton'){
  p.dimensions={width:.08,height:.16,depth:.06};
  p.shape.components=[{name:'Carton',type:'box',position:[0,0,0],size:[1,1,1],rotation:[0,0,0],color:'#e7dac2',material:'satin'}];
 }
 p.facts.name=family==='carton'?'Carton concept':'Packaging concept';p.label.text='';
 if(source){p.dimensions={...source.dimensions};p.label={...source.label};p.facts={...source.facts,name:source.facts.name+' · Editable concept'};p.material={...source.material};p.figma.fileUrl=source.figma.fileUrl;}
 p.scale={confirmed:false,source:'Editable packaging concept; dimensions are estimates until confirmed.'};
 return validateProduct(p);
}
