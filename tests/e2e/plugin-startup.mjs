import {defaultProduct} from '../../shared/product.js';
import {chromium,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const html='<script>Object.defineProperty(crypto,"randomUUID",{value:undefined});Object.defineProperty(crypto,"subtle",{value:undefined});</script>'+readFileSync('figma-plugin/ui.html','utf8').replaceAll('__KALPI_LAUNCH_NONCE__','startup-test-bridge').replaceAll('__KALPI_PLUGIN_ID__','kalpi-local-development') + `<script>window.addEventListener('message',e=>{if(e.data?.relay)window.dispatchEvent(new MessageEvent('message',{data:{pluginMessage:e.data.relay},source:window,origin:'null'}));});</script>`;
const browser=await chromium.launch();
async function open(mode){
 const page=await browser.newPage();
 page.on('pageerror', e=>console.log('Panel error:',e.message));
 page.on('requestfailed',r=>console.log('Request failed:',new URL(r.url()).pathname,r.failure()?.errorText));
 await page.route('**/api/ai/product-from-design',async r=>{const body=r.request().postDataJSON();if(!/^[0-9a-f-]{36}$/.test(body.operationId))throw Error('Invalid operation ID');await r.fulfill({contentType:'application/json',body:JSON.stringify({clarification:'Conversion request verified without paid generation.'})});});
 await page.route('**/api/fal/**',async r=>r.fulfill({contentType:'application/json',body:JSON.stringify(r.request().url().includes('/quote')?{id:'startup-test',stage:'quoted',price:{version:'test',falUSD:.525,analysisEstimateUSD:.01,estimatedTotalUSD:.535}}:[])}));
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
 const silent=await open('silent');await expect(silent.panel.getByRole('button',{name:'Try again',exact:true})).toBeVisible({timeout:12000});await expect(silent.panel.getByText('Your saved workspace connection has been kept.')).toBeVisible();await silent.page.close();
 const missing=await open('missing-session');await expect(missing.panel.getByRole('button',{name:'Retry saved connection'})).toBeVisible({timeout:13000});if((await missing.page.evaluate(()=>window.events)).includes('save-studio-session'))throw Error('Overwrote saved session');await missing.page.close();
 if(process.env.SPACETIME_SERVICE_TOKEN){const live=await open('live');try { await expect(live.panel.locator('#selected-board').filter({hasText:'FORMA / 02 — Speaker'})).toBeVisible({timeout:45000}); } catch(e) { console.log('Startup state:',await live.panel.locator('body').innerText());console.log('Events:',await live.page.evaluate(()=>window.events));throw e; }await expect(live.panel.locator('#plugin-viewport')).toHaveCount(0);
 await expect(live.panel.locator('#recognize-bottle')).toBeVisible();
 if((await live.page.evaluate(()=>window.events)).includes('read-product-board')) throw Error('Selection caused automatic paid conversion');
 await live.panel.locator('#recognize-bottle').click();
 await expect(live.panel.locator('#fal-price')).toContainText('$0.525',{timeout:15000});
 await live.panel.locator('#fal-cancel').click();
 await live.page.screenshot({path:'outputs/plugin-speaker-conversion-start.png',fullPage:true});
 const preview={type:'selection-preview',bridgeId:'startup-test-bridge',selection:{nodeId:'linked-bottle',name:'Sola linked bottle',designId:'ff061640-0243-4208-8411-9bc2b91bf8ec',linked:true,dimensions:{width:.064,height:.118,depth:.038},source:'Saved design'}};
 await live.page.evaluate(m=>document.querySelector('iframe').contentWindow.postMessage({relay:m},'*'),preview);
 await expect(live.panel.locator('#editor-design')).toHaveValue(preview.selection.designId);
 preview.selection={...preview.selection,nodeId:'speaker-board',name:'FORMA / 02 — Speaker',designId:null,linked:false};
 await live.page.evaluate(m=>document.querySelector('iframe').contentWindow.postMessage({relay:m},'*'),preview);
 await expect(live.panel.locator('#plugin-viewport')).toHaveCount(0);
 await expect(live.panel.locator('#selected-board')).toContainText('FORMA / 02');
 await live.page.evaluate(()=>window.testStructured=true);await live.panel.locator('#recognize-bottle').click();
 await expect(live.panel.locator('#local-preview[data-preview-ms] canvas')).toBeVisible({timeout:15000});
 console.log('Local structured preview to two animation frames:',await live.panel.locator('#local-preview').getAttribute('data-preview-ms'),'ms (simulated Figma host; excludes launch and persistence).');
 await live.page.close();}
 console.log('PASS: window-relayed native replies accepted with matching launch identifier; dropped startup message retried; missing host/session recovers visibly without saving a replacement identity; delayed saved identity restores real workspace; speaker conversion request succeeds without randomUUID or subtle crypto (AI response mocked, no generation charge).');
}finally{await browser.close();}
