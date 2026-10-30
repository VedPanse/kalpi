import {test} from 'node:test';import assert from 'node:assert/strict';
import {submitModel,modelStatus,modelResult} from '../providers/fal-model.js';
test('fal requests keep credentials server-side and use fixed provider endpoints',async()=>{
 const old=globalThis.fetch,key=process.env.FAL_KEY;process.env.FAL_KEY='test-private-key';const seen=[];
 globalThis.fetch=async(url,options)=>{seen.push({url,options});return{ok:true,json:async()=>({status:'IN_QUEUE',request_id:'test-request-123'})};};
 try{await submitModel('data:image/png;base64,aGVsbG8=');await modelStatus('test-request-123');await modelResult('test-request-123');assert.ok(seen.every(r=>r.url.startsWith('https://queue.fal.run/fal-ai/trellis-2')));assert.equal(seen[0].options.headers.Authorization,'Key test-private-key');assert.equal(JSON.parse(seen[0].options.body).texture_size,2048);assert.throws(()=>submitModel('https://example.com/private-image'));assert.throws(()=>modelStatus('../other-model'));}finally{globalThis.fetch=old;if(key===undefined)delete process.env.FAL_KEY;else process.env.FAL_KEY=key;}
});
test('fal credential errors do not leak provider bodies or keys',async()=>{const old=globalThis.fetch,key=process.env.FAL_KEY;process.env.FAL_KEY='test-private-key';globalThis.fetch=async()=>({ok:false,status:401});try{await assert.rejects(modelStatus('test-request-123'),/rejected the API credential/);}finally{globalThis.fetch=old;if(key===undefined)delete process.env.FAL_KEY;else process.env.FAL_KEY=key;}});
test('the final Hunyuan attempt includes PBR but no extra-charge face count or multiview options',async()=>{
 const {submitHunyuan}=await import('../providers/fal-model.js');const old=globalThis.fetch,key=process.env.FAL_KEY;process.env.FAL_KEY='test-private-key';let input;
 globalThis.fetch=async(url,options)=>{input=JSON.parse(options.body);return{ok:true,json:async()=>({status:'IN_QUEUE'})};};
 try{await submitHunyuan('data:image/png;base64,aGVsbG8=');assert.equal(input.enable_pbr,true);assert.equal(input.generate_type,'Normal');assert.deepEqual(Object.keys(input).sort(),['enable_pbr','generate_type','input_image_url']);}finally{globalThis.fetch=old;if(key===undefined)delete process.env.FAL_KEY;else process.env.FAL_KEY=key;}
});
