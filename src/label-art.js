import * as T from 'three';
export function labelArtTexture(a){
 if(!a||typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=c.height=2048;const g=c.getContext('2d');g.scale(2.048,2.048);g.fillStyle=a.background;g.fillRect(0,0,1000,1000);
 for(const p of a.paths){const path=new Path2D(p.d);g.lineWidth=p.strokeWidth;g.lineJoin='round';g.lineCap='round';if(p.fill!=='none'){g.fillStyle=p.fill;g.fill(path);}if(p.stroke!=='none'){g.strokeStyle=p.stroke;g.stroke(path);}}
 for(const t of a.texts){g.fillStyle=t.color;g.font=`${t.weight} ${t.size}px ${t.font}`;g.textAlign='center';g.textBaseline='alphabetic';g.fillText(t.text,t.x,t.y,940);}
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
}
