import {defaultProduct} from '../../shared/product.js';
import {chromium,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const html='<script>Object.defineProperty(crypto,"randomUUID",{value:undefined});Object.defineProperty(crypto,"subtle",{value:undefined});</script>'+readFileSync('figma-plugin/ui.html','utf8').replaceAll('__KALPI_LAUNCH_NONCE__','startup-test-bridge').replaceAll('__KALPI_PLUGIN_ID__','kalpi-local-development') + `<script>window.addEventListener('message',e=>{if(e.data?.relay)window.dispatchEvent(new MessageEvent('message',{data:{pluginMessage:e.data.relay},source:window,origin:'null'}));});</script>`;
const browser=await chromium.launch();
async function open(mode){
 const page=await browser.newPage();
 page.on('pageerror', e=>console.log('Panel error:',e.message));
 page.on('requestfailed',r=>console.log('Request failed:',new URL(r.url()).pathname,r.failure()?.errorText));
 let starts=0,imports=0;page.falCounts=()=>({starts,imports});
 const job={id:'fal-test-job',projectId:'c926a7d3-1411-43ec-a9d7-b1a7bf38b555',boardId:'speaker-board',designId:'2a932729-53ed-45e2-9e75-5cf8a2dc3e4d',stage:'quoted',price:{version:'test',falUSD:.525,analysisEstimateUSD:.01,estimatedTotalUSD:.535}};
 await page.route('**/api/fal/**',async r=>{
  const url=new URL(r.request().url());let result=job;
  if(url.pathname.endsWith('/quote'))result={...job,stage:'quoted'};
  else if(url.pathname.endsWith('/start')){starts++;const b=r.request().postDataJSON();if(b.acceptedTotalUSD!==.535)throw Error('Missing cost consent');job.stage='queued';}
  else if(url.pathname.endsWith('/import')){imports++;job.stage='complete';}
  else if(url.pathname.endsWith('/opened'))job.openedAt=Date.now();
  else if(url.pathname.endsWith('/jobs'))result=[];
  else job.stage='ready';
  await r.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.route('https://www.figma.com/kalpi-startup-test',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
 await page.goto('https://www.figma.com/kalpi-startup-test');
 await page.setContent('<iframe sandbox="allow-scripts" style="width:900px;height:820px"></iframe>');
 await page.evaluate(({html,mode,token,boardBytes,structuredProduct})=>{
  let requests=0;window.events=[];
  window.addEventListener('message',e=>{
   const m=e.data?.pluginMessage;if(!m)return;window.events.push(m.type);
   const reply=m=>e.source.postMessage({relay:{...m,bridgeId:'startup-test-bridge'}},'*');
   if(m.type==='bootstrap-ready'){
    if(mode==='silent'||++requests===1)return;
    reply({type:'saved-panel',url:'https://kalpi-roan.vercel.app/plugin.html?project=c926a7d3-1411-43ec-a9d7-b1a7bf38b555'});
   }
   if(m.type==='restore-studio-session'&&mode!=='missing-session')setTimeout(()=>reply({type:'studio-session',token}),2200);
   if(m.type==='read-product-board' && window.testStructured){reply({type:'structured-preview',designId:'ff061640-0243-4208-8411-9bc2b91bf8ec',document:structuredProduct});return;}
   if(m.type==='read-product-board')reply({type:'bottle-board',boardId:'speaker-board',name:'FORMA / 02 — Speaker',layers:[],texts:'Speaker. Width 180 mm, depth 130 mm, height 300 mm.',fingerprint:'speaker-fixture',bytes:boardBytes});
   if(m.type==='ready'){reply({type:'plugin-ready',protocol:8});reply({type:'selection-preview',selection:{nodeId:'speaker-board',name:'FORMA / 02 — Speaker',designId:null,linked:false,dimensions:{width:.18,height:.30,depth:.13},source:'Proposed board dimensions'}});}
  });document.querySelector('iframe').srcdoc=html;
 },{html,mode,token:process.env.SPACETIME_SERVICE_TOKEN,boardBytes:Array.from(readFileSync('outputs/forma-speaker/preview.png')),structuredProduct:defaultProduct('bottle')});
 return {page,panel:page.frameLocator('iframe')};
}
try{
 if(!process.env.SPACETIME_SERVICE_TOKEN)throw Error('Missing test identity');
 const live=await open('live');
 await expect(live.panel.locator('#selected-board')).toContainText('FORMA / 02',{timeout:45000});
 await live.panel.locator('#recognize-bottle').click();
 await expect(live.panel.locator('#fal-price')).toContainText('$0.525',{timeout:15000});
 if(live.page.falCounts().starts)throw Error('Submitted before consent');
 await live.panel.locator('#fal-cancel').click();
 if(live.page.falCounts().starts)throw Error('Cancel submitted');
 await live.panel.locator('#recognize-bottle').click();
 await expect(live.panel.locator('#fal-confirm')).toBeVisible();
 await live.page.screenshot({path:'outputs/plugin-fal-cost.png',fullPage:true});
 await live.panel.locator('#fal-confirm').click();
 await expect(live.panel.locator('#editor-design')).toHaveValue('2a932729-53ed-45e2-9e75-5cf8a2dc3e4d',{timeout:45000});
 await expect(live.panel.locator('#plugin-viewport canvas')).toBeVisible();
 if(live.page.falCounts().starts!==1||live.page.falCounts().imports!==1)throw Error('Incorrect request counts');
 if(!(await live.page.evaluate(()=>window.events)).includes('link-generated-model'))throw Error('Original board not linked');
 await live.page.screenshot({path:'outputs/plugin-fal-complete.png',fullPage:true});
 console.log('PASS: actual native plugin bundle, opaque Figma host, cost shown before submission, cancellation free, one confirmed start, automatic import and editor opening. Provider responses mocked; existing paid model displayed; no new generation or design writes.');
 await live.page.close();
}finally{await browser.close();}
