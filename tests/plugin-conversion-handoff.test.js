import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {plugin} from './helpers/figma-runtime.js';
import {defaultProduct} from '../shared/product.js';
test('saved 3D editor opens without waiting for a Figma acknowledgement, then reports missing views',async()=>{
 const source=await readFile('src/plugin-panel.js','utf8');
 const fn=source.slice(source.indexOf('async function saveRecognizedBottle('),source.indexOf('async function handleBottleBoard('));
 const events=[],note={textContent:''};let deadline;
 const design={id:'saved-speaker',revision:1};
 const context={bottleJob:{id:design.id,boardId:'speaker-board',response:{document:{label:{},figma:{},kind:'assembly'}}},activeProject:'workspace',selected:null,dirty:true,lastRevision:'',pendingViews:null,viewCreationTimer:null,
 rows:()=>[],call:async()=>events.push('persisted'),waitForDesign:async()=>design,
 finishRecognition:()=>events.push('conversion-finished'),showEditor:id=>events.push('editor:'+id),send:m=>events.push(m.type),
 document:{querySelector:()=>note},clearTimeout:()=>{},setTimeout:fn=>{deadline=fn;return 1;}};
 vm.createContext(context);vm.runInContext(fn,context);await vm.runInContext('saveRecognizedBottle()',context);
 assert.deepEqual(events,['persisted','conversion-finished','editor:saved-speaker','create-recognized-product']);
 deadline();assert.match(note.textContent,/saved and ready to edit/);assert.match(note.textContent,/no new conversion/);
});
test('failed Figma view creation preserves source link and returns the saved design identity',async()=>{
 const p=await plugin(),board=p.figma.createFrame();p.page.appendChild(board);p.page.selection=[board];
 p.figma.loadFontAsync=async()=>{throw Error('Font unavailable');};
 const row={id:'saved-product',projectId:'workspace',revision:1,document:JSON.stringify(defaultProduct('bottle'))};
 await p.figma.ui.onmessage({type:'create-recognized-product',boardId:board.id,design:row});
 const error=p.messages.find(m=>m.type==='sync-error');assert.equal(error.operation,'create-recognized-product');assert.equal(error.designId,row.id);
 assert.equal(board.getPluginData('kalpiSourceDesignId'),row.id);
 await p.figma.ui.onmessage({type:'inspect-selection'});
 assert.equal(p.messages.at(-1).selection.designId,row.id);
 assert.equal(board.children.length,0);
});
