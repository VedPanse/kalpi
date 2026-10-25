// Runs inside Figma. It can read the file but cannot draw 3D,
// so it sends the selection to ui.html:
//  - frames, groups, rectangles → labels (exported as PNG)
//  - vectors → the product's shape (half its outline, 1 px = 1 mm, left edge = the centre line)

figma.showUI(__html__, { width: 480, height: 900, themeColors: true });

const MAX_LABELS = 3; // A, B and C
const SHAPE_TYPES = ["VECTOR", "LINE", "BOOLEAN_OPERATION", "STAR", "POLYGON", "ELLIPSE", "TEXT", "RECTANGLE"]; // frames and groups stay labels
let timer = null;

// a pasted photo or drawing: a layer whose fill is an image
function isPicture(n) {
  if ("fills" in n && Array.isArray(n.fills) && n.fills.some((f) => f.type === "IMAGE" && f.visible !== false)) return true;
  // a frame or group that just wraps one image (what Figma's AI makes) counts as that picture
  return "children" in n && n.children.length === 1 && isPicture(n.children[0]);
}

function isShape(n) {
  return SHAPE_TYPES.includes(n.type) && !isPicture(n);
}

function solidColor(node) {
  const fills = "fills" in node && Array.isArray(node.fills) ? node.fills : [];
  const strokes = "strokes" in node && Array.isArray(node.strokes) ? node.strokes : [];
  const paint = fills.find((p) => p.type === "SOLID" && p.visible !== false) ||
                strokes.find((p) => p.type === "SOLID" && p.visible !== false);
  if (!paint) return null;
  const c = paint.color;
  return [c.r, c.g, c.b];
}

async function sendSelection() {
  const sel = figma.currentPage.selection;
  const labels = [];
  const pictures = [];
  for (const node of sel.filter(isPicture).slice(0, 4)) {
    const scale = Math.min(2, 1024 / Math.max(node.width, node.height));
    const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: scale } });
    const t = node.absoluteTransform;
    pictures.push({ id: node.id, name: node.name, x: t[0][2], y: t[1][2], w: node.width, h: node.height, bytes });
  }
  for (const node of sel.filter((n) => !isShape(n) && !isPicture(n) && "exportAsync" in n && n.width > 0 && n.height > 0).slice(0, MAX_LABELS)) {
    const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
    labels.push({ id: node.id, name: node.name, width: node.width, height: node.height, bytes });
  }
  const shapes = [];
  for (const node of sel.filter(isShape)) {
    let paths = node.vectorPaths;
    if (!paths || !paths.length) {
      // ellipses, stars, text etc.: flatten a copy to get its outline, then delete the copy
      const copy = figma.flatten([node.clone()]);
      paths = copy.vectorPaths;
      copy.remove();
    }
    const t = node.absoluteTransform; // [[a, c, x], [b, d, y]]
    // pencil/pen lines with no fill: also send the outline of the stroke itself, so the drawn line can become 3D
    let linePaths = null, lx = t[0][2], ly = t[1][2];
    const hasFill = "fills" in node && Array.isArray(node.fills) && node.fills.some((f) => f.visible !== false);
    const hasStroke = "strokes" in node && Array.isArray(node.strokes) && node.strokes.some((f) => f.visible !== false);
    if (hasStroke && !hasFill && "outlineStroke" in node) {
      try {
        const o = node.outlineStroke();
        if (o) { linePaths = o.vectorPaths.map((p) => p.data); lx = o.absoluteTransform[0][2]; ly = o.absoluteTransform[1][2]; o.remove(); }
      } catch (e) {}
    }
    shapes.push({ id: node.id, name: node.name, x: t[0][2], y: t[1][2], w: node.width, h: node.height, paths: paths.map((p) => p.data), color: solidColor(node),
      line: linePaths && { paths: linePaths, x: lx, y: ly } });
  }
  figma.ui.postMessage({ type: "selection", labels, shapes, pictures });
}

// Wait a moment after edits so we don't export on every keystroke
function sendSoon() {
  clearTimeout(timer);
  timer = setTimeout(sendSelection, 250);
}

figma.on("selectionchange", sendSoon);

(async () => {
  await figma.loadAllPagesAsync(); // needed before listening to document changes
  figma.on("documentchange", sendSoon);
  sendSelection();
})();

// A starter outline the designer can bend, cut and move with Figma's own tools
const STARTER = {
  body: "M 0 0 L 15 0 L 15 14 L 20 22 L 33 40 L 36 62 L 36 208 L 34 212 L 0 212",
  cap: "M 0 0 L 17 0 L 17 26 L 0 26 Z",
};

figma.ui.onmessage = (msg) => {
  if (msg.type === "notify") figma.notify(msg.text);
  if (msg.type === "resize") figma.ui.resize(msg.width, msg.height);
  if (msg.type === "placeImage") {
    const image = figma.createImage(msg.bytes);
    image.getSizeAsync().then(({ width, height }) => {
      const rect = figma.createRectangle();
      const k = 300 / Math.max(width, height);           // place it 300 px (= 300 mm) across
      rect.resize(Math.round(width * k), Math.round(height * k));
      rect.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
      rect.name = msg.name || "Generated image";
      const c = figma.viewport.center; rect.x = c.x - rect.width / 2; rect.y = c.y - rect.height / 2;
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      figma.notify("Generated with AI: now it's 3D in the plugin");
    });
  }
  if (msg.type === "selectLayer") {
    figma.getNodeByIdAsync(msg.id).then((n) => { if (n) figma.viewport.scrollAndZoomIntoView([n]); figma.notify(n ? "Showing " + n.name : "Layer not found"); });
  }
  if (msg.type === "place") {
    const image = figma.createImage(msg.bytes);
    const rect = figma.createRectangle();
    const w = msg.width / 2, h = msg.height / 2; // the panel renders at 2x
    rect.resize(w, h);
    rect.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FIT" }];
    rect.name = msg.name;
    const sel = figma.currentPage.selection;
    if (sel.length) {
      const right = Math.max(...sel.map((n) => n.absoluteBoundingBox ? n.absoluteBoundingBox.x + n.absoluteBoundingBox.width : n.x + n.width));
      const top = Math.min(...sel.map((n) => n.absoluteBoundingBox ? n.absoluteBoundingBox.y : n.y));
      rect.x = right + 40; rect.y = top;
    } else {
      rect.x = figma.viewport.center.x - w / 2; rect.y = figma.viewport.center.y - h / 2;
    }
    figma.notify("Placed the 3D view on the canvas");
  }
  if (msg.type === "starter") {
    const c = figma.viewport.center;
    const body = figma.createVector();
    body.vectorPaths = [{ windingRule: "NONE", data: STARTER.body }];
    body.strokes = [{ type: "SOLID", color: { r: 0.6, g: 0.68, b: 0.58 } }];
    body.strokeWeight = 2;
    body.name = "Bottle body";
    body.x = c.x; body.y = c.y - 80;
    const cap = figma.createVector();
    cap.vectorPaths = [{ windingRule: "NONZERO", data: STARTER.cap }];
    cap.fills = [{ type: "SOLID", color: { r: 0.79, g: 0.65, b: 0.42 } }];
    cap.name = "Bottle cap";
    cap.x = c.x; cap.y = c.y - 80 - 26;
    figma.currentPage.selection = [cap, body];
    figma.viewport.scrollAndZoomIntoView([cap, body]);
    figma.notify("Bend, cut or move these. Left edge = the centre of the bottle, 1 px = 1 mm.");
  }
};
