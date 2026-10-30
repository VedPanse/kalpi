import {test} from 'node:test';import assert from 'node:assert/strict';
import {MODEL_CATALOG} from '../shared/model-catalog.js';
import {libraryProduct} from '../shared/library-product.js';
import {applyChanges,validateProduct,validateLayout,defaultLayout} from '../shared/product.js';
import {readFileSync} from 'node:fs';
test('library models exist, preserve metadata and reject invisible shape edits',()=>{
 for(const m of MODEL_CATALOG){const p=libraryProduct(m.id);assert.equal(p.shape.modelId,m.id);assert.equal(p.scale.confirmed,false);const bytes=readFileSync('public/models/ioanna/'+m.file);if(m.source==='graza-photo'){assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(m.base.heightMM>0);assert.equal(p.facts.brand,'Graza');}else assert.equal(bytes.readUInt32LE(0),0x46546c67);const edited=applyChanges(p,[{field:'parts.Body',value:{type:'metal',color:'#aa8844',roughness:.3,metalness:.9}}]);assert.equal(edited.parts.Body.color,'#aa8844');assert.throws(()=>applyChanges(p,[{field:'shape.components',value:[]}]),/silhouette/);p.shape.modelId='../../secret';assert.throws(()=>validateProduct(p),/Unknown library/);}
});
test('room styles preserve old layouts and reject invalid styles',()=>{const l=defaultLayout();delete l.style;assert.equal(validateLayout(l).template,'boutique');for(const style of ['gallery','apothecary','stage','loft'])assert.equal(validateLayout({...l,style}).style,style);assert.throws(()=>validateLayout({...l,style:'bad'}));});

test('small library products can be held but cars and large furniture cannot',async()=>{const {isHandheld,defaultProduct}=await import('../shared/product.js');assert.ok(isHandheld(libraryProduct('perfume-parts')));const car=defaultProduct('assembly');car.dimensions={width:1.85,height:1.35,depth:4.4};assert.equal(isHandheld(car),false);assert.equal(isHandheld(defaultProduct('sofa')),false);});
