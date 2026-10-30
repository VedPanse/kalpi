import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Color } from 'three';
import { defaultProduct, validateProduct } from '../shared/product.js';
export function importFigmaSelection(snapshot, dimensions) {
  if (snapshot.svg.length > 2_000_000) throw Error('Select a smaller design; this vector export is too large.');
  const document = new DOMParser().parseFromString(snapshot.svg, "image/svg+xml");
  if (document.querySelector("parsererror")) throw Error("Figma returned invalid vector data. Re-export the selection.");
  if (document.querySelector("image, foreignObject")) throw Error("This selection contains image pixels. Select filled vector layers for extrusion; photo-to-3D reconstruction is not available yet.");
  const svg = new SVGLoader().parse(snapshot.svg);
  let totalPoints = 0;
  const outlines = [];
  for (const path of svg.paths) {
    if (path.userData?.style?.fill === 'none' || Number(path.userData?.style?.fillOpacity) === 0) continue;
    for (const shape of SVGLoader.createShapes(path)) {
      const points = shape.extractPoints(8);
      totalPoints += points.shape.length + points.holes.reduce((n,r) => n+r.length,0);
      if (totalPoints > 12000 || outlines.length >= 256) throw Error("Select a simpler product layer; this design has too many vector points.");
      outlines.push({ points: points.shape.map(p => [p.x,p.y]), holes: points.holes.map(r => r.map(p => [p.x,p.y])), color: '#' + (path.color || new Color('#87916b')).getHexString() });
    }
  }
  if (!outlines.length) throw Error('No filled vector outlines found. Select a vector object or outline your strokes. Photos need 3D reconstruction, which is not available yet.');
  const points = outlines.flatMap(o => o.points);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs)-minX, h = Math.max(...ys)-minY;
  if (!(w > 0 && h > 0)) throw Error('Select a design with a visible width and height.');
  const normalize = ring => ring.map(([x,y]) => [Math.max(0,Math.min(1,(x-minX)/w)), Math.max(0,Math.min(1,(y-minY)/h))]);
  const p = defaultProduct('freeform');
  p.dimensions = dimensions;
  p.facts.name = snapshot.name;
  p.figma.nodeId = snapshot.nodeId;
  p.scale = { confirmed: false, source: snapshot.source };
  p.shape.outlines = outlines.map(o => ({...o, points: normalize(o.points), holes: o.holes.map(normalize)}));
  return validateProduct(p);
}
