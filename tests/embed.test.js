import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('single script tag mounts a lazy shelf at its own position; legacy containers mount once',async()=>{
  const containers=[];
  const element=()=>({dataset:{},style:{},children:[],append(child){this.children.push(child)}});
  const legacy=element();legacy.dataset.kalpiShelf='old-shelf';
  const script={src:'https://kalpi.example/embed.js',dataset:{shelf:'shelf with space'},after(node){containers.push(node)}};
  const document={currentScript:script,createElement:tag=>({...element(),tag}),querySelectorAll:()=>[legacy]};
  const code=await readFile('public/embed.js','utf8');vm.runInNewContext(code,{document,URL});
  assert.equal(containers.length,1);assert.equal(containers[0].children[0].src,'https://kalpi.example/shelf/shelf%20with%20space');
  assert.equal(containers[0].children[0].loading,'lazy');assert.equal(legacy.children.length,1);
  document.currentScript={...script,dataset:{}};vm.runInNewContext(code,{document,URL});assert.equal(legacy.children.length,1);
});

test('store embed mounts the walkable publication without changing legacy shelf routes',async()=>{
 const nodes=[],script={src:'https://kalpi.example/embed.js',dataset:{store:'store-123'},after:n=>nodes.push(n)};
 const document={currentScript:script,querySelectorAll:()=>[],createElement:tag=>({tag,dataset:{},style:{},children:[],append(n){this.children.push(n)}})};
 vm.runInNewContext(await readFile('public/embed.js','utf8'),{document,URL});
 const iframe=nodes[0].children[0];assert.equal(iframe.src,'https://kalpi.example/store/store-123?embed=1');assert.match(iframe.title,/vote/);assert.equal(iframe.allowFullscreen,true);
});

test('seller div mounts once using SDK origin, even if script is loaded twice',async()=>{
 const container={dataset:{kalpiStore:'original collection'},children:[],append(n){this.children.push(n)}};
 const script={src:'https://kalpi.example/embed.js',dataset:{}};
 const document={currentScript:script,querySelectorAll:selector=>selector==='[data-kalpi-store]'?[container]:[],createElement:()=>({style:{}})};
 const code=await readFile('public/embed.js','utf8');
 vm.runInNewContext(code,{document,URL});vm.runInNewContext(code,{document,URL});
 assert.equal(container.children.length,1);
 assert.equal(container.children[0].src,'https://kalpi.example/store/original%20collection?embed=1');
});
