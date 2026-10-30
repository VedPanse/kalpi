import test from 'node:test';import assert from 'node:assert/strict';
import {productProposal} from '../providers/product-from-design.js';
import {defaultProduct} from '../shared/product.js';
const v={found:true,confidence:.9,name:'Desk lamp',explanation:'Shade approximated with a cone',modelType:'assembly',bottleNodeId:'lamp',labelNodeId:null,
 width:{meters:.18,evidence:'18 cm'},height:{meters:.35,evidence:'35 cm'},depth:{meters:.18,evidence:null},glass:false,bodyColor:'#ffffff',capColor:'#333333',labelText:'',components:defaultProduct('assembly').shape.components};
test('any recognized category uses parts without being forced into a bottle',()=>{
 const result=productProposal(v,{layers:[{id:'lamp'}],texts:'18 cm / 35 cm'});
 assert.equal(result.document.kind,'assembly');assert.equal(result.document.facts.name,'Desk lamp');assert.equal(result.productNodeId,'lamp');assert.equal(result.document.scale.confirmed,false);
 assert.match(result.document.scale.source,/depth: AI estimate/);
 assert.equal(result.document.facts.capacityMl,null);
 assert.ok(productProposal({...v,found:false,explanation:'Several distinct products are equally prominent'},{}).clarification);
 assert.throws(()=>productProposal({...v,components:[]},{layers:[],texts:''}),/parts/);
});
