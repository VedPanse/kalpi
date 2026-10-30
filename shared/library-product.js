import {defaultProduct,validateProduct} from './product.js';
import {modelById} from './model-catalog.js';
export function libraryProduct(id){
 const entry=modelById(id);if(!entry)throw Error('Choose a product from the library.');
 const p=defaultProduct('assembly');p.shape.modelId=id;p.dimensions={...entry.dimensions};p.facts.name=entry.name;p.material.color='#ffffff';p.label.text='';p.label.width=.5;p.label.height=.3;p.label.y=.45;
 p.scale={confirmed:false,source:'Ioanna library: editable nominal dimensions; confirm against the physical product.'};
 p.reconstruction={method:'imported-model',confidence:1,summary:'Detailed model from Ioanna’s library. Edit its dimensions, finish and Figma artwork. Mesh silhouette editing requires a new model.'};
 if(entry.source==='fal'){p.scale.source='Proposed Figma dimensions: 64 × 38 × 118 mm; generated mesh normalized to these dimensions, not physically measured.';p.reconstruction={method:'fal-hunyuan-3.1',confidence:.5,summary:'Generated with fal Hunyuan3D Pro from an AI material study based on the Sola Figma artwork. Detailed geometry and PBR maps; unseen surfaces, rear artwork and glass optics are inferred. Small generated lettering needs original artwork. Size, finish and artwork remain editable.'};}
 if(entry.source==='graza-photo'){
  p.facts.brand='Graza';p.facts.price=entry.base.price;p.facts.currency='USD';
  p.scale.source='Ioanna photo-derived profile: estimated dimensions, not confirmed measurements.';
  p.reconstruction={method:'imported-model',confidence:.6,summary:'Photo-derived product profile from Ioanna. Surface photography is projected onto geometry; unseen details are approximated. Price is from the imported 24 October 2026 catalog, not a live offer.'};
 }
 return validateProduct(p);
}
