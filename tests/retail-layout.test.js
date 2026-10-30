import test from 'node:test';
import assert from 'node:assert/strict';
import {apothecaryLayout} from '../shared/retail-layout.js';
import {validateLayout} from '../shared/product.js';
test('stocked apothecary uses real instances, supported shelves and a clear entrance',()=>{
 const l=apothecaryLayout(['perfume','bottle']);assert.deepEqual(validateLayout(l),l);
 assert.equal(l.placements.length,22);assert.equal(new Set(l.placements.map(p=>p.id)).size,22);
 assert.ok(l.placements.every(p=>['perfume','bottle'].includes(p.versionId)));
 for(const p of l.placements){const f=l.fixtures.find(f=>Math.abs(p.x-f.x)<f.width/2&&Math.abs(p.z-f.z)<f.depth/2);assert.ok(f);assert.ok(f.kind==='counter'?p.y===f.height:[.78,1.32,1.86].includes(p.y));}
 assert.ok(l.fixtures.every(f=>f.z+f.depth/2<1));assert.throws(()=>apothecaryLayout([]));
});
