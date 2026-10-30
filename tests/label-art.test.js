import test from 'node:test';import assert from 'node:assert/strict';
import {applyChanges,defaultProduct} from '../shared/product.js';
import {labelArtSvg} from '../shared/label-art.js';
const art={background:'#fff8ef',paths:[{d:'M 100 100 C 200 100 200 200 100 200 Z',fill:'#dabce8',stroke:'#614976',strokeWidth:2}],texts:[{text:'Moonlit',x:500,y:800,size:70,color:'#614976',font:'serif',weight:'normal'}]};
test('themed artwork survives validated edits without modifying the source',()=>{const p=defaultProduct('bottle');const q=applyChanges(p,[{field:'label.artwork',value:art}],{agent:true});assert.deepEqual(q.label.artwork,art);assert.equal(p.label.artwork,undefined);assert.match(labelArtSvg(art),/<path/);});
test('artwork rejects scripts, external resources and excessive complexity',()=>{for(const d of ['<script>alert(1)</script>','https://example.com/image','M 1 1 '+ '0 '.repeat(4000)])assert.throws(()=>applyChanges(defaultProduct('bottle'),[{field:'label.artwork',value:{...art,paths:[{...art.paths[0],d}]}}]));});
