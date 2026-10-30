import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {defaultProduct} from '../shared/product.js';
import {bottleGeometry,productModel,disposeObject} from '../src/geometry.js';
test('glass bottles have inset cavity faces and preserve external physical dimensions',()=>{
 for(const crossSection of ['circle','rectangle','faceted','triangular']){
  const p=defaultProduct('bottle');p.shape.crossSection=crossSection;p.material.type='glass';
  const solid=bottleGeometry(p),shell=bottleGeometry(p,{hollow:true});
  assert.ok(shell.attributes.position.count>solid.attributes.position.count);
  for(const g of [solid,shell]){g.computeBoundingBox();const size=g.boundingBox.getSize(new Vector3());assert.ok(Math.abs(size.x-p.dimensions.width)<1e-6);assert.ok(Math.abs(size.z-p.dimensions.depth)<1e-6);assert.ok([...g.attributes.normal.array].every(Number.isFinite));g.dispose();}
  const root=productModel(p),size=new Box3().setFromObject(root).getSize(new Vector3());assert.ok(Math.abs(size.y-p.dimensions.height)<1e-6);assert.ok(root.getObjectByName('Cap').geometry.attributes.position.count>200);assert.ok(root.getObjectByName('Closure seam'));disposeObject(root);
 }
});

test('FORMA grille clears the shell, matte finish has no glaze, and physical bounds stay exact',async()=>{
 const {readFile}=await import('node:fs/promises');
 const p=JSON.parse(await readFile(new URL('./fixtures/forma-speaker.json',import.meta.url),'utf8'));
 const root=productModel(p);root.updateMatrixWorld(true);
 const shell=root.getObjectByName('ceramic shell'),grille=root.getObjectByName('front acoustic grille'),plaque=root.getObjectByName('front name plaque');
 const bounds=o=>new Box3().setFromObject(o);
 assert.ok(bounds(grille).min.z-bounds(shell).max.z>.001);
 assert.ok(bounds(plaque).min.z>bounds(grille).max.z);
 assert.equal(shell.material.clearcoat,0);assert.ok(shell.material.roughness>=.65);
 const size=bounds(root).getSize(new Vector3());[size.x,size.y,size.z].forEach((v,i)=>assert.ok(Math.abs(v-[.18,.30,.13][i])<1e-6));disposeObject(root);
});
