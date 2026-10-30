const MODEL='fal-ai/trellis-2';
const ROOT='https://queue.fal.run/';
export const falAvailable=()=>!!process.env.FAL_KEY;
async function request(path,{body,method='GET'}={}){
 if(!falAvailable())throw Object.assign(Error('Image-to-3D is not connected.'),{status:503});
 const response=await fetch(ROOT+path,{method,headers:{Authorization:'Key '+process.env.FAL_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 if(!response.ok){const status=response.status;throw Object.assign(Error(status===401||status===403?'fal rejected the API credential or account access.':status===402?'fal needs account credits.':status===422?'fal could not process this image.':'fal request failed ('+status+').'),{status:502,providerStatus:status});}
 return response.json();
}
export function submitModel(image){
 if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>1400000)throw Error('Use a PNG or JPEG under 1 MB.');
 return request(MODEL,{method:'POST',body:{image_url:image,resolution:1536,texture_size:2048,decimation_target:100000,remesh:true,seed:1977}});
}
export function modelStatus(id){if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw Error('Invalid model request.');return request(MODEL+'/requests/'+id+'/status');}
export function modelResult(id){if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw Error('Invalid model request.');return request(MODEL+'/requests/'+id);}
export function submitHunyuan(image){
 if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>11000000)throw Error('Use a PNG or JPEG under 8 MB.');
 // Omit custom face_count and multiview options: each carries an extra charge.
 return request('fal-ai/hunyuan-3d/v3.1/pro/image-to-3d',{method:'POST',body:{input_image_url:image,generate_type:'Normal',enable_pbr:true}});
}
export function hunyuanStatus(id){if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw Error('Invalid model request.');return request('fal-ai/hunyuan-3d/requests/'+id+'/status');}
export function hunyuanResult(id){if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw Error('Invalid model request.');return request('fal-ai/hunyuan-3d/requests/'+id);}
