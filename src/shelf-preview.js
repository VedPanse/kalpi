import {storeViewer} from './store-view.js';
import {libraryProduct} from '../shared/library-product.js';
import {SHELF_PRESETS,shelfLayout} from '../shared/shelf-presets.js';
const ids=['perfume-parts','bottle-parts','candle-parts','lipstick-parts','perfume-deco'];
let view,presentation="boutique",activePreset=SHELF_PRESETS[0];const versions=ids.map(id=>({id,name:libraryProduct(id).facts.name,document:libraryProduct(id)}));
function show(p){activePreset=p;view?.dispose();document.querySelector('#detail').hidden=true;document.body.style.background=p.background;view=storeViewer(document.querySelector('#scene'),{layout:{...shelfLayout(ids,p.id),presentation},versions},{walking:true,onInspect:v=>{const d=document.querySelector('#detail');d.hidden=false;d.querySelector('h2').textContent=v.name;}});document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.palette===p.id));}
document.querySelector('#palettes').innerHTML=SHELF_PRESETS.map(p=>`<button data-palette="${p.id}" style="--color:${p.shelf}"><i></i>${p.name}</button>`).join('');
document.querySelectorAll('[data-palette]').forEach(b=>b.onclick=()=>show(SHELF_PRESETS.find(p=>p.id===b.dataset.palette)));
document.querySelector('#close').onclick=()=>document.querySelector('#detail').hidden=true;
document.querySelector('#setting').onchange=e=>{presentation=e.target.value;show(activePreset);};
show(SHELF_PRESETS[0]);
