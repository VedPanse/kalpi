// Front schematics use projected part envelopes, not a claim of manufacturing accuracy.
export function assemblyProjection(components) {
  const boxes=components.map(part=>{
    const [rx,ry,rz]=part.rotation, points=[];
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]) {
      let [a,b,c]=[x*part.size[0],y*part.size[1],z*part.size[2]];
      [a,b]=[a*Math.cos(rz)-b*Math.sin(rz),a*Math.sin(rz)+b*Math.cos(rz)];
      [a,c]=[a*Math.cos(ry)+c*Math.sin(ry),-a*Math.sin(ry)+c*Math.cos(ry)];
      [b,c]=[b*Math.cos(rx)-c*Math.sin(rx),b*Math.sin(rx)+c*Math.cos(rx)];
      points.push([a+part.position[0],b+part.position[1]]);
    }
    return {minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};
  });
  const minX=Math.min(...boxes.map(b=>b.minX)),maxX=Math.max(...boxes.map(b=>b.maxX)),minY=Math.min(...boxes.map(b=>b.minY)),maxY=Math.max(...boxes.map(b=>b.maxY));
  return boxes.map(b=>({x:(b.minX-minX)/(maxX-minX),y:(maxY-b.maxY)/(maxY-minY),width:(b.maxX-b.minX)/(maxX-minX),height:(b.maxY-b.minY)/(maxY-minY)}));
}
