import {labelArtTexture} from './label-art.js';
import {detailSurface} from './surface-detail.js';
import {populateCatalogModel} from './catalog-model.js';
import {mergeGeometries, toCreasedNormals} from "three/addons/utils/BufferGeometryUtils.js";
import {loftGeometry} from "./loft-geometry.js";
import {applyFinish} from "./material-recipes.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { USDZExporter } from "three/addons/exporters/USDZExporter.js";
import { validateProduct } from "../shared/product.js";
export function materialFor(p, part = "Body") {
  const m = p.parts?.[part] || p.material;
  return detailSurface(new T.MeshPhysicalMaterial({
    color: m.type === "glass" ? new T.Color(m.color).lerp(new T.Color("#ffffff"), .65) : m.color,
    roughness: m.roughness,
    metalness: m.type === "metal" ? Math.max(0.8, m.metalness) : m.metalness,
    transmission: m.type === "glass" ? 0.92 : 0,
    thickness: p.dimensions.depth * 0.12,
    ior: 1.5,
    attenuationColor: m.color,
    attenuationDistance: Math.max(.01, p.dimensions.depth * 1.5),
    clearcoat: m.type === "ceramic" ? 1 : 0,
    sheen: m.type === "fabric" ? 1 : 0,
    sheenRoughness: 0.85,
    side: T.FrontSide,
  }), m.type);
}
function section(shape) {
  const n =
    shape.crossSection === "circle"
      ? 64
      : shape.crossSection === "rectangle"
        ? 8
        : shape.facets;
  let pts = [];
  if (shape.crossSection === "rectangle") {
    const b = shape.bevel;
    pts = [
      [-1 + b, -1],
      [1 - b, -1],
      [1, -1 + b],
      [1, 1 - b],
      [1 - b, 1],
      [-1 + b, 1],
      [-1, 1 - b],
      [-1, -1 + b],
    ];
  } else
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      pts.push([Math.cos(a), Math.sin(a)]);
    }
  const maxX = Math.max(...pts.map((p) => Math.abs(p[0]))),
    maxZ = Math.max(...pts.map((p) => Math.abs(p[1])));
  return pts.map(([x, z]) => [x / maxX, z / maxZ]);
}
function finishedProfile(p) {
  const source=p.shape.profile;
  if(p.shape.crossSection==='triangular')return source;
  const result=[source[0]];
  // Small quadratic fillets soften manufactured edges without moving the
  // original silhouette envelope or changing its physical size.
  for(let i=1;i<source.length-1;i++){
    const a=source[i-1],b=source[i],c=source[i+1];
    const t=Math.min(.08,.008/Math.max(b[0]-a[0],c[0]-b[0]));
    const enter=b.map((v,k)=>v+(a[k]-v)*t),leave=b.map((v,k)=>v+(c[k]-v)*t);
    for(let j=0;j<=6;j++){const q=j/6;result.push(b.map((v,k)=>(1-q)*(1-q)*enter[k]+2*(1-q)*q*v+q*q*leave[k]));}
  }
  result.push(source.at(-1));return result;
}
export function bottleGeometry(p, { hollow = false } = {}) {
  const s = section(p.shape),
    positions = [],
    uv = [],
    indices = [],
    h = p.dimensions.height * (1 - p.shape.capRatio),
    rings = finishedProfile(p);
  for (const [ringIndex, [y, r]] of rings.entries()) {
    let ring = s;
    if (p.shape.crossSection === "triangular" && ringIndex % 2) {
      const angle = Math.PI / s.length;
      ring = s.map(([x,z]) => [x*Math.cos(angle)-z*Math.sin(angle), x*Math.sin(angle)+z*Math.cos(angle)]);
      const mx=Math.max(...ring.map(v=>Math.abs(v[0]))),mz=Math.max(...ring.map(v=>Math.abs(v[1])));
      ring=ring.map(([x,z])=>[x/mx,z/mz]);
    }
    for (let i = 0; i <= s.length; i++) {
      const [x, z] = ring[i % s.length];
      positions.push(
        (x * r * p.dimensions.width) / 2,
        y * h,
        (z * r * p.dimensions.depth) / 2,
      );
      uv.push(i / s.length, y);
    }
  }
  const stride = s.length + 1;
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < s.length; i++) {
      let a = j * stride + i,
        b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  for (const [ring, flip] of [
    [0, true],
    [rings.length - 1, false],
  ]) {
    const c = positions.length / 3;
    positions.push(0, rings[ring][0] * h, 0);
    uv.push(0.5, 0.5);
    for (let i = 0; i < s.length; i++) {
      const a = ring * stride + i,
        b = a + 1;
      indices.push(c, flip ? a : b, flip ? b : a);
    }
  }
  if (hollow) {
    // Remove the solid top disk; connect the lip to an inset cavity instead.
    indices.splice(indices.length - s.length * 3, s.length * 3);
    const start=positions.length/3;
    const wall=Math.min(p.dimensions.width,p.dimensions.depth)*.035;
    const heel=Math.min(h*.07,wall*2.5);
    for(let j=0;j<rings.length;j++)for(let i=0;i<=s.length;i++){
      const outer=(j*stride+i)*3, y=positions[outer+1];
      const rx=Math.max(wall,p.dimensions.width*rings[j][1]/2),rz=Math.max(wall,p.dimensions.depth*rings[j][1]/2);
      positions.push(positions[outer]*Math.max(.15,1-wall/rx),heel+y*(h-heel)/h,positions[outer+2]*Math.max(.15,1-wall/rz));
      uv.push(i/s.length,rings[j][0]);
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<s.length;i++){
      const a=start+j*stride+i,b=a+stride;
      indices.push(a,a+1,b,a+1,b+1,b);
    }
    const innerCenter=positions.length/3;positions.push(0,heel,0);uv.push(.5,.5);
    for(let i=0;i<s.length;i++){
      indices.push(innerCenter,start+i+1,start+i);
      const a=(rings.length-1)*stride+i,b=start+a;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const flat = p.shape.crossSection === "triangular" ? geo.toNonIndexed() : toCreasedNormals(geo, Math.PI / 3);
  if (p.shape.crossSection === "triangular") flat.computeVertexNormals();
  geo.dispose();
  return flat;
}
function triangularLabelGeometry(p) {
  const body=bottleGeometry(p), attr=body.attributes.position;
  const positions=[],uv=[];
  const width=p.dimensions.width*p.label.width;
  const lo=Math.max(.005,p.label.y-p.label.height/2)*p.dimensions.height;
  const hi=Math.min(1-p.shape.capRatio-.005,p.label.y+p.label.height/2)*p.dimensions.height;
  const clip=(polygon,axis,bound,sign)=>{
    const out=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],da=sign*(a[axis]-bound),db=sign*(b[axis]-bound);
      if(da>=0)out.push(a);
      if((da>=0)!==(db>=0))out.push(a.clone().lerp(b,da/(da-db)));
    }
    return out;
  };
  for(let i=0;i<attr.count;i+=3){
    const a=new T.Vector3().fromBufferAttribute(attr,i),b=new T.Vector3().fromBufferAttribute(attr,i+1),c=new T.Vector3().fromBufferAttribute(attr,i+2);
    const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if(normal.z<=.01)continue;
    let polygon=[a,b,c];
    for(const [axis,bound,sign] of [["x",-width/2,1],["x",width/2,-1],["y",lo,1],["y",hi,-1],["z",0,1]])polygon=clip(polygon,axis,bound,sign);
    for(let j=1;j<polygon.length-1;j++)for(const point of [polygon[0],polygon[j],polygon[j+1]]){
      uv.push(point.x/width+.5,(point.y-lo)/(hi-lo));
      const q=point.clone().addScaledVector(normal,.00008);positions.push(q.x,q.y,q.z);
    }
  }
  body.dispose();
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function labelGeometry(p) {
  if(p.shape.crossSection === "triangular") return triangularLabelGeometry(p);
  const positions = [],
    uv = [],
    indices = [],
    segments = 128,
    sectionPoints = section(p.shape),
    bodyHeight = p.dimensions.height * (1 - p.shape.capRatio);
  const radius = (y) => {
    const pts = finishedProfile(p);
    for (let i = 1; i < pts.length; i++)
      if (y <= pts[i][0]) {
        const [a, b] = [pts[i - 1], pts[i]],
          t = (y - a[0]) / (b[0] - a[0]);
        return a[1] + t * (b[1] - a[1]);
      }
    return pts.at(-1)[1];
  };
  const lo = Math.max(0.005, p.label.y - p.label.height / 2),
    hi = Math.min(1 - p.shape.capRatio - 0.005, p.label.y + p.label.height / 2);
  const ys=[lo*p.dimensions.height,hi*p.dimensions.height,...finishedProfile(p).map(([y])=>y*bodyHeight).filter(y=>y>lo*p.dimensions.height&&y<hi*p.dimensions.height)].sort((a,b)=>a-b);
  const rows=ys.length-1;
  for (let j = 0; j <= rows; j++) {
    const y = ys[j],
      r = radius(y / bodyHeight);
    for (let i = 0; i <= segments; i++) {
      const nx = ((i / segments) * 2 - 1) * p.label.width;
      let nz = -1;
      for (let k = 0; k < sectionPoints.length; k++) {
        const a = sectionPoints[k],
          b = sectionPoints[(k + 1) % sectionPoints.length];
        if (
          nx >= Math.min(a[0], b[0]) &&
          nx <= Math.max(a[0], b[0]) &&
          Math.abs(b[0] - a[0]) > 1e-8
        )
          nz = Math.max(
            nz,
            a[1] + ((nx - a[0]) / (b[0] - a[0])) * (b[1] - a[1]),
          );
      }
      positions.push(
        (nx * r * p.dimensions.width) / 2,
        y,
        (nz * r * p.dimensions.depth) / 2 + Math.min(p.dimensions.width,p.dimensions.depth)*.003,
      );
      uv.push(i / segments, (y/p.dimensions.height-lo)/(hi-lo));
    }
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function productModel(input, { artwork = null } = {}) {
  const p = validateProduct(input),
    root = new T.Group();
  root.userData.product = p;
  if(p.label.artwork){artwork=labelArtTexture(p.label.artwork);p.label.height=p.label.width*p.dimensions.width/p.dimensions.height;}
  if(p.shape.modelId){root.userData.ready=populateCatalogModel(root,p,{artwork,materialFor});root.userData.ready.catch(()=>{});return root;}
  const body = materialFor(p);
  const mesh = (name, g, m, x, y, z) => {
    const key = name.startsWith("Seat")
      ? "Seats"
      : name.endsWith("arm")
        ? "Arms"
        : name === "Leg"
          ? "Legs"
          : name;
    if (p.parts?.[key] && name !== "Label") m = materialFor(p, key);
    const o = new T.Mesh(g, m);
    o.name = name;
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    root.add(o);
    return o;
  };
  const { width: w, height: h, depth: d } = p.dimensions;
  if (p.kind === "bottle") {
    mesh("Body", bottleGeometry(p, {hollow:(p.parts?.Body || p.material).type === "glass"}), body, 0, 0, 0);
    const capH = h * p.shape.capRatio;
    // Rounded rim and shoulder catch highlights; a recessed closure seam stays
    // inside the declared dimensions. Circular caps inherit the bottle depth.
    const radius=w*p.shape.neckRatio/2,edge=Math.min(radius*.1,capH*.08);
    const capProfile=[[0,-capH/2],[radius-edge,-capH/2],[radius-edge*.3,-capH/2+edge*.3],[radius,-capH/2+edge],[radius*.98,-capH/2+capH*.1],[radius*.98,-capH/2+capH*.125],[radius,-capH/2+capH*.15],[radius,capH/2-edge],[radius-edge*.3,capH/2-edge*.3],[radius-edge,capH/2],[0,capH/2]].map(([x,y])=>new T.Vector2(x,y));
    const capMaterial=p.parts?.Cap?materialFor(p,"Cap"):detailSurface(new T.MeshPhysicalMaterial({color:'#29262c',metalness:.8,roughness:.25}),'metal');
    const cap=mesh('Cap',new T.LatheGeometry(capProfile,96),capMaterial,0,h-capH/2,0);
    cap.scale.z=d/w;
    const seam=mesh('Closure seam',new T.CylinderGeometry(radius*.995,radius*.995,Math.min(capH*.025,.0006),96),new T.MeshStandardMaterial({color:'#111111',roughness:.5}),0,h-capH+capH*.1125,0);
    seam.scale.z=d/w;seam.userData.editPart='Cap';
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 1024;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#f4eddf";
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.fillStyle = "#333039";
      ctx.textAlign = "center";
      ctx.font = "55px sans-serif";
      ctx.fillText(p.facts.brand || "K A L P I", 512, 210, 900);
      ctx.font = "140px Georgia";
      ctx.fillText(p.label.text, 512, 540, 940);
      ctx.font = "35px sans-serif";
      ctx.fillText(
        p.facts.capacityMl ? `${p.facts.capacityMl} ml` : "DESIGN STUDY",
        512,
        820,
      );
      const tex = artwork || new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      mesh(
        "Label",
        labelGeometry(p),
        detailSurface(new T.MeshStandardMaterial({
          map: tex,
          roughness: 0.7,
          side: T.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }), "paper"),
        0,
        0,
        0,
      );
    }
  } else if (p.kind === "assembly") {
    for (const part of p.shape.components) {
      let g;
      if(part.type === "rim") {
        const ring=new T.TorusGeometry(.44,.04,10,48);ring.rotateX(Math.PI/2);
        const hub=new T.CylinderGeometry(.10,.10,.10,20),pieces=[ring.toNonIndexed(),hub.toNonIndexed()];ring.dispose();hub.dispose();
        for(let i=0;i<5;i++){const spoke=new T.BoxGeometry(.07,.08,.38);spoke.translate(0,0,.24);spoke.rotateY(i*Math.PI*2/5);pieces.push(spoke.toNonIndexed());spoke.dispose();}
        g=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());
      }
      if(part.type === "loft") g=loftGeometry(part.sections);
      if (part.type === "box") g = new T.BoxGeometry(1,1,1);
      if (part.type === "roundedBox") g = new RoundedBoxGeometry(1,1,1,6,.12);
      if (part.type === "ellipsoid") g = new T.SphereGeometry(.5,32,20);
      if (part.type === "cylinder") g = new T.CylinderGeometry(.5,.5,1,32);
      if (part.type === "cone") g = new T.CylinderGeometry(.18,.5,1,32);
      if (part.type === "torus") g = new T.TorusGeometry(.36,.14,12,40);
      if (part.type === "cup") g = new T.LatheGeometry([[0,-.5],[.5,-.5],[.5,.5],[.43,.5],[.43,-.42],[0,-.42]].map(v=>new T.Vector2(...v)),40);
      g.computeBoundingBox();
      const size=g.boundingBox.getSize(new T.Vector3()), center=g.boundingBox.getCenter(new T.Vector3());
      g.translate(-center.x,-center.y,-center.z);
      g.scale(part.size[0]/size.x,part.size[1]/size.y,part.size[2]/size.z);
      const mat=materialFor({...p,material:{...p.material,type:p.material.type === "satin" ? part.material : p.material.type,color:part.color}});
      applyFinish(mat,part.finish);
      if (/name plaque/i.test(part.name) && p.label.text && typeof document !== 'undefined') {
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,128);
        ctx.fillStyle='#283328';ctx.font='500 54px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.label.text,256,66,440);
        mat.map=new T.CanvasTexture(canvas);mat.map.colorSpace=T.SRGBColorSpace;mat.map.anisotropy=8;
      }
      mat.color.multiply(new T.Color(p.material.color));
      const o=mesh(part.name,g,mat,...part.position);
      o.rotation.set(...part.rotation);
    }
    root.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(root,true), size=bounds.getSize(new T.Vector3()), center=bounds.getCenter(new T.Vector3());
    const scale=new T.Vector3(w/size.x,h/size.y,d/size.z);
    // Normalize the assembled envelope once so the exported meter dimensions are exact.
    for(const child of root.children) {
      child.updateMatrix(); child.geometry.applyMatrix4(child.matrix);
      child.geometry.translate(-center.x,-bounds.min.y,-center.z);
      child.geometry.scale(scale.x,scale.y,scale.z);
      child.position.set(0,0,0); child.rotation.set(0,0,0); child.scale.set(1,1,1);
      child.updateMatrix();
    }
    if (artwork) {
      artwork.colorSpace=T.SRGBColorSpace;
      mesh("Label",new T.PlaneGeometry(w*p.label.width,h*p.label.height),new T.MeshStandardMaterial({map:artwork,transparent:true,roughness:.7,side:T.DoubleSide}),0,h*p.label.y,d/2+.00003);
    }
  } else if (p.kind === "freeform") {
    for (const [i, outline] of p.shape.outlines.entries()) {
      const vectors = ring => ring.map(([x,y]) => new T.Vector2((x-.5)*w, (1-y)*h));
      const shape = new T.Shape(vectors(outline.points));
      shape.holes = outline.holes.map(ring => new T.Path(vectors(ring)));
      const g = new T.ExtrudeGeometry(shape, { depth: d * (1 - (p.shape.outlines.length - 1 - i) * .00001), bevelEnabled: false, steps: 1 });
      const mat = materialFor(p);
      if (!p.parts?.Body) mat.color.multiply(new T.Color(outline.color));
      mesh("Body", g, mat, 0, 0, -d/2);
    }
  } else {
    const {
      seatHeight: sh,
      armWidth: aw,
      backHeight: bh,
      legHeight: lh,
      seats,
    } = p.shape;
    const box = (name, bw, bh, bd, x, y, z, mat = body) =>
      mesh(name, new T.BoxGeometry(bw, bh, bd, 1, 1, 1), mat, x, y, z);
    box(
      "Base",
      w - aw * 2,
      sh - lh - 0.12,
      d - 0.06,
      0,
      lh + (sh - lh - 0.12) / 2,
      0,
    );
    for (let i = 0; i < seats; i++)
      box(
        "Seat " + (i + 1),
        (w - 2 * aw) / seats - 0.014,
        0.12,
        d - 0.18,
        -w / 2 + aw + ((i + 0.5) * (w - 2 * aw)) / seats,
        sh - 0.06,
        0.06,
      );
    box("Back", w - 2 * aw, bh, 0.16, 0, sh + bh / 2, -d / 2 + 0.08);
    for (const side of [-1, 1])
      box(
        side < 0 ? "Left arm" : "Right arm",
        aw,
        Math.min(h - lh, sh + 0.12 - lh),
        d,
        (side * (w - aw)) / 2,
        lh + Math.min(h - lh, sh + 0.12 - lh) / 2,
        0,
      );
    const legmat = new T.MeshStandardMaterial({
      color: "#574030",
      roughness: 0.5,
    });
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        box(
          "Leg",
          0.055,
          lh,
          0.055,
          x * (w / 2 - 0.09),
          lh / 2,
          z * (d / 2 - 0.09),
          legmat,
        );
  }
  return root;
}
export function disposeObject(root) {
  root.userData.disposed=true;
  const geos = new Set(),
    mats = new Set(),
    textures = new Set();
  root.traverse((n) => {
    if (n.geometry) geos.add(n.geometry);
    for (const m of Array.isArray(n.material) ? n.material : [n.material])
      if (m) {
        mats.add(m);
        for (const x of Object.values(m)) if (x?.isTexture) textures.add(x);
      }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
export async function exportProduct(
  p,
  { format = "glb", artwork = null } = {},
) {
  const model = productModel(p, { artwork });
  try {
    await model.userData.ready;
    if (format === "usdz") return new USDZExporter().parseAsync(model);
    return await new GLTFExporter().parseAsync(model, {
      binary: true,
      onlyVisible: true,
    });
  } finally {
    disposeObject(model);
  }
}
