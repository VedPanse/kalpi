import {uuid} from './ids.js';
const labels={preparing:'Identifying the product image…',submitting:'Submitting to fal…',queued:'In fal’s queue…',running:'Generating geometry and textures…',ready:'Model generated. Importing…',importing:'Optimizing and saving your model…',complete:'Your model is ready.'};
export function createFalPanel({api,project,onComplete}){
 let job=null,timer=null,busy=false,resumedProject=null;
 const note=text=>{const el=document.querySelector('#fal-status');if(el)el.textContent=text;};
 const request=(suffix,body)=>api('/api/fal/jobs/'+encodeURIComponent(job.id)+suffix,body?{projectId:project(),...body}:undefined);
 async function poll(){
  if(busy||!job)return;busy=true;
  try{
   job=await api('/api/fal/jobs/'+encodeURIComponent(job.id)+'?projectId='+encodeURIComponent(project()));
   note(labels[job.stage]||job.message||job.stage);
   if(job.stage==='ready')job=await request('/import',{});
   if(job.stage==='complete'){await onComplete(job);await request('/opened',{});job=null;return;}
   if(['unknown','failed','import_failed'].includes(job.stage)){render();return;}
   timer=setTimeout(poll,5000);
  }catch(e){note(e.message+' Checking this same request again; no new generation will be charged.');timer=setTimeout(poll,10000);}
  finally{busy=false;}
 }
 function render(){
  const el=document.querySelector('#fal-controls');if(!el)return;
  el.replaceChildren();
  if(!job)return;
  note(labels[job.stage]||job.message||job.stage);
  if(job.stage==='import_failed'){const b=document.createElement('button');b.textContent='Retry import · no generation charge';b.onclick=async()=>{b.disabled=true;try{job=await request('/import',{});await poll();}catch(e){note(e.message);b.disabled=false;}};el.append(b);}
 }
 return {
 mount(){render();if(resumedProject===project())return;resumedProject=project();api('/api/fal/jobs?projectId='+encodeURIComponent(project())).then(jobs=>{job=jobs.find(j=>j.stage!=='failed'&&(j.stage!=='complete'||!j.openedAt));if(job){render();poll();}}).catch(e=>note('Could not restore generation status: '+e.message));},
 async quote(board,view){
  if(job&&!['complete','failed','quoted'].includes(job.stage)){note('A generation is already active. Its progress is shown below.');return;}
  job=await api('/api/fal/quote',{projectId:project(),operationId:uuid(),view,texts:board.texts,boardId:board.boardId});
  const el=document.querySelector('#fal-controls');if(!el)return;
  el.innerHTML='<h3>Generate a textured 3D model</h3><p id="fal-price"></p><p>One generation. No automatic paid retries. Usually takes several minutes. Unseen surfaces are inferred; exact lettering and geometry may differ.</p><button id="fal-confirm" class="primary full-width"></button><button id="fal-cancel" class="ghost">Cancel</button>';
  el.querySelector('#fal-price').textContent=`fal Hunyuan3D Pro + PBR: $${job.price.falUSD.toFixed(3)} USD. Board analysis: estimated under $${job.price.analysisEstimateUSD.toFixed(2)}. Total about $${job.price.estimatedTotalUSD.toFixed(2)} USD; provider billing may vary.`;
  el.querySelector('#fal-confirm').textContent=`Generate with fal · about $${job.price.estimatedTotalUSD.toFixed(2)}`;
  el.querySelector('#fal-cancel').onclick=()=>{job=null;el.replaceChildren();note('Cancelled. Nothing was generated or charged.');};
  el.querySelector('#fal-confirm').onclick=async()=>{
   el.querySelector('#fal-confirm').disabled=true;el.querySelector('#fal-cancel').disabled=true;note('Identifying the main product…');
   try{job=await request('/start',{view,priceVersion:job.price.version,acceptedTotalUSD:job.price.estimatedTotalUSD});}catch(e){note(e.message+' Restoring this request; do not submit another.');}
   render();clearTimeout(timer);await poll();
  };
 }
 };
}
