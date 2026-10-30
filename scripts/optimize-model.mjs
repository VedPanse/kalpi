// Offline optimization only: this script makes no paid generation calls.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,simplify,textureCompress,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {statSync} from 'node:fs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/optimize-model.mjs input.glb output.glb');
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(input);
for(const material of doc.getRoot().listMaterials()){
 const spec=material.getExtension('KHR_materials_specular');if(spec)spec.setSpecularColorFactor(spec.getSpecularColorFactor().map(v=>Math.min(1,Math.max(0,v))));
}
await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.3,error:.0005}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:95}),prune());
await io.write(output,doc);
console.log(JSON.stringify({inputBytes:statSync(input).size,outputBytes:statSync(output).size,triangles:doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()||0)/3,0),textures:doc.getRoot().listTextures().map(t=>({size:t.getSize(),mime:t.getMimeType()}))}));
