import {test} from 'node:test';import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {defaultProduct,validateProduct} from '../shared/product.js';
import {productModel,disposeObject} from '../src/geometry.js';
const body={name:'Tapered body',type:'loft',position:[0,0,0],size:[1,1,1],rotation:[0,0,0],color:'#21434d',material:'satin',finish:'lacquer',sections:[[0,0,.45,.5,.32,.3],[.25,0,.8,1,.5,.4],[.6,0,.8,.85,.48,.4],[1,0,.3,.4,.3,.24]]};
test('loft follows varying silhouette, closes end caps, and preserves exact physical bounds',()=>{
 const p=defaultProduct('assembly');p.dimensions={width:1.85,height:1.35,depth:4.4};p.shape.components=[structuredClone(body)];
 const model=productModel(validateProduct(p)), mesh=model.children[0], bounds=new Box3().setFromObject(model).getSize(new Vector3());
 for(const [axis,key] of [['x','width'],['y','height'],['z','depth']])assert.ok(Math.abs(bounds[axis]-p.dimensions[key])<1e-6);
 assert.ok(new Set(Array.from(mesh.geometry.attributes.position.array).filter((_,i)=>i%3===1).map(n=>n.toFixed(4))).size>3,'actual section heights, not a cuboid');
 assert.ok(Array.from(mesh.geometry.attributes.normal.array).every(Number.isFinite));
 assert.equal(mesh.material.clearcoat,1);assert.equal(mesh.material.clearcoatRoughness,.03);
 // Closed manifold: every undirected triangle edge is shared exactly twice.
 const flat=mesh.geometry.toNonIndexed(),a=flat.attributes.position, edges=new Map();
 const vertex=i=>[a.getX(i),a.getY(i),a.getZ(i)].map(n=>n.toFixed(5)).join(',');
 for(let i=0;i<a.count;i+=3)for(const [x,y] of [[i,i+1],[i+1,i+2],[i+2,i]]){const key=[vertex(x),vertex(y)].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
 assert.ok([...edges.values()].every(n=>n===2));flat.dispose();disposeObject(model);
});
test('invalid or unbounded lofts are rejected before rendering or saving',()=>{
 for(const mutate of [s=>s[1][0]=0,s=>s[1][5]=.8,s=>s[0][0]=.1,s=>s[1][3]=s[1][1],s=>s[1][1]=NaN]){
  const p=defaultProduct('assembly');p.shape.components=[structuredClone(body)];mutate(p.shape.components[0].sections);assert.throws(()=>validateProduct(p),/Loft|loft/);
 }
});

test('vehicle keeps the traced roof and wheelbase in one coordinate system',async()=>{
 const {vehicleComponents,validateVehicle}=await import('../shared/vehicle.js');
 const v={bodyProfile:[[0,.15,.49,.42],[.2,.12,.56,.48],[.6,.12,.56,.48],[1,.19,.37,.4]],roofProfile:[[.16,.57,.4],[.33,1,.33],[.49,1,.33],[.66,.55,.4]],wheelCenters:[.18,.82],wheelRadius:.23,wheelWidth:.105};
 validateVehicle(v);const p=defaultProduct('assembly');p.dimensions={width:1.85,height:1.35,depth:4.4};p.shape.components=vehicleComponents({...v,dimensions:p.dimensions},'#21434d');
 const m=productModel(validateProduct(p));assert.equal(m.children.filter(n=>n.name==='Tire').length,4);assert.equal(m.children.filter(n=>n.name==='Alloy rim').length,4);
 const body=m.getObjectByName('Body'),roof=m.getObjectByName('Roof');
 const b=new Box3().setFromObject(body),r=new Box3().setFromObject(roof);assert.ok(b.max.y<r.max.y*.7,'body ends below the cabin');
 for(const child of m.children)assert.ok(Array.from(child.geometry.attributes.position.array).every(Number.isFinite));
 const wheels=m.children.filter(n=>n.name==='Tire').map(n=>new Box3().setFromObject(n));
 for(const w of wheels){const d=w.getSize(new Vector3());assert.ok(Math.abs(d.y-d.z)<.01,'round wheel in physical meters');}
 disposeObject(m);
});
