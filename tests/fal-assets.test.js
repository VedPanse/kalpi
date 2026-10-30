import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {testDatabase} from './helpers/database.js';import {defaultProduct} from '../shared/product.js';
test('generated model references require a GLB in the same workspace',async()=>{
 const db=await testDatabase();try{
 const owner=await db.connect(),other=await db.connect(),admin=await db.connect(process.env.SPACETIME_SERVICE_TOKEN),pid=randomUUID(),otherId=randomUUID(),aid=randomUUID();
 await owner.reducers.createProject({id:pid,name:'Generated model test'});await other.reducers.createProject({id:otherId,name:'Other workspace'});
 const p=defaultProduct('assembly');p.shape.modelId='asset:'+aid;
 const create=(c,projectId)=>c.reducers.createDesign({id:randomUUID(),projectId,kind:p.kind,document:JSON.stringify(p)});
 await assert.rejects(create(owner,pid),/Model must belong/);
 await admin.reducers.registerAsset({id:aid,projectId:pid,path:'test.glb',mime:'model/gltf-binary',size:100n});
 await create(owner,pid);await assert.rejects(create(other,otherId),/Model must belong/);
 }finally{await db.close();}
});
