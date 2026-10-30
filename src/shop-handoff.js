import {rows,call,uuid} from './client.js';
import {addVersionToShop} from '../shared/shop-placement.js';
export async function placeOnShelf(projectId,versionId,document){
 for(let attempt=0;attempt<3;attempt++){
  const row=rows('myLayouts').find(l=>l.projectId===projectId);if(!row)throw Error('Your shop is still loading. Try again.');
  const current=JSON.parse(row.document);if(current.placements.some(p=>p.versionId===versionId))return;
  const documents=Object.fromEntries(rows('myVersions').map(v=>[v.id,JSON.parse(v.document)]));
  const layout=addVersionToShop(current,versionId,JSON.parse(document),documents);
  try{await call('saveLayout',{projectId,baseRevision:row.revision,document:JSON.stringify(layout),operationId:uuid()});return;}
  catch(e){if(!String(e.message).includes('CONFLICT')||attempt===2)throw e;await new Promise(r=>setTimeout(r,200));}
 }
}
