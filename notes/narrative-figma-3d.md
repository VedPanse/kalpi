# Kalpi: the Figma → 3D narrative

Built from four research reports (~98 papers and sources) in `notes/research/`. Figma's representatives were most interested in turning 2D objects into 3D, so this is the story.

## The one line
**"Generators guess. Figma knows."**
Kalpi turns any Figma frame into a real-size, editable 3D product: the AI only supplies the depth it has to guess, and everything Figma already knows (vectors, millimetres, labels, layers, styles) makes it exact, sharp and on-brand.

Tagline options:
- *Every Figma frame, a real product.*
- *Figma made every designer a UI engineer. Kalpi makes every frame a product.*

## The story in five beats

**1. Designers want 3D and have asked for years.**
Figma's forum has years of unanswered requests: "forced to go in Adobe", layers "extruded into simple 3D objects", "add Z axis", "we do not need to create complex shapes". Plugins can only place static images; Spline embeds stay invisible on the canvas.

**2. The tools they're sent to don't fit how designers work.**
- Pro 3D software buries newcomers in "hundreds of icons, menus" (ScaffoldUI).
- AI text-to-3D is fast, but people "struggle to specify spatial structure (layout, scale)" in words (From Prompts to Worlds), and professionals call the meshes "not usable in a final product" (CHI '26).
- AI 3D models work in a unit cube: no real size, blurry text and logos, an invented back, one fused shell, millions of faces (27 image-to-3D papers, 2023–2026).
- Wrong size is not a cosmetic problem: AR reduces returns *only when it shows true size* (EMAC 2025).

**3. The insight: Figma already holds the answers the AI is guessing.**
| What AI guesses | What Figma already knows |
|---|---|
| Size | 1 px = 1 mm on a frame |
| Silhouette | The exact vector outline |
| Label and logo | The crisp artwork itself |
| Parts | Layers and groups |
| Materials | Layer names and styles (glass, metal, matte) |
| Variants | Duplicated frames, variables |

**4. Kalpi: a shape grammar over Figma's layers, AI only where needed.**
Each layer gets the right operation, picked from its shape and name:
- **Spin** (lathe): round products from a half-outline (bottles, jars, candles, cans). *Built.*
- **Wrap**: label frames onto the product at true printed size. *Built.*
- **Extrude + bevel**: logos, icons, flat products, text.
- **Fold**: packaging dielines (dashed = crease, solid = cut) into a real box.
- **Inflate**: soft, organic shapes and mascots.
- **AI fill-in**: only what geometry can't describe (pump heads, handles), via TRELLIS / TRELLIS 2 (MIT licence; $0.02–0.35 per model on fal), then snapped to Figma's size and silhouette, with the crisp label re-projected.

This unifies ideas research proved separately (Teddy's inflation, Monster Mash's layers-as-depth, Origami's named dieline layers) over Figma's scene graph. No system in the literature reads a designer's full vector + layer + naming structure and picks the operation per layer.

**5. And it stays a design tool.**
- Direct manipulation first, prompts second: drag depth and bevel, prompt only for style. (DirectGPT: 50% faster, 50% fewer prompts.)
- Live sync: edit the Figma vector or label and the 3D updates; parameters live on the node.
- Out comes web-ready 3D: ~30k faces instead of ~2M, GLB + USDZ for AR at true size, React + three.js that runs in Figma Make. Later: print and factory files (3MF/STL, flattened dieline PDF, STEP for simple shapes).

## Why Figma, and why now
- **We don't compete with Figma, we extend it.** Sellers' and designers' work already lives there, and Figma has scaled far beyond anything we'd build.
- **Figma is heading here.** Config 2026 announced 3D Transforms (flat layers tilted in depth, exported to CSS), Code Layers, Make, Sites and Generative Plugins. Kalpi is the next step: real geometry from vectors, plugged into Make and Sites.
- **The models just got good and cheap.** Open, MIT-licensed models (TRELLIS 2) generate PBR assets in seconds; a model costs cents.
- **Distribution:** a Figma plugin plus Community templates (bottles, boxes, devices, logo extrusions) that every remix spreads.

## The demo moment
1. Select a label and a half-outline in Figma → a real-size bottle appears; drag depth.
2. Select a logo → it extrudes with a bevel and a metal material from the layer name.
3. Drop in a product photo → AI makes the shape → Kalpi snaps it to the Figma size and **re-projects the Figma label: blurry AI text becomes razor-sharp Figma type.** (The headline.)
4. Click → it's live in Figma Make, in a 3D store, and in AR at true size.

## Before / after to measure
- Figma vector → web-ready 3D: Kalpi vs Blender/Spline (minutes vs hours); app switches (0 vs 2+); prompts per asset.
- Quality: % exports watertight and opening in three.js/Make; size error vs source mm; file size (2M → 30k faces).
- Designer confidence 1–5; NASA-TLX.

## Scale and business
- Simple shapes cost $0 (pure geometry); AI only for organic parts, $0.02–0.35 each on fal, or ~$0.01–0.02 self-hosted on an H100 (est.).
- Cache by node + parameters: label and colour edits never regenerate the shape. Variants are texture swaps.
- Free plugin → Pro for AI shapes, AR and manufacturing exports → commerce (3D store, demand tests, manufacturer matching) as the next layer.

## For the Figma interview
- "We started from your users' own words on the forum."
- "We use your scene graph as the 3D blueprint: layers, names, sizes, styles."
- "We extend 3D Transforms from tilted planes to real objects, and hand off to Make and Sites."
- Ask them: Plugin API for code layers? A native 3D node? Interest in a 3D Community template category?

## What to build next (~hours)
1. Extrude + bevel for flat vectors and logos (1–2 h).
2. AI fill-in on fal (TRELLIS 2) + snap to Figma size + label re-projection (3–4 h): the headline moment.
3. Materials from layer names; decimate + GLB/USDZ export with AR at true size (2 h).
4. Fold dielines into boxes (2–3 h).
5. Live sync with setPluginData; depth/bevel sliders (1–2 h).
