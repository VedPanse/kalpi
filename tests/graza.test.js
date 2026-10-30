import test from 'node:test';import assert from 'node:assert/strict';
import {GRAZA_MODELS} from '../shared/graza-models.js';import {libraryProduct} from '../shared/library-product.js';import {applyChanges} from '../shared/product.js';
test('photo-derived models use nominal metres and never confirm inferred size',()=>{
 assert.equal(Object.keys(GRAZA_MODELS).length,21);
 for(const [key,b] of Object.entries(GRAZA_MODELS)){
  const p=libraryProduct('graza-'+key);assert.equal(p.dimensions.height,b.heightMM/1000);assert.equal(p.scale.confirmed,false);assert.equal(p.facts.price,b.price);
  if(b.kind==='lathe'){assert.ok(b.profile.length>2);assert.ok(b.profile.every(v=>v.length===2&&v.every(Number.isFinite)));assert.ok(Number.isFinite(b.axisU));}
  assert.throws(()=>applyChanges(p,[{field:'parts.Cap',value:{type:'metal',color:'#ff0000',roughness:.3,metalness:.9}}]),/no separately editable cap/);
 }
});
