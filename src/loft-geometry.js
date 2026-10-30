import * as T from 'three';
// Closed cross-sections along Z: [z,bottom,shoulder,top,halfWidth,topHalfWidth].
// Separate strips preserve styling creases but smooth the longitudinal silhouette.
export function loftGeometry(sections) {
  const rings=sections.map(([z,b,s,t,w,r])=>[[-w,b-.5,z-.5],[w,b-.5,z-.5],[w,s-.5,z-.5],[r,t-.5,z-.5],[-r,t-.5,z-.5],[-w,s-.5,z-.5]]);
  const positions=[],indices=[];
  for(let face=0;face<6;face++) {
    const start=positions.length/3;
    for(const ring of rings)positions.push(...ring[face],...ring[(face+1)%6]);
    for(let i=0;i<rings.length-1;i++){const a=start+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  for(const [ring,reverse] of [[rings[0],true],[rings.at(-1),false]]){
    const start=positions.length/3;for(const p of ring)positions.push(...p);
    for(let j=1;j<5;j++)indices.push(start,start+(reverse?j+1:j),start+(reverse?j:j+1));
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  return g;
}
