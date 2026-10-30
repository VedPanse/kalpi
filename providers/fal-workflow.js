import {randomUUID,createHash} from 'node:crypto';
export const FAL_PRICE={version:'hunyuan-pro-pbr-2026-10-24',falUSD:.525,analysisEstimateUSD:.01,estimatedTotalUSD:.535};
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const digest=x=>createHash('sha256').update(x).digest('hex');
const terminal=new Set(['complete','failed']);
export function falWorkflow({transaction,prepare,submit,status,result,importModel,available=()=>true,now=Date.now}) {
 const owned=(s,id,user)=>{const j=s.get(id);if(!j||j.identity!==user.identity||j.projectId!==user.projectId)throw fail('Generation not found.',404);return j;};
 const patch=(id,user,change)=>transaction(s=>{const j=owned(s,id,user);return s.put('fal-job',change(j));});
 const safe=j=>{const {image,providerResult,requestId,identity,digest:_,...rest}=j;return rest;};
 return {
 async quote(user,{view,texts='',boardId='',operationId}) {
  if(!available())throw fail('Image-to-3D is not connected yet.',503);
  if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(view)||view.length>1400000)throw fail('Use a board image under 1 MB.');
  if(!/^[a-zA-Z0-9-]{8,100}$/.test(operationId||''))throw fail('Missing request ID.');
  return safe(await transaction(s=>{
   const id='fal:'+user.identity+':'+operationId,prior=s.get(id),hash=digest(view);
   if(prior){if(prior.digest!==hash)throw fail('Request ID already belongs to another board.',409);return prior;}
   // Shared lock row prevents two simultaneous paid jobs for one workspace owner.
   const lock=s.get('fal-lock:'+user.identity+':'+user.projectId),active=lock&&s.get(lock.jobId);
   if(active&&!terminal.has(active.stage)&&active.stage!=='quoted')throw fail('A model is already generating. Resume it before starting another.',409);
   const j={id,identity:user.identity,projectId:user.projectId,digest:hash,boardId:String(boardId).slice(0,100),texts:String(texts).slice(0,12000),stage:'quoted',price:FAL_PRICE,expiresAt:now()+15*60000,createdAt:now(),designId:randomUUID(),assetId:randomUUID()};
   s.put('fal-lock',{id:'fal-lock:'+user.identity+':'+user.projectId,jobId:id});return s.put('fal-job',j);
  }));
 },
 async start(user,id,{view,priceVersion,acceptedTotalUSD}) {
  const claimed=await transaction(s=>{const j=owned(s,id,user);if(j.stage!=='quoted')return null;
   if(j.expiresAt<now()||priceVersion!==j.price.version||acceptedTotalUSD!==j.price.estimatedTotalUSD||digest(view)!==j.digest)throw fail('Quote expired or changed. Review a fresh price before generating.',409);
   const lock=s.get('fal-lock:'+user.identity+':'+user.projectId);if(lock?.jobId!==id)throw fail('A newer quote replaced this one.',409);
   return s.put('fal-job',{...j,stage:'preparing',startedAt:now()});
  });
  if(!claimed)return this.get(user,id);
  let submitting=false;
  try {
   const prepared=await prepare(view,claimed.texts);
   await patch(id,user,j=>({...j,stage:'submitting',prepared:{name:prepared.name,dimensions:prepared.dimensions}}));
   submitting=true;const response=await submit(prepared.image);
   if(!/^[a-zA-Z0-9-]{8,100}$/.test(response.request_id||''))throw Error('Provider returned no request ID.');
   return safe(await patch(id,user,j=>({...j,stage:'queued',requestId:response.request_id})));
  } catch(e) {
   await patch(id,user,j=>({...j,stage:submitting?'unknown':'failed',message:submitting?'Submission outcome is uncertain. Do not generate again: check the fal dashboard to avoid a duplicate charge.':e.message}));
   return this.get(user,id);
  }
 },
 async acknowledge(user,id){return safe(await patch(id,user,j=>j.stage==='complete'?{...j,openedAt:now()}:j));},
 async list(user){return transaction(s=>s.all('fal-job').filter(j=>j.identity===user.identity&&j.projectId===user.projectId&&j.stage!=='quoted').sort((a,b)=>b.createdAt-a.createdAt).slice(0,10).map(safe));},
 async get(user,id){
  let j=await transaction(s=>owned(s,id,user));
  if(['queued','running'].includes(j.stage)){
   const st=await status(j.requestId);
   if(st.status==='FAILED')j=await patch(id,user,current=>['queued','running'].includes(current.stage)?{...current,stage:'failed',message:'fal could not generate this model. No automatic paid retry was made.'}:current);
   else if(st.status==='COMPLETED'){
    const output=await result(j.requestId);
    j=await patch(id,user,current=>['queued','running'].includes(current.stage)?{...current,stage:output.model_glb?.url?'ready':'failed',providerResult:output,message:output.model_glb?.url?'':'fal returned no model.'}:current);
   }else if(st.status==='IN_PROGRESS')j=await patch(id,user,current=>current.stage==='queued'?{...current,stage:'running'}:current);
  }
  if(['preparing','submitting'].includes(j.stage)&&now()-j.startedAt>180000)j=await patch(id,user,current=>['preparing','submitting'].includes(current.stage)?({...current,stage:'unknown',message:'The request was interrupted. Its payment outcome needs checking in fal before starting another.'}):current);
  return safe(j);
 },
 async import(user,id){
  const j=await transaction(s=>{const current=owned(s,id,user);if(!['ready','import_failed'].includes(current.stage)&&!(current.stage==='importing'&&now()-current.importAt>180000))return null;return s.put('fal-job',{...current,stage:'importing',importAt:now()});});
  if(!j)return this.get(user,id);
  try{await importModel(j);return safe(await patch(id,user,current=>({...current,stage:'complete',completedAt:now(),message:'Model ready.'})));}
  catch(e){return safe(await patch(id,user,current=>({...current,stage:'import_failed',message:'Model generated, but import failed. Retry import without paying for another generation.'})));}
 }
 };
}
