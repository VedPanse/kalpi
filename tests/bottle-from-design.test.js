import test from 'node:test';import assert from 'node:assert/strict';
import {bottleProposal} from '../providers/bottle-from-design.js';
const proposal={found:true,confidence:.95,name:'Test perfume',explanation:'Bottle on board',bottleNodeId:'bottle',labelNodeId:'invented',width:{meters:.064,evidence:'64 mm'},height:{meters:.118,evidence:'118 mm'},depth:{meters:.038,evidence:'38 mm'},crossSection:'rectangle',facets:8,bevel:.12,neckRatio:.35,capRatio:.2,shoulderStart:.72,neckStart:.9,baseInset:.9,glass:true,bodyColor:'#87916b',capColor:'#242424',labelText:'SOLA'};
test('bottle recognition builds shoulders and neck, validates evidence and rejects invented layer IDs',()=>{
 const result=bottleProposal(proposal,{layers:[{id:'bottle'}],texts:'64 mm / 118 mm'});
 assert.equal(result.document.kind,'bottle');assert.equal(result.labelNodeId,null);
 assert.equal(result.document.scale.confirmed,false);
 assert.match(result.document.scale.source,/depth: AI estimate/);
 assert.match(result.document.scale.source,/width: annotation/);
 assert.equal(result.document.shape.profile.at(-1)[1],.35);
 assert.equal(result.document.facts.price,null);
 assert.ok(bottleProposal({...proposal,confidence:.3},{layers:[],texts:''}).clarification);
 assert.throws(()=>bottleProposal({...proposal,neckStart:.1},{layers:[],texts:''}),/shoulder/);
});
