const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function validateLabelArt(a){
 if(a==null)return null;
 if(!a||!hex(a.background)||!Array.isArray(a.paths)||a.paths.length>32||!Array.isArray(a.texts)||a.texts.length>5)throw Error('Artwork needs a background, up to 32 vector paths and 5 text lines.');
 for(const p of a.paths){if(typeof p.d!=='string'||p.d.length>6000||! /^[MmLlHhVvCcSsQqTtAaZz0-9.,+\s-]+$/.test(p.d)||!/[Mm]/.test(p.d)||!(hex(p.fill)||p.fill==='none')||!(hex(p.stroke)||p.stroke==='none')||!Number.isFinite(p.strokeWidth)||p.strokeWidth<0||p.strokeWidth>20)throw Error('Artwork contains an invalid vector path.');}
 for(const t of a.texts){if(typeof t.text!=='string'||t.text.length>60||!hex(t.color)||!['serif','sans-serif'].includes(t.font)||!['normal','bold'].includes(t.weight)||![t.x,t.y,t.size].every(Number.isFinite)||t.x<0||t.x>1000||t.y<0||t.y>1000||t.size<12||t.size>180)throw Error('Artwork text is outside the label.');}
 if(JSON.stringify(a).length>32000)throw Error('Artwork is too complex. Simplify the illustration.');
 return JSON.parse(JSON.stringify(a));
}
export function labelArtSvg(a){
 validateLabelArt(a);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="${a.background}"/>${a.paths.map(p=>`<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}</svg>`;
}
