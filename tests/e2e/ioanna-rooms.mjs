import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const code=(await build({stdin:{contents:`import * as T from 'three';import {buildIoannaRoom} from './src/ioanna-room.js';
window.checkRooms=()=>['gallery','apothecary','stage','loft'].flatMap(style=>['warm','daylight','cool'].map(lighting=>{
 const scene=new T.Scene();buildIoannaRoom(scene,{style,sign:'Packaging',lighting});const lights=[];
 scene.traverse(o=>{if(o.isLight)lights.push({color:o.color.getHexString(),intensity:o.intensity});});
 return {style,lighting,objects:scene.children.length,background:scene.background.getHexString(),lights};
}));`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife'})).outputFiles[0].text;
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({content:code});const rooms=await page.evaluate(()=>window.checkRooms());
 assert.equal(rooms.length,12);
 for(const style of ['gallery','apothecary','stage','loft']){
  const variants=rooms.filter(r=>r.style===style);assert.ok(variants.every(r=>r.objects>10&&r.lights.length>0));
  assert.equal(new Set(variants.map(r=>JSON.stringify(r.lights))).size,3,style+' must change its actual scene lighting');
 }
 assert.equal(new Set(rooms.map(r=>r.background)).size,4,'Room styles must have distinct scene backgrounds');
 console.log('PASS: all four room environments build, with distinct daylight/warm/cool light settings (12 combinations).');
}finally{await browser.close();}
