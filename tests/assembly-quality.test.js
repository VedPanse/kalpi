import{test}from'node:test';import assert from'node:assert/strict';import{prepareAssembly}from'../shared/assembly-quality.js';
const box=(name,position,size,material='satin',finish=null)=>({name,type:'roundedBox',position,size,rotation:[0,0,0],color:'#556677',material,finish});
test('fresh varying assemblies are safe before saving, without product names or post-generation edits',()=>{
 for(let i=0;i<50;i++){
  const depth=.3+i*.01;
  const raw=[box('Housing',[0,0,0],[.8,.9,depth],'ceramic','ceramic'),box('front grille',[0,0,depth/2-.01],[.6,.7,.02],'fabric'),box('badge',[0,-.2,depth/2],[.12,.03,.008])];
  const original=structuredClone(raw),r=prepareAssembly(raw,'Unglazed matte ceramic enclosure');
  assert.deepEqual(raw,original);const [shell,grille,badge]=r.parts;
  assert.ok(grille.position[2]-grille.size[2]/2>shell.size[2]/2);
  assert.ok(badge.position[2]-badge.size[2]/2>grille.position[2]+grille.size[2]/2);
  assert.equal(shell.finish,'powderCoat');
 }
});
test('deeply buried front panels fail instead of saving a misleading model',()=>assert.throws(()=>prepareAssembly([box('body',[0,0,0],[1,1,1]),box('front grille',[0,0,.1],[.7,.8,.01])]),/buried/));
test('unrelated and rotated parts are not silently repositioned',()=>{
 const raw=[box('body',[0,0,0],[1,1,1]),box('internal support',[0,0,.2],[.5,.5,.02]),box('grille',[0,0,.5],[.5,.5,.02])];raw[2].rotation=[0,.2,0];assert.deepEqual(prepareAssembly(raw).parts,raw);
});
