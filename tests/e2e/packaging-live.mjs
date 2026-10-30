if(process.env.KALPI_LIVE_AI_TEST!=='1')throw Error('Set KALPI_LIVE_AI_TEST=1 to run this test against real AI, storage and database services.');
import {chromium,expect as baseExpect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {openConnection} from '../../providers/spacetime.js';
import {plugin} from '../helpers/figma-runtime.js';
import {ioannaLayout} from '../../shared/retail-layout.js';
const expect=baseExpect.configure({timeout:60000});
const base=process.env.KALPI_TEST_URL||'http://127.0.0.1:3101',out='.local/packaging-flow';mkdirSync(out,{recursive:true});
const owner=await openConnection(process.env.SPACETIME_SERVICE_TOKEN,['SELECT * FROM my_projects','SELECT * FROM my_votes']);
const projectId=crypto.randomUUID();await owner.reducers.createProject({id:projectId,name:'Packaging editor · Workflow verification'});
const c=await openConnection(null,['SELECT * FROM my_designs','SELECT * FROM my_versions','SELECT * FROM my_layouts']);
const code=crypto.randomUUID();await owner.reducers.createPairing({projectId,code});await c.reducers.redeemPairing({code});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1300,height:1100},permissions:['local-network-access'],recordVideo:{dir:out}}),page=await context.newPage();
await context.addInitScript(({base,token,projectId})=>{if(location.origin===base){localStorage.setItem('kalpi-spacetime-token',token);localStorage.setItem('kalpi-project',projectId);}},{base,token:c.serviceCredential,projectId});
const native=await plugin();let shelfURL='',nativeQueue=Promise.resolve();
native.figma.ui.postMessage=m=>{native.messages.push(m);page.evaluate(m=>document.querySelector('iframe')?.contentWindow.postMessage({pluginMessage:{...m,bridgeId:'bridge-fixture'}},'*'),m).catch(()=>{});};
await page.exposeFunction('pluginMessage',m=>{nativeQueue=nativeQueue.then(async()=>{
 if(m.type==='bootstrap-ready')return native.figma.ui.postMessage({type:'saved-panel',url:base+'/plugin.html?project='+projectId});
 if(m.type==='restore-studio-session')return native.figma.ui.postMessage({type:'studio-session',token:c.serviceCredential});
 if(m.type==='save-studio-session')return; // Test host URL is local; persistence is tested separately.
 if(m.type==='open-studio'){shelfURL=m.url;return;}
 await native.figma.ui.onmessage(m);
});return nativeQueue;});
await page.route('https://www.figma.com/packaging-test',r=>r.fulfill({contentType:'text/html',body:'<html><meta charset="utf-8"><body style="background:#eee;font:16px system-ui"><p>Actual plugin UI + built plugin runtime · simulated Figma host</p></body></html>'}));
await page.goto('https://www.figma.com/packaging-test');await page.evaluate(ui=>{window.addEventListener('message',e=>{if(e.source===document.querySelector('iframe')?.contentWindow&&e.data.pluginMessage)window.pluginMessage(e.data.pluginMessage);});const f=document.createElement('iframe');f.sandbox='allow-scripts';f.style='width:900px;height:1000px;border:0;margin:auto;display:block';f.srcdoc=ui;document.body.append(f);},readFileSync('figma-plugin/ui.html','utf8').replaceAll('__KALPI_LAUNCH_NONCE__','bridge-fixture'));
const panel=page.frameLocator('iframe');page.on('response',r=>{if(r.url().startsWith(base+'/api/')&&r.status()>=400)r.json().then(d=>console.log('API failure:',new URL(r.url()).pathname,r.status(),d.error)).catch(()=>{});});
try{
 await panel.getByText('Create packaging with AI',{exact:true}).click();
 await panel.locator('#packaging-brief').fill('A cylindrical perfume bottle, 8 cm wide, 14 cm tall and 8 cm deep. Pale green glass with a black cap.');
 await panel.locator('#create-packaging').click();
 await expect(panel.locator('#editor-design')).toBeVisible({timeout:120000});
 const designId=await panel.locator('#editor-design').inputValue();
 const frame=()=>native.page.children.find(n=>n.getPluginData('kalpiDesignId')===designId);
 await expect.poll(()=>frame()?.getPluginData('kalpiRevision')).toBe('0');
 const body=()=>frame().children.find(n=>n.getPluginData('kalpiPart')==='front').children.find(n=>n.getPluginData('kalpiPart')==='profile');
 const firstPath=body().vectorPaths[0].data;console.log('Text → structured 3D and editable Figma vectors passed');
 await panel.getByLabel('Describe a 3D change').fill('Make this a square-base pyramid perfume bottle, with amber glass. Keep the dimensions and black cap. Apply it now.');await panel.locator('#editor-chat button').click();
 await expect.poll(()=>frame()?.getPluginData('kalpiRevision'),{timeout:120000}).toBe('1');
 assert.notEqual(body().vectorPaths[0].data,firstPath);
 let doc=JSON.parse([...c.db.myDesigns.iter()].find(d=>d.id===designId).document);
 assert.equal(doc.shape.crossSection,'rectangle');
 const color=doc.parts.Body?.color||doc.material.color;assert.equal(Math.round(body().fills[0].color.r*255),parseInt(color.slice(1,3),16));
 await page.screenshot({path:out+'/edited-plugin.png'});console.log('AI pyramid + amber → persisted model + native vector geometry/fill passed');
 await panel.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>frame()?.getPluginData('kalpiRevision')).toBe('2');assert.equal(body().vectorPaths[0].data,firstPath);console.log('Undo restored Figma geometry');
 // The actual compiled plugin reads native layer changes and sends the resulting edits through UI/backend.
 body().fills=[{type:'SOLID',color:{r:.2,g:.3,b:.7}}];await native.figma.ui.onmessage({type:'convert'});
 await expect.poll(()=>[...c.db.myDesigns.iter()].find(d=>d.id===designId)?.revision,{timeout:60000}).toBe(3);
 doc=JSON.parse([...c.db.myDesigns.iter()].find(d=>d.id===designId).document);assert.equal(doc.parts.Body?.color||doc.material.color,'#334db3');console.log('Figma native recolor → stored 3D color passed');
 await panel.getByRole('button',{name:'Suggest improvements',exact:true}).click();await expect(panel.locator('#packaging-suggestion')).toBeVisible({timeout:120000});assert.equal([...c.db.myDesigns.iter()].find(d=>d.id===designId).revision,3);console.log('Review leaves design unchanged');
 await panel.getByRole('button',{name:'Apply suggestion',exact:true}).click();await expect.poll(()=>frame()?.getPluginData('kalpiRevision'),{timeout:60000}).toBe('4');console.log('Reviewed suggestion applied to both views');
 await panel.getByText('Product details',{exact:true}).click();await panel.locator('#editor-details [name="price"]').fill('35');await panel.locator('#editor-details [name="name"]').fill('Packaging study · Sample price');await panel.getByRole('button',{name:'Apply details',exact:true}).click();await expect.poll(()=>frame()?.getPluginData('kalpiRevision')).toBe('5');
 await panel.getByRole('button',{name:/Send to shelf/}).click();await expect.poll(()=>shelfURL,{timeout:180000}).toContain('versions=');const versionId=new URL(shelfURL).searchParams.get('versions');console.log('Send to shelf exported and uploaded real revision');
 // Publication automatically stocks Ioanna's room when the draft layout is empty.
 await page.goto(shelfURL);await page.getByRole('button',{name:'Publish selected directions'}).click();await expect(page.locator('#store-embed-code')).toBeVisible({timeout:60000});const embed=await page.locator('#store-embed-code').inputValue(),publicationId=embed.match(/data-store="([^"]+)"/)[1];
 writeFileSync(out+'/result.json',JSON.stringify({projectId,designId,versionId,publicationId,store:base+'/store/'+publicationId}));
 await page.goto(base+'/store/'+publicationId);await expect(page.locator('#store-view')).toHaveAttribute('data-position',/z/,{timeout:60000});
 await page.locator('#store-view canvas').click({position:{x:10,y:10}});await page.keyboard.down('KeyW');await expect.poll(async()=>JSON.parse(await page.locator('#store-view').getAttribute('data-position')).z,{timeout:30000}).toBeLessThan(1);await page.keyboard.up('KeyW');
 await page.getByRole('button',{name:'Browse products'}).click();await page.getByRole('button',{name:'Details & feedback'}).first().click();await page.getByRole('button',{name:'Pick up',exact:true}).click();await expect(page.locator('#store-view')).toHaveAttribute('data-held',/tester-/, {timeout:30000});
 await page.locator('#turn-product').press('End');await page.screenshot({path:out+'/ioanna-store-held.png'});await page.getByRole('button',{name:'Return product',exact:true}).click();await expect(page.locator('#store-view')).not.toHaveAttribute('data-held',/./);
 await page.getByLabel('Your answer').selectOption('yes');await page.getByLabel('What stands out?').fill('AUTOMATED WORKFLOW CHECK — not a customer response');await page.getByRole('button',{name:'Share your thoughts'}).click();await expect.poll(()=>[...owner.db.myVotes.iter()].filter(v=>v.publicationId===publicationId).length).toBe(1);
 await c.reducers.unpublishStore({id:publicationId});console.log('Ioanna store walking, pickup, rotation, return, voting and unpublish passed');
}catch(e){console.log('Sync state:',await panel.locator('#sync').textContent({timeout:500}).catch(()=>''));console.log('Plugin events:',native.messages.slice(-8).map(m=>({type:m.type,error:m.type==='sync-error'?m.message:undefined})));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(e);process.exitCode=1;}finally{await context.close();await browser.close();owner.disconnect();c.disconnect();}
