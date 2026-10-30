import test from 'node:test';
import assert from 'node:assert/strict';
import {packagingBase} from '../shared/packaging.js';
import {libraryProduct} from '../shared/library-product.js';
import {ioannaLayout} from '../shared/retail-layout.js';
import {productModel,disposeObject} from '../src/geometry.js';
import {Box3} from 'three';
test('editable packaging is a separate valid concept preserving supplied artwork and facts',()=>{
 const source=libraryProduct('graza-drizzle'),before=JSON.stringify(source);source.label.assetId='test-artwork';
 for(const family of ['bottle','carton']){const p=packagingBase(family,source);assert.equal(p.shape.modelId,undefined);assert.equal(p.label.assetId,'test-artwork');assert.equal(p.facts.price,source.facts.price);assert.equal(p.scale.confirmed,false);const m=productModel(p),bounds=new Box3().setFromObject(m);assert.ok(bounds.max.y-bounds.min.y>0);disposeObject(m);}
 source.label.assetId=null;assert.equal(JSON.stringify(source),before);
});
test('Ioanna room presets stock real versions and keep an unobstructed entry',()=>{
 for(const style of ['apothecary','gallery','stage','loft']){const l=ioannaLayout(['v1','v2'],style);assert.equal(l.scene,'ioanna');assert.ok(l.placements.length>=5);assert.ok(l.placements.every(p=>['v1','v2'].includes(p.versionId)));assert.ok(l.fixtures.every(f=>f.z+f.depth/2<l.depth/2-.5));}
});
