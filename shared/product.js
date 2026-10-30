import {validateLabelArt} from './label-art.js';
import {modelById} from './model-catalog.js';
export const SCHEMA_VERSION = 1;
export const MATERIALS = ["glass", "satin", "metal", "ceramic", "fabric"];
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function defaultProduct(kind = "bottle") {
  if (kind === "assembly") {
    const p = defaultProduct("bottle");
    p.kind = kind; p.dimensions = {width:.2,height:.2,depth:.2};
    p.material.color = "#ffffff"; p.facts.name = "Product concept"; p.label.text = "";
    p.shape = {components:[{name:"Body",type:"box",position:[0,0,0],size:[1,1,1],rotation:[0,0,0],color:"#87916b",material:"satin"}]};
    return p;
  }
  if (kind === "freeform") {
    const p = defaultProduct("bottle");
    p.kind = kind; p.dimensions = { width: .2, height: .2, depth: .02 };
    p.shape = { outlines: [{ points: [[0,0],[1,0],[1,1],[0,1]], holes: [], color: "#87916b" }] };
    p.material.color = "#ffffff"; p.facts.name = "Figma design"; p.label.text = "";
    return p;
  }
  return {
    schemaVersion: 1,
    kind,
    units: "m",
    upAxis: "Y",
    frontAxis: "+Z",
    dimensions:
      kind === "sofa"
        ? { width: 2, height: 0.85, depth: 0.9 }
        : { width: 0.065, height: 0.145, depth: 0.065 },
    scale: { confirmed: false, source: "design" },
    shape:
      kind === "sofa"
        ? {
            seatHeight: 0.42,
            armWidth: 0.12,
            backHeight: 0.43,
            legHeight: 0.12,
            seats: 3,
          }
        : {
            crossSection: "circle",
            facets: 8,
            bevel: 0.12,
            neckRatio: 0.28,
            capRatio: 0.17,
            profile: [
              [0, 0.8],
              [0.08, 1],
              [0.68, 1],
              [0.8, 0.28],
              [1, 0.28],
            ],
          },
    parts: {},
    material: {
      type: kind === "sofa" ? "fabric" : "satin",
      color: kind === "sofa" ? "#b8b0a4" : "#87916b",
      roughness: 0.35,
      metalness: 0,
    },
    label: {
      text: kind === "bottle" ? "SOLA" : "FORM",
      assetId: null,
      width: 0.65,
      height: 0.45,
      y: 0.38,
    },
    facts: {
      name: kind === "sofa" ? "Form sofa" : "Sola bottle",
      brand: "",
      sizeLabel: "",
      capacityMl: null,
      seating: kind === "sofa" ? 3 : null,
      price: null,
      currency: "USD",
    },
    figma: { fileUrl: "", nodeId: null },
  };
}
const finite = (v, min, max, name) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw Error(`${name} must be between ${min} and ${max}.`);
  return v;
};
const short = (v, max = 100) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export function validateProduct(input) {
  const p = clone(input);
  if (!["bottle", "sofa", "freeform", "assembly"].includes(p.kind))
    throw Error("Unsupported design type.");
  if (p.units !== "m" || p.upAxis !== "Y" || p.frontAxis !== "+Z")
    throw Error("Products must use meters, Y up and +Z front.");
  for (const key of ["width", "height", "depth"])
    finite(p.dimensions?.[key], 0.005, 10, key);
  if (
    !MATERIALS.includes(p.material?.type) ||
    !/^#[0-9a-f]{6}$/i.test(p.material?.color)
  )
    throw Error("Choose a supported material and color.");
  finite(p.material.roughness, 0, 1, "Roughness");
  finite(p.material.metalness, 0, 1, "Metalness");
  if(p.shape?.modelId && (p.kind!=="assembly" || !modelById(p.shape.modelId))) throw Error("Unknown library model.");
  if (p.kind === "bottle") {
    if (!["circle", "faceted", "rectangle", "triangular"].includes(p.shape.crossSection))
      throw Error("Unsupported cross-section.");
    finite(p.shape.facets, 4, 32, "Facets");
    if (!Number.isInteger(p.shape.facets))
      throw Error("Facets must be a whole number.");
    finite(p.shape.bevel, 0, 0.45, "Bevel");
    finite(p.shape.neckRatio, 0.1, 0.6, "Neck");
    finite(p.shape.capRatio, 0.05, 0.3, "Cap");
    const pts = p.shape.profile;
    if (!Array.isArray(pts) || pts.length < 2 || pts.length > 24)
      throw Error("Use 2–24 profile points.");
    let last = -1;
    for (const point of pts) {
      if (!Array.isArray(point) || point.length !== 2)
        throw Error("Invalid profile point.");
      finite(point[0], 0, 1, "Profile height");
      finite(point[1], 0.05, 1, "Profile width");
      if (point[0] <= last)
        throw Error(
          "The profile must progress from bottom to top without crossing itself.",
        );
      last = point[0];
    }
    if (pts[0][0] !== 0 || pts.at(-1)[0] !== 1 || !pts.some((x) => x[1] === 1))
      throw Error("Profile must span height 0–1 and reach full width 1.");
  } else if (p.kind === "assembly") {
    if (!Array.isArray(p.shape?.components) || p.shape.components.length < 1 || p.shape.components.length > 40) throw Error("Use 1–40 product parts.");
    for (const part of p.shape.components) {
      if (!["box","roundedBox","ellipsoid","cylinder","cone","torus","cup","loft","rim"].includes(part.type)) throw Error("Unsupported part geometry.");
      if(part.type === "loft") {
        if(!Array.isArray(part.sections)||part.sections.length<2||part.sections.length>24) throw Error("Use 2–24 loft sections.");
        let lastZ=-1;
        for(const section of part.sections) {
          if(!Array.isArray(section)||section.length!==6) throw Error("Invalid loft section.");
          section.forEach(n=>finite(n,0,1,"Loft section"));
          const [z,b,s,t,w,r]=section;
          if(z<=lastZ||b>=t||s<b||s>t||w<=0||w>.5||r<=0||r>w) throw Error("Invalid loft silhouette.");
          lastZ=z;
        }
        if(part.sections[0][0]!==0||lastZ!==1) throw Error("Loft sections must span 0–1.");
      }
      if(part.finish && !["lacquer","polishedMetal","powderCoat","ceramic"].includes(part.finish)) throw Error("Unsupported finish.");
      part.name = short(part.name,60) || "Part";
      if (!MATERIALS.includes(part.material) || !/^#[0-9a-f]{6}$/i.test(part.color)) throw Error("Invalid part material.");
      for (const [key,min,max] of [["position",-2,2],["size",.002,2],["rotation",-Math.PI*2,Math.PI*2]]) {
        if(!Array.isArray(part[key]) || part[key].length!==3) throw Error("Use three part coordinates.");
        for(const n of part[key]) finite(n,min,max,"Part "+key);
      }
    }
  } else if (p.kind === "freeform") {
    const outlines = p.shape?.outlines;
    if (!Array.isArray(outlines) || !outlines.length || outlines.length > 256) throw Error("Use 1–256 filled outlines. Select a simpler product layer.");
    let total = 0;
    for (const outline of outlines) {
      if (!/^#[0-9a-f]{6}$/i.test(outline.color)) throw Error("Invalid outline color.");
      if (!Array.isArray(outline.holes) || outline.holes.length > 64) throw Error("Too many outline holes.");
      for (const ring of [outline.points, ...outline.holes]) {
        if (!Array.isArray(ring) || ring.length < 3 || ring.length > 1024) throw Error("Invalid outline.");
        total += ring.length;
        for (const point of ring) {
          if (!Array.isArray(point) || point.length !== 2) throw Error("Invalid outline point.");
          finite(point[0], 0, 1, "Outline x"); finite(point[1], 0, 1, "Outline y");
        }
      }
    }
    if (total > 12000) throw Error("Design is too complex. Select a simpler product layer.");
  } else {
    for (const [k, min, max] of [
      ["seatHeight", 0.2, 1],
      ["armWidth", 0.02, 0.4],
      ["backHeight", 0.1, 1],
      ["legHeight", 0.02, 0.3],
    ])
      finite(p.shape[k], min, max, k);
    finite(p.shape.seats, 1, 5, "Seats");
    if (!Number.isInteger(p.shape.seats))
      throw Error("Seats must be a whole number.");
    if (
      p.shape.armWidth * 2 >= p.dimensions.width ||
      p.shape.seatHeight >= p.dimensions.height ||
      p.shape.legHeight + 0.12 >= p.shape.seatHeight ||
      p.dimensions.depth < 0.4 ||
      p.dimensions.width < 0.6
    )
      throw Error("Sofa parts must fit within its dimensions.");
    if (
      Math.abs(p.shape.seatHeight + p.shape.backHeight - p.dimensions.height) >
      0.001
    )
      throw Error("Seat height plus back height must equal total height.");
  }
  p.parts = p.parts || {};
  for (const [part, m] of Object.entries(p.parts)) {
    if (
      ![
        "Body",
        "Cap",
        "Label",
        "Base",
        "Seats",
        "Back",
        "Arms",
        "Legs",
      ].includes(part) ||
      !MATERIALS.includes(m?.type) ||
      !/^#[0-9a-f]{6}$/i.test(m?.color)
    )
      throw Error(`Unsupported ${part} finish. Use type ${MATERIALS.join("/")} and a six-digit hex color such as #000000; received type ${String(m?.type)} and color ${String(m?.color)}.`);
    finite(m.roughness, 0, 1, "Part roughness");
    finite(m.metalness, 0, 1, "Part metalness");
  }
  p.label.text = short(p.label.text, 60);
  if(p.label.artwork!==undefined)p.label.artwork=validateLabelArt(p.label.artwork);
  for (const k of ["width", "height"])
    finite(p.label[k], 0.1, 0.9, `Label ${k}`);
  finite(p.label.y, 0.1, 0.8, "Label position");
  p.label.assetId =
    typeof p.label.assetId === "string" ? p.label.assetId : null;
  p.facts.name = short(p.facts.name);
  p.facts.brand = short(p.facts.brand);
  p.facts.sizeLabel = short(p.facts.sizeLabel);
  if (p.facts.price !== null) finite(p.facts.price, 0, 1000000, "Price");
  if (!/^[A-Z]{3}$/.test(p.facts.currency))
    throw Error("Use a three-letter currency code.");
  if (p.facts.capacityMl !== null)
    finite(p.facts.capacityMl, 1, 100000, "Capacity");
  if (p.facts.seating !== null)
    finite(p.facts.seating, 1, 20, "Seating capacity");
  p.scale = {
    confirmed: p.scale?.confirmed === true,
    source: short(p.scale?.source || "design", 300),
  };
  p.figma = {
    fileUrl: short(p.figma?.fileUrl, 500),
    nodeId: short(p.figma?.nodeId, 80) || null,
  };
  if (
    p.figma.fileUrl &&
    !/^https:\/\/(www\.)?figma\.com\/(design|file)\/[A-Za-z0-9]+/.test(
      p.figma.fileUrl,
    )
  )
    throw Error("Use a Figma Design file link.");
  if (p.reconstruction) {
    p.reconstruction = { method: short(p.reconstruction.method,40), summary: short(p.reconstruction.summary,1500), confidence: finite(p.reconstruction.confidence,0,1,"Recognition confidence") };
  }
  p.schemaVersion = 1;
  return p;
}
export const EDIT_FIELDS = [
  "dimensions.width",
  "dimensions.height",
  "dimensions.depth",
  "shape.crossSection",
  "shape.facets",
  "shape.bevel",
  "shape.neckRatio",
  "shape.capRatio",
  "shape.profile",
  "shape.outlines",
  "shape.components",
  "shape.seatHeight",
  "shape.armWidth",
  "shape.backHeight",
  "shape.legHeight",
  "shape.seats",
  "material.type",
  "material.color",
  "material.roughness",
  "material.metalness",
  "label.text",
  "label.artwork",
  "label.assetId",
  "label.width",
  "label.height",
  "label.y",
  "facts.name",
  "facts.brand",
  "facts.sizeLabel",
  "facts.capacityMl",
  "facts.seating",
  "facts.price",
  "facts.currency",
  "scale.confirmed",
  "scale.source",
  "figma.fileUrl",
  "figma.nodeId",
  "parts.Body",
  "parts.Cap",
  "parts.Label",
  "parts.Base",
  "parts.Seats",
  "parts.Back",
  "parts.Arms",
  "parts.Legs",
];
export function applyChanges(product, changes, { agent = false } = {}) {
  if(modelById(product.shape?.modelId)?.source === "graza-photo" && Array.isArray(changes) && changes.some(c=>c.field.startsWith("parts.Cap")))throw Error("This photo-derived model has no separately editable cap. Edit the overall finish, size or artwork instead.");
  if(product.shape?.modelId && Array.isArray(changes) && changes.some(c=>c.field.startsWith("shape."))) throw Error("This detailed model supports size, artwork and finish edits. Its mesh silhouette cannot be reshaped with primitive controls.");
  if (!Array.isArray(changes) || !changes.length || changes.length > 30)
    throw Error("Supply 1–30 product changes.");
  const result = clone(product);
  result.parts ??= {};
  for (const { field, value } of changes) {
    if (
      !EDIT_FIELDS.includes(field) ||
      (agent &&
        (field.startsWith("scale.") ||
          field.startsWith("figma.") ||
          field.startsWith("facts.")))
    )
      throw Error(`This action cannot change ${field}.`);
    const [section, key] = field.split(".");
    result[section][key] = value;
  }
  if (product.kind === "bottle") {
    if (changes.some((x) => x.field === "shape.profile"))
      result.shape.neckRatio = result.shape.profile.at(-1)[1];
    else if (changes.some((x) => x.field === "shape.neckRatio"))
      result.shape.profile[result.shape.profile.length - 1][1] =
        result.shape.neckRatio;
  }
  if (
    changes.some(
      (x) => x.field.startsWith("dimensions.") || x.field.startsWith("shape."),
    )
  )
    result.scale.confirmed = false;
  if (changes.some(c=>c.field.startsWith("dimensions.") && c.value!==product.dimensions[c.field.split(".")[1]]) && !changes.some(c=>c.field==="scale.source")) {
    result.scale.source = "Edited draft dimensions; confirm against physical measurements.";
  }
  return validateProduct(result);
}
export function publicProduct(p) {
  const copy = clone(p);
  delete copy.figma;
  return copy;
}
export function defaultLayout(template = "boutique") {
  return {
    template,
    style: template === "boutique" ? "apothecary" : "gallery",
    width: template === "boutique" ? 8 : 12,
    depth: template === "boutique" ? 10 : 14,
    height: 3.5,
    wallColor: template === "boutique" ? "#2f4a3c" : "#f1efea",
    floorColor: template === "boutique" ? "#8c6a43" : "#c9b79c",
    lighting: "warm",
    sign: "Kalpi / Discover your next favorite",
    fixtures:
      template === "boutique"
        ? [
            {
              id: "shelf-1",
              x: -1.6,
              z: -2,
              rotation: 0,
              width: 2,
              height: 1.2,
              depth: 0.6,
            },
            {
              id: "shelf-2",
              x: 1.6,
              z: -2,
              rotation: 0,
              width: 2,
              height: 1.2,
              depth: 0.6,
            },
          ]
        : [],
    placements: [],
  };
}
export function validateLayout(value) {
  const v = clone(value);
  if(v.scene && v.scene!=="ioanna")throw Error("Choose a supported store scene.");
  if(v.style && !["gallery","apothecary","stage","loft"].includes(v.style))throw Error("Choose a supported room style.");
  if (!["boutique", "showroom"].includes(v.template))
    throw Error("Choose a supported store template.");
  for (const k of ["width", "depth"]) finite(v[k], 4, 30, k);
  finite(v.height, 2.4, 6, "Room height");
  for (const k of ["wallColor", "floorColor"])
    if (!/^#[0-9a-f]{6}$/i.test(v[k])) throw Error("Invalid room color.");
  if (!["daylight", "warm", "cool"].includes(v.lighting))
    throw Error("Invalid lighting.");
  v.sign = short(v.sign, 120);
  if (
    !Array.isArray(v.fixtures) ||
    v.fixtures.length > 30 ||
    !Array.isArray(v.placements) ||
    v.placements.length > 40
  )
    throw Error("Store supports up to 30 fixtures and 40 product placements.");
  const ids = new Set();
  for (const f of v.fixtures) {
    if (!f.id || ids.has(f.id)) throw Error("Fixture IDs must be unique.");
    ids.add(f.id);
    finite(f.width, 0.2, 6, "Fixture width");
    finite(f.depth, 0.2, 3, "Fixture depth");
    finite(f.height, 0.2, 2.5, "Fixture height");
    finite(f.rotation, -Math.PI * 2, Math.PI * 2, "Rotation");
    finite(
      f.x,
      -v.width / 2 + f.width / 2,
      v.width / 2 - f.width / 2,
      "Fixture x",
    );
    finite(
      f.z,
      -v.depth / 2 + f.depth / 2,
      v.depth / 2 - f.depth / 2,
      "Fixture z",
    );
  }
  ids.clear();
  for (const p of v.placements) {
    if (!p.id || ids.has(p.id) || typeof p.versionId !== "string")
      throw Error("Invalid product placement.");
    ids.add(p.id);
    finite(p.x, -v.width / 2, v.width / 2, "Product x");
    finite(p.z, -v.depth / 2, v.depth / 2, "Product z");
    finite(p.y, 0, 3, "Product height");
    finite(p.rotation, -Math.PI * 2, Math.PI * 2, "Product rotation");
  }
  return v;
}

export const isHandheld = p => !!p && p.kind !== "sofa" && Math.max(p.dimensions.width,p.dimensions.height,p.dimensions.depth) <= .4;
