import {labelArtSvg} from '../shared/label-art.js';
import { assemblyProjection } from "../shared/assembly-projection.js";
import { selectionDimensions } from "../shared/figma-selection.js";
import {
  defaultProduct,
  validateProduct,
  EDIT_FIELDS,
} from "../shared/product.js";
let nativeLaunchURL = null;
const bridgeId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
function showPanel() {
  const html = __html__.split('__KALPI_LAUNCH_NONCE__').join(bridgeId).split('__KALPI_PLUGIN_ID__').join(figma.pluginId || 'kalpi-local-development');
  figma.showUI(html, {width:900,height:820,themeColors:true});
  // Figma queues UI messages until the iframe is ready; no first request is required.
  restorePanel();
}
async function restorePanel() {
  send({type:'runtime-ready'});
  try {
    const url = nativeLaunchURL || await figma.clientStorage.getAsync('kalpiPanel');
    send({type:'saved-panel',url:url || 'https://kalpi-roan.vercel.app/plugin.html'});
  } catch (_) { send({type:'sync-error',message:'Figma could not read your saved workspace. Retry without creating a new pairing link.'}); }
}
let active = null,
  suppressed = 0,
  timer = null,
  page = null,
  lastApplied = "",
  pending = false;
const send = (m) => figma.ui.postMessage({...m, bridgeId});
const tag = (node, part) => node.setPluginData("kalpiPart", part);
function selectedRoot() {
  let n = figma.currentPage.selection[0];
  while (n && n.type !== "PAGE") {
    if (n.getPluginData?.("kalpiDesignId")) return n;
    n = n.parent;
  }
  return null;
}
function sourceNode() {
  if (figma.currentPage.selection.length > 1) return null;
  if (figma.currentPage.selection.length === 1) return selectedRoot() || figma.currentPage.selection[0];
  const visible = figma.currentPage.children.filter(n => n.visible !== false);
  return visible.length === 1 ? visible[0] : null;
}
function describeSelection() {
  const node = sourceNode();
  if (!node) { send({ type: "selection-preview", selection: null }); return; }
  const texts = [];
  let count = 0;
  const visit = n => { if (++count > 300) return; if (n.type === "TEXT") texts.push(n.characters); for (const c of n.children || []) visit(c); };
  visit(node);
  const saved = node.getPluginData("kalpiDocument");
  const inferred = saved ? { dimensions: JSON.parse(saved).dimensions, source: JSON.parse(saved).scale.source } : selectionDimensions(node.width, node.height, node.name + " " + texts.join(" "));
  send({ type: "selection-preview", selection: { nodeId: node.id, name: node.name, designId: node.getPluginData("kalpiDesignId") || node.getPluginData("kalpiSourceDesignId") || null, ...inferred, linked: !!saved } });
}
async function exportSelection(m) {
  const node = sourceNode();
  if (!node || node.id !== m.nodeId) throw Error("Your selection changed. Review the selected design and convert again.");
  const svg = await node.exportAsync({ format: "SVG_STRING", svgOutlineText: true });
  if (sourceNode()?.id !== node.id) throw Error("Your selection changed during export. Try again.");
  send({ type: "selection-export", snapshot: { nodeId: node.id, name: node.name, svg, dimensions: m.dimensions, source: m.source }, designId: node.getPluginData("kalpiDesignId") || node.getPluginData("kalpiSourceDesignId") || null, baseRevision: Number(node.getPluginData("kalpiRevision") || 0), fingerprint: fingerprint(node) });
}
async function updateImported(row, node) {
  const p = validateProduct(JSON.parse(row.document));
  suppressed++;
  try {
    const previous = JSON.parse(node.getPluginData("kalpiDocument"));
    if (typeof node.rescale === "function" && Math.abs(p.dimensions.width / previous.dimensions.width - p.dimensions.height / previous.dimensions.height) < .0001) node.rescale(p.dimensions.width / previous.dimensions.width);
    else if (typeof node.resize === "function") node.resize(node.width * p.dimensions.width / previous.dimensions.width, node.height * p.dimensions.height / previous.dimensions.height);
    node.setPluginData("kalpiDocument", row.document);
    node.setPluginData("kalpiRevision", String(row.revision));
    node.setPluginData("kalpiFingerprint", fingerprint(node));
    node.setPluginData("kalpiPending", "");
    pending = false; lastApplied = row.id + ":" + row.revision;
    send({ type: "template-applied", designId: row.id, revision: row.revision });
    describeSelection();
  } finally { suppressed--; }
}
function currentBoard() {
  const top = node => { while (node?.parent && node.parent.type !== "PAGE") node = node.parent; return node; };
  const selected = [...new Set(figma.currentPage.selection.map(top))];
  if (selected.length === 1) return selected[0];
  const roots = figma.currentPage.children.filter(n => n.visible !== false && !n.getPluginData("kalpiDesignId"));
  if (roots.length === 1) return roots[0];
  const b = figma.viewport.bounds;
  if (!b) throw Error("Open the product presentation board, then try again.");
  const overlap = n => {
    const r = n.absoluteBoundingBox || n;
    return Math.max(0,Math.min(r.x+r.width,b.x+b.width)-Math.max(r.x,b.x))*Math.max(0,Math.min(r.y+r.height,b.y+b.height)-Math.max(r.y,b.y));
  };
  const visible=roots.filter(n=>overlap(n)>0).sort((a,b)=>overlap(b)-overlap(a));
  if (!visible.length) throw Error("Bring your design board into view, then try again.");
  return visible[0];
}
async function readProductBoard(forceImage = false) {
  const linked=selectedRoot();
  if(!forceImage && linked && linked.getPluginData('kalpiDocument') && linked.getPluginData('kalpiImport')!=='true') {
    active=linked;
    await readChanges(true);
    return;
  }
  const board=currentBoard(), layers=[], texts=[];
  let count=0;
  const visit=n=>{
    if (++count>2000 || n.visible===false) return;
    if (layers.length<300) {
      const b=n.absoluteBoundingBox,base=board.absoluteBoundingBox;
      const bounds=b&&base?[ (b.x-base.x)/board.width,(b.y-base.y)/board.height,b.width/board.width,b.height/board.height ].map(v=>Math.round(v*10000)/10000):null;
      layers.push({id:n.id,name:n.name,type:n.type,bounds});
    }
    if(n.type==="TEXT") texts.push(n.characters);
    for(const child of n.children||[]) visit(child);
  };
  visit(board);
  const signature=fingerprint(board);
  const bytes=await board.exportAsync({format:"PNG",constraint:{type:"SCALE",value:Math.min(1,1600/Math.max(board.width,board.height))}});
  if(board.removed || signature!==fingerprint(board)) throw Error("The board changed while it was being read. Try again.");
  send({type:"bottle-board",boardId:board.id,name:board.name,layers,texts:texts.join("\n").slice(0,20000),bytes:Array.from(bytes),fingerprint:signature});
}
function textNode(parent, name, value, x, y, size = 16) {
  const n = figma.createText();
  n.name = name;
  tag(n, "annotation");
  n.fontName = { family: "Inter", style: "Regular" };
  n.characters = value;
  n.fontSize = size;
  n.x = x;
  n.y = y;
  parent.appendChild(n);
  return n;
}
const rgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
});
async function writeTemplate(row, existing = null) {
  const p = validateProduct(JSON.parse(row.document));
  let fontTimer;
  try {
    await Promise.race([figma.loadFontAsync({ family: "Inter", style: "Regular" }), new Promise((_,reject)=>{fontTimer=setTimeout(()=>reject(Error('Figma is taking too long to load the font. Your 3D model is saved.')),10000);})]);
  } finally { clearTimeout(fontTimer); }
  suppressed++;
  try {
    const frame = existing || figma.createFrame();
    if (!existing) {
      frame.resize(800, 760);
      frame.x = figma.viewport.center.x - 400;
      frame.y = figma.viewport.center.y - 380;
      frame.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.95, b: 0.97 } }];
      figma.currentPage.appendChild(frame);
    }
    frame.name = `Kalpi / ${p.facts.name}`;
    const artwork = frame.children.find(
      (n) => n.getPluginData("kalpiPart") === "artwork",
    );
    for (const child of [...frame.children])
      if (child !== artwork && child.getPluginData("kalpiPart")) child.remove();
    const ppm = p.kind === "assembly" ? 420 / Math.max(p.dimensions.width,p.dimensions.height) : p.kind === "bottle" ? 3000 : 220,
      front = figma.createFrame();
    front.name = "Editable front view";
    front.fills = [];
    front.clipsContent = false;
    front.x = 65;
    front.y = 125;
    front.resize(p.dimensions.width * ppm, p.dimensions.height * ppm);
    tag(front, "front");
    frame.appendChild(front);
    if (p.kind === "bottle") {
      const w = p.dimensions.width * ppm,
        h = p.dimensions.height * (1 - p.shape.capRatio) * ppm,
        pts = p.shape.profile;
      const left = pts.map(([y, r]) => [((1 - r) * w) / 2, h * (1 - y)]),
        right = [...pts]
          .reverse()
          .map(([y, r]) => [((1 + r) * w) / 2, h * (1 - y)]);
      const points = [...left, ...right];
      const n = figma.createVector();
      n.name = "Body outline · edit nodes symmetrically";
      n.vectorPaths = [
        {
          windingRule: "NONZERO",
          data: "M " + points.map((p) => p.join(" ")).join(" L ") + " Z",
        },
      ];
      n.fills = [
        { type: "SOLID", color: rgb((p.parts?.Body || p.material).color) },
      ];
      n.y = p.dimensions.height * p.shape.capRatio * ppm;
      tag(n, "profile");
      front.appendChild(n);
      const cap = figma.createRectangle();
      cap.name = "Cap";
      cap.resize(
        p.dimensions.width * p.shape.neckRatio * ppm,
        p.dimensions.height * p.shape.capRatio * ppm,
      );
      cap.x = (w - cap.width) / 2;
      cap.fills = [
        {
          type: "SOLID",
          color: p.parts?.Cap
            ? rgb(p.parts.Cap.color)
            : rgb("#29262c"),
        },
      ];
      tag(cap, "cap");
      front.appendChild(cap);
      textNode(
        frame,
        "Dimensions",
        `${(p.dimensions.width * 100).toFixed(1)} × ${(p.dimensions.depth * 100).toFixed(1)} × ${(p.dimensions.height * 100).toFixed(1)} cm`,
        65,
        front.y + p.dimensions.height * ppm + 25,
        14,
      );
      const top = figma.createVector();
      top.name = "Top view · generated from cross-section";
      const points2 = [];
      const count = p.shape.crossSection === "circle" ? 32 : p.shape.facets;
      if (p.shape.crossSection === "rectangle") {
        const b = p.shape.bevel;
        for (const [x, z] of [
          [-1 + b, -1],
          [1 - b, -1],
          [1, -1 + b],
          [1, 1 - b],
          [1 - b, 1],
          [-1 + b, 1],
          [-1, 1 - b],
          [-1, -1 + b],
        ])
          points2.push([
            (x * p.dimensions.width * ppm) / 2,
            (z * p.dimensions.depth * ppm) / 2,
          ]);
      } else
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count;
          points2.push([
            (Math.cos(a) * p.dimensions.width * ppm) / 2,
            (Math.sin(a) * p.dimensions.depth * ppm) / 2,
          ]);
        }
      top.vectorPaths = [
        {
          windingRule: "NONZERO",
          data: "M " + points2.map((p) => p.join(" ")).join(" L ") + " Z",
        },
      ];
      top.fills = [
        { type: "SOLID", color: rgb((p.parts?.Body || p.material).color) },
      ];
      top.x = 410;
      top.y = 135;
      tag(top, "projection");
      top.locked = true;
      frame.appendChild(top);
    } else if (p.kind === "assembly") {
      front.name="Editable front schematic · part envelopes";
      const projections=assemblyProjection(p.shape.components);
      p.shape.components.forEach((part,i)=>{
        const rect=projections[i], n=part.type === "ellipsoid" ? figma.createEllipse() : figma.createRectangle();
        n.name=part.name; n.resize(rect.width*front.width,rect.height*front.height);n.x=rect.x*front.width;n.y=rect.y*front.height;
        n.fills=[{type:"SOLID",color:rgb(part.color)}];tag(n,"component-"+i);front.appendChild(n);
      });
      textNode(frame,"Dimensions",`${(p.dimensions.width*100).toFixed(1)} × ${(p.dimensions.depth*100).toFixed(1)} × ${(p.dimensions.height*100).toFixed(1)} cm`,65,front.y+front.height+25,14);
    } else {
      const dims = p.dimensions,
        s = p.shape,
        w = dims.width * ppm,
        h = dims.height * ppm;
      for (const [name, x, y, bw, bh] of [
        [
          "Back",
          s.armWidth * ppm,
          0,
          w - 2 * s.armWidth * ppm,
          s.backHeight * ppm,
        ],
        [
          "Seat",
          s.armWidth * ppm,
          s.backHeight * ppm,
          w - 2 * s.armWidth * ppm,
          0.12 * ppm,
        ],
        [
          "Left arm",
          0,
          (dims.height - s.seatHeight - 0.12) * ppm,
          s.armWidth * ppm,
          (s.seatHeight + 0.12 - s.legHeight) * ppm,
        ],
        [
          "Right arm",
          (dims.width - s.armWidth) * ppm,
          (dims.height - s.seatHeight - 0.12) * ppm,
          s.armWidth * ppm,
          (s.seatHeight + 0.12 - s.legHeight) * ppm,
        ],
      ]) {
        const n = figma.createRectangle();
        n.name = name;
        n.resize(bw, bh);
        n.x = x;
        n.y = y;
        n.fills = [
          {
            type: "SOLID",
            color: rgb(
              (
                p.parts?.[
                  name.endsWith("arm")
                    ? "Arms"
                    : name === "Seat"
                      ? "Seats"
                      : "Back"
                ] || p.material
              ).color,
            ),
          },
        ];
        tag(n, name.toLowerCase());
        front.appendChild(n);
      }
      textNode(
        frame,
        "Dimensions",
        `${(dims.width * 100).toFixed(0)} × ${(dims.depth * 100).toFixed(0)} × ${(dims.height * 100).toFixed(0)} cm`,
        65,
        front.y + h + 25,
        14,
      );
    }
    textNode(frame, "Title", p.facts.name, 35, 25, 28);
    textNode(
      frame,
      "Instructions",
      p.kind === "bottle"
        ? "Edit the front outline and artwork. Set depth, facets, and dimensions in the plugin."
        : p.kind === "assembly" ? "Front schematic: edit overall size or part colors. Use the 3D studio for shape changes." : "Edit the front frame size and part colors. Set sofa parts and depth in the plugin.",
      35,
      75,
      12,
    );
    let art = artwork;
    if (!art && (p.kind !== "assembly" || p.label.artwork)) {
      art = figma.createFrame();
      art.name = "Artwork · editable label";
      art.resize(240, 240);
      art.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.92, b: 0.84 } }];
      art.x = 480;
      art.y = 370;
      tag(art, "artwork");
      frame.appendChild(art);
      textNode(art, "Label text", p.label.text, 25, 90, 38);
    } else if (art) {
      const label = art.children.find((n) => n.name === "Label text");
      if (label?.type === "TEXT") {
        for (const part of label.getStyledTextSegments(["fontName"]))
          await figma.loadFontAsync(part.fontName);
        label.characters = p.label.text;
      }
    }
    if(art&&p.label.artwork){
      const previous=art.children.find(n=>n.getPluginData('kalpiGeneratedArtwork')==='1');
      const illustration=figma.createNodeFromSvg(labelArtSvg(p.label.artwork));
      illustration.name='AI artwork · editable vectors and text';illustration.setPluginData('kalpiGeneratedArtwork','1');
      art.appendChild(illustration);illustration.x=0;illustration.y=0;
      for(const line of p.label.artwork.texts){
        const node=figma.createText();const fontName={family:line.font==='serif'?'Georgia':'Inter',style:line.weight==='bold'?'Bold':'Regular'};
        try{await figma.loadFontAsync(fontName);node.fontName=fontName;}catch{await figma.loadFontAsync({family:'Inter',style:'Regular'});node.fontName={family:'Inter',style:'Regular'};}
        node.fontSize=line.size;node.characters=line.text;node.name='Artwork text · '+line.text;
        const hex=line.color.slice(1);node.fills=[{type:'SOLID',color:{r:parseInt(hex.slice(0,2),16)/255,g:parseInt(hex.slice(2,4),16)/255,b:parseInt(hex.slice(4,6),16)/255}}];
        illustration.appendChild(node);node.x=line.x-node.width/2;node.y=line.y-line.size;
      }
      illustration.rescale(art.width/1000);if(previous)previous.remove();
    }
    frame.setPluginData("kalpiDesignId", row.id);
    frame.setPluginData("kalpiProjectId", row.projectId);
    frame.setPluginData("kalpiRevision", String(row.revision));
    frame.setPluginData("kalpiDocument", JSON.stringify(p));
    frame.setPluginData("kalpiPPM", String(ppm));
    frame.setRelaunchData({ edit: "Edit this product in Kalpi" });
    frame.setPluginData("kalpiFingerprint", fingerprint(frame));
    frame.setPluginData("kalpiPending", "");
    active = frame;
    lastApplied = row.id + ":" + row.revision;
    pending = false;
    send({
      type: "template-applied",
      designId: row.id,
      nodeId: frame.id,
      revision: row.revision,
    });
    if (!existing) {
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
    }
  } finally {
    suppressed--;
  }
}
function diff(a, b) {
  return EDIT_FIELDS.filter((f) => !f.startsWith("figma.")).flatMap((field) => {
    const [s, k] = field.split(".");
    return JSON.stringify(a[s]?.[k]) === JSON.stringify(b[s]?.[k])
      ? []
      : [{ field, value: b[s][k] }];
  });
}
function fingerprint(frame) {
  const node = (n) => ({
    id: n.id,
    type: n.type,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    rotation: n.rotation,
    paths: n.type === "VECTOR" ? n.vectorPaths : undefined,
    fills: n.fills,
    text: n.type === "TEXT" ? n.characters : undefined,
    children: n.children?.map(node),
  });
  if (frame.getPluginData("kalpiImport") === "true" || !frame.getPluginData("kalpiDesignId")) return JSON.stringify(node(frame));
  return JSON.stringify(
    frame.children
      .filter((n) =>
        ["front", "artwork"].includes(n.getPluginData("kalpiPart")),
      )
      .map(node),
  );
}
async function readChanges(convert = false) {
  if (!active || active.removed || suppressed) return;
  try {
    if (active.getPluginData("kalpiImport") === "true") {
      if (convert) {
        const p = JSON.parse(active.getPluginData("kalpiDocument"));
        await exportSelection({ nodeId: active.id, dimensions: p.dimensions, source: p.scale.source });
      } else send({ type: "sync-error", message: "Your Figma artwork changed. Click Convert this design to 3D to update its outlines." });
      return;
    }
    const original = JSON.parse(active.getPluginData("kalpiDocument")),
      p = JSON.parse(JSON.stringify(original)),
      ppm = Number(active.getPluginData("kalpiPPM")),
      front = active.children.find(
        (n) => n.getPluginData("kalpiPart") === "front",
      );
    if (!front)
      throw Error("The editable front view was removed. Restore the template.");
    p.dimensions.width = +(front.width / ppm).toFixed(6);
    p.dimensions.height = +(front.height / ppm).toFixed(6);
    if (p.kind === "bottle") {
      const outline = front.children.find(
        (n) => n.getPluginData("kalpiPart") === "profile",
      );
      if (!outline || outline.type !== "VECTOR")
        throw Error("Keep the tagged body outline as a vector.");
      const path = outline.vectorPaths;
      if (path.length !== 1 || /[CQASTHV]/i.test(path[0].data))
        throw Error(
          "Use straight outline segments and move paired nodes symmetrically. Curves and compound paths are not supported.",
        );
      const nums =
        path[0].data.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
      let points = [];
      for (let i = 0; i < nums.length; i += 2)
        points.push([nums[i], nums[i + 1]]);
      if (
        points.length > 2 &&
        Math.hypot(
          points[0][0] - points[points.length - 1][0],
          points[0][1] - points[points.length - 1][1],
        ) < 0.001
      )
        points.pop();
      if (points.length < 4 || points.length % 2)
        throw Error("Use matching left and right outline points.");
      const minX = Math.min(...points.map((p) => p[0])),
        maxX = Math.max(...points.map((p) => p[0])),
        minY = Math.min(...points.map((p) => p[1])),
        maxY = Math.max(...points.map((p) => p[1]));
      const half = points.length / 2,
        profile = [];
      for (let i = 0; i < half; i++) {
        const left = points[i],
          right = points[points.length - 1 - i];
        if (
          Math.abs(left[1] - right[1]) > 0.1 ||
          Math.abs(left[0] + right[0] - (minX + maxX)) > 0.1
        )
          throw Error(
            "The bottle outline must stay symmetric. Move matching nodes together.",
          );
        profile.push([
          +(1 - (left[1] - minY) / (maxY - minY)).toFixed(6),
          +((right[0] - left[0]) / (maxX - minX)).toFixed(6),
        ]);
      }
      p.shape.profile = profile;
      p.shape.neckRatio = profile[profile.length - 1][1];
      const fill = outline.fills?.[0];
      if (fill?.type === "SOLID") {
        const color =
          "#" +
          [fill.color.r, fill.color.g, fill.color.b]
            .map((x) =>
              Math.round(x * 255)
                .toString(16)
                .padStart(2, "0"),
            )
            .join("");
        if (p.parts?.Body) p.parts.Body.color = color;
        else p.material.color = color;
      }
      const cap=front.children.find(n=>n.getPluginData('kalpiPart')==='cap'),capFill=cap?.fills?.[0];
      if(capFill?.type==='SOLID'){
        const color='#'+[capFill.color.r,capFill.color.g,capFill.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
        const finish=original.parts?.Cap||{type:'satin',color:'#29262c',roughness:.25,metalness:.65};
        if(color!==finish.color)p.parts.Cap={...finish,color};
      }
    } else if (p.kind === "assembly") {
      for(const n of front.children) {
        const index=Number(n.getPluginData("kalpiPart").replace("component-","")), fill=n.fills?.[0];
        if(p.shape.components[index] && fill?.type === "SOLID") p.shape.components[index].color="#"+[fill.color.r,fill.color.g,fill.color.b].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join("");
      }
    } else {
      p.shape.backHeight = p.dimensions.height - p.shape.seatHeight;
      for (const n of front.children) {
        const fill = n.fills?.[0],
          key = n.name.endsWith("arm")
            ? "Arms"
            : n.name === "Seat"
              ? "Seats"
              : "Back";
        if (fill?.type === "SOLID") {
          const color =
            "#" +
            [fill.color.r, fill.color.g, fill.color.b]
              .map((x) =>
                Math.round(x * 255)
                  .toString(16)
                  .padStart(2, "0"),
              )
              .join("");
          const existing = p.parts?.[key] || p.material;
          if (color !== existing.color) p.parts[key] = { ...existing, color };
        }
      }
    }
    const art = active.children.find(
      (n) => n.getPluginData("kalpiPart") === "artwork",
    );
    const label = art?.children.find((n) => n.name === "Label text");
    if (label?.type === "TEXT") p.label.text = label.characters;
    validateProduct(p);
    const signature = fingerprint(active),
      designId = active.getPluginData("kalpiDesignId"),
      baseRevision = Number(active.getPluginData("kalpiRevision"));
    if(convert) send({type:'structured-preview',designId,document:p});
    const bytes = art
      ? Array.from(
          await art.exportAsync({
            format: "PNG",
            constraint: { type: "WIDTH", value: 1024 },
          }),
        )
      : null;
    if (signature !== fingerprint(active)) {
      clearTimeout(timer);
      timer = setTimeout(() => readChanges(convert), 700);
      return;
    }
    pending = true;
    active.setPluginData("kalpiPending", "true");
    send({
      type: "figma-change",
      designId,
      baseRevision,
      changes: diff(original, p),
      bytes,
      fingerprint: signature,
      document: p,
      convert,
      nodeId: active.id,
    });
  } catch (e) {
    pending = true;
    if (active) active.setPluginData("kalpiPending", "true");
    send({ type: "sync-error", message: e.message });
  }
}
function changed(event) {
  if (suppressed || !active || active.removed) return;
  if (fingerprint(active) === active.getPluginData("kalpiFingerprint")) return;
  const relevant = event.nodeChanges.some((c) => {
    let n = c.node;
    while (n) {
      if (n === active) return true;
      n = n.parent;
    }
    return c.type === "DELETE";
  });
  if (!relevant) return;
  pending = true;
  active.setPluginData("kalpiPending", "true");
  clearTimeout(timer);
  send({ type: "sync-pending" });
  timer = setTimeout(() => readChanges(), 700);
}
function announce() {
  if (!active) return;
  pending =
    active.getPluginData("kalpiPending") === "true" ||
    fingerprint(active) !== active.getPluginData("kalpiFingerprint");
  send({
    type: "selected-design",
    designId: active.getPluginData("kalpiDesignId"),
    nodeId: active.id,
    pending,
  });
  if (pending) send({ type: "sync-pending" });
}
function watch() {
  page?.off("nodechange", changed);
  page = figma.currentPage;
  page.on("nodechange", changed);
  active = selectedRoot() || (sourceNode()?.getPluginData("kalpiDesignId") ? sourceNode() : null);
  announce();
  describeSelection();
}
figma.on("currentpagechange", watch);
figma.on("selectionchange", () => {
  const n = selectedRoot();
  active = n;
  if (n) announce();
  describeSelection();
});
figma.on("close", () => clearTimeout(timer));
figma.ui.onmessage = async (m) => {
  try {
    if(m.type==='read-selected-label'){
      const nodes=figma.currentPage.selection;
      if(nodes.length!==1||!('exportAsync' in nodes[0]))return send({type:'selected-label',designId:m.designId,error:'Select one label frame or artwork layer in Figma.'});
      const bytes=await nodes[0].exportAsync({format:'PNG',constraint:{type:'WIDTH',value:1024}});
      send({type:'selected-label',designId:m.designId,bytes:Array.from(bytes)});
    }
    if(m.type==='place-product-preview'){
      if(typeof m.data!=='string'||!m.data.startsWith('data:image/jpeg;base64,')||m.data.length>4000000)throw Error('Invalid preview image.');
      const image=figma.createImage(figma.base64Decode(m.data.split(',')[1])),rect=figma.createRectangle();
      rect.resize(900,400);rect.name=String(m.name||'Kalpi 3D preview').slice(0,100);rect.fills=[{type:'IMAGE',imageHash:image.hash,scaleMode:'FIT'}];
      rect.x=figma.viewport.center.x-450;rect.y=figma.viewport.center.y-200;figma.currentPage.selection=[rect];figma.viewport.scrollAndZoomIntoView([rect]);figma.notify('3D preview placed on your canvas');
    }

    if (m.type === 'link-generated-model') {
      const board=await figma.getNodeByIdAsync(m.boardId);
      if(board && !board.removed && typeof m.designId==='string')board.setPluginData('kalpiSourceDesignId',m.designId);
    }
    if (["read-bottle-board","read-product-board"].includes(m.type)) await readProductBoard(m.forceImage === true);
    if (["read-bottle-label","read-product-label"].includes(m.type)) {
      const board=await figma.getNodeByIdAsync(m.boardId);
      const label=await figma.getNodeByIdAsync(m.nodeId);
      let ancestor=label;
      while(ancestor && ancestor!==board) ancestor=ancestor.parent;
      if(!board || !label || ancestor!==board || !["FRAME","GROUP"].includes(label.type)) {
        send({type:"bottle-label",bytes:null});
      } else {
        const bytes=await label.exportAsync({format:"PNG",constraint:{type:"WIDTH",value:1024}});
        send({type:"bottle-label",bytes:Array.from(bytes)});
      }
    }
    if (["create-recognized-bottle","create-recognized-product"].includes(m.type)) {
      const board=await figma.getNodeByIdAsync(m.boardId);
      if(board) board.setPluginData('kalpiSourceDesignId',m.design.id);
      const existing=figma.currentPage.findAll(n=>n.getPluginData("kalpiDesignId")===m.design.id)[0];
      await writeTemplate(m.design,existing||null);
      if(board && active && !existing) { active.x=board.x+board.width+80; active.y=board.y; }
      if(!existing && m.labelNodeId) {
        const original=await figma.getNodeByIdAsync(m.labelNodeId);
        let ancestor=original; while(ancestor && ancestor!==board) ancestor=ancestor.parent;
        if(original && ancestor===board && ["FRAME","GROUP"].includes(original.type)) {
          suppressed++;
          try {
            const art=active.children.find(n=>n.getPluginData("kalpiPart")==="artwork");
            const copy=original.clone(); tag(copy,"artwork"); copy.name="Artwork · original label";
            active.appendChild(copy); copy.x=480;copy.y=370; art?.remove();
            active.setPluginData("kalpiFingerprint",fingerprint(active));
          } finally { suppressed--; }
        }
      }
      send({type:"recognized-bottle-ready",designId:m.design.id});
    }
    if (m.type === "inspect-selection") describeSelection();
    if (m.type === "export-selection") await exportSelection(m);
    if (m.type === "import-linked") {
      const node = await figma.getNodeByIdAsync(m.nodeId);
      if (!node || node.removed) throw Error("The original Figma layer was removed.");
      node.setPluginData("kalpiImport", "true");
      node.setPluginData("kalpiDesignId", m.design.id);
      node.setPluginData("kalpiProjectId", m.design.projectId);
      node.setPluginData("kalpiDocument", m.design.document);
      node.setPluginData("kalpiRevision", String(m.design.revision));
      node.setPluginData("kalpiFingerprint", m.fingerprint);
      node.setPluginData("kalpiPending", "");
      active = node; pending = false; lastApplied = m.design.id + ":" + m.design.revision;
      describeSelection();
    }
    if (m.type === "ready") {
      send({ type: "plugin-ready", protocol: 8 });
      watch();
    }
    if (m.type === "save-studio-session" || m.type === "restore-studio-session") {
      // Credentials stay in per-user plugin storage, never in shared Figma nodes.
      if (!/^https:\/\/(kalpi-roan\.vercel\.app|kalpi-staging-eight\.vercel\.app)\/plugin\.html\?project=[a-zA-Z0-9-]+$/.test(m.url || "") &&
          !/^http:\/\/localhost:(3000|3002|3100)\/plugin\.html\?project=[a-zA-Z0-9-]+$/.test(m.url || "")) throw Error("Unrecognized Kalpi workspace.");
      const key = "kalpiSession:" + m.url;
      if (m.type === "save-studio-session") {
        if (typeof m.token !== "string" || !m.token || m.token.length > 16000) throw Error("Invalid studio session.");
        await figma.clientStorage.setAsync(key, m.token);
        await figma.clientStorage.setAsync("kalpiPanel", m.url);
        nativeLaunchURL = m.url;
      } else send({type:"studio-session",token:await figma.clientStorage.getAsync(key) || null});
      return;
    }
    if (m.type === "reset-panel") {
      nativeLaunchURL = null;
      await figma.clientStorage.deleteAsync("kalpiPanel");
      showPanel();
      return;
    }
    if(m.type === "launch-native") {
      if(!/^https:\/\/(kalpi-roan\.vercel\.app|kalpi-staging-eight\.vercel\.app)\/plugin\.html(?:[?#]|$)/.test(m.url||"")) throw Error("Use your Kalpi studio link.");
      nativeLaunchURL=m.url;
      showPanel();
      return;
    }
    if (m.type === "bootstrap-ready") {
      await restorePanel();
    }
    if (m.type === "remember-panel" && /^https?:\/\//.test(m.url))
      await figma.clientStorage.setAsync("kalpiPanel", m.url);
    if (m.type === "duplicate-template" && active) {
      if (JSON.parse(m.design.document).kind === "freeform") throw Error("Duplicate the original layers in Figma, then convert the copy.");
      const copy = active.clone();
      copy.x = active.x + 840;
      await writeTemplate(m.design, copy);
      figma.currentPage.selection = [copy];
      await readChanges();
    }
    if(m.type==='ensure-template'){
      const existing=figma.currentPage.findAll(n=>n.getPluginData('kalpiDesignId')===m.design.id)[0];
      if(existing){active=existing;figma.currentPage.selection=[existing];figma.viewport.scrollAndZoomIntoView([existing]);send({type:'template-applied',designId:m.design.id,revision:Number(existing.getPluginData('kalpiRevision'))});}
      else await writeTemplate(m.design);
    }
    if (m.type === "create-template") {
      if(JSON.parse(m.design.document).shape?.modelId)throw Error("Use Place preview in Figma for a detailed model. Its mesh is edited in the 3D panel.");
      if (JSON.parse(m.design.document).kind === "freeform") throw Error("This design already uses your original Figma layers. Select them on the canvas.");
      await writeTemplate(m.design);
    }
    if (m.type === "remote-design") {
      if(JSON.parse(m.design.document).shape?.modelId)return;
      const frames = figma.currentPage.findAll(
        (n) => n.getPluginData("kalpiDesignId") === m.design.id,
      );
      const frame = frames[0];
      if (!frame) {send({type:"sync-unlinked",message:"3D saved. Click Create editable Figma views to link native layers for this design."});return;}
      if (
        pending ||
        frame.getPluginData("kalpiPending") === "true" ||
        fingerprint(frame) !== frame.getPluginData("kalpiFingerprint")
      ) {
        send({
          type: "sync-error",
          message:
            "The website changed while you were editing. Convert your local changes first, or refresh to restore the saved design.",
        });
        return;
      }
      if (lastApplied !== m.design.id + ":" + m.design.revision) {
        if (frame.getPluginData("kalpiImport") === "true") await updateImported(m.design, frame);
        else await writeTemplate(m.design, frame);
      }
    }
    if (m.type === "prepare-convert" && active) {
      await writeTemplate(m.design, active);
      await readChanges(true);
    }
    if (m.type === "convert") await readChanges(true);
    if (m.type === "retry") await readChanges(false);
    if (
      m.type === "sync-ack" &&
      active &&
      active.getPluginData("kalpiDesignId") === m.design.id
    ) {
      active.setPluginData("kalpiDocument", m.design.document);
      active.setPluginData("kalpiRevision", String(m.design.revision));
      lastApplied = m.design.id + ":" + m.design.revision;
      if (fingerprint(active) === m.fingerprint) {
        pending = false;
        active.setPluginData("kalpiPending", "");
        active.setPluginData("kalpiFingerprint", m.fingerprint);
      } else {
        pending = true;
        clearTimeout(timer);
        timer = setTimeout(() => readChanges(), 700);
      }
    }
    if (m.type === "open-studio" && /^https?:\/\//.test(m.url))
      figma.openExternal(m.url);
    if (m.type === "restore-template" && active) {
      if (active.getPluginData("kalpiImport") === "true") throw Error("Original artwork is preserved. Reconvert it to update the 3D outlines; use Figma undo to restore artwork.");
      await writeTemplate(m.design, active);
    }
  } catch (e) {
    send({
      type: "sync-error",
      operation: ["create-recognized-bottle", "create-recognized-product"].includes(m.type) ? "create-recognized-product" : m.type,
      designId: m.design?.id,
      message: e.message || "Figma could not update this product.",
    });
  }
};

// Register the message handler before the panel can request its saved connection.
showPanel();
