# Research 2: structured 2D (vectors, sketches, CAD, code) → 3D

24 sources opened (some abstract-only, marked).

## Systems
| # | System | In → out | Editable? | Limitation |
|---|---|---|---|---|
| 1 | [Teddy](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf) | Silhouette strokes → inflated mesh; extrude, cut | Gestures | unintuitive results; no creases; imprecise |
| 2 | [FiberMesh](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/fibermesh/) | Curves → smooth surface | Curves stay live handles | no dimensions |
| 3 | [Monster Mash](https://dcgi.fel.cvut.cz/wp-content/wpallimport-dist/publications/pdf/publications-2020-dvoroznak-tog-mm-paper.pdf) | Ordered overlapping regions (≈ layers) → inflated, animatable mesh | Real-time drag | single-view depth order; weak depth control |
| 4 | [Ink-and-Ray](https://dcgi.fel.cvut.cz/~sykorad/ink-and-ray.html) | Layered drawing + depth notes → bas-relief | Notes | shallow proxy |
| 5 | [Sketch2Model](https://ar5iv.arxiv.org/html/2105.06663) | Sketch → template-deformed mesh | Viewpoint | per-category; sketch domain gap |
| 6 | [SketchSampler](https://arxiv.org/abs/2208.06880) (abstract) | Sketch → point cloud | No | point cloud only |
| 7 | [SketchDream](https://arxiv.org/html/2405.06461) | Sketch + text → NeRF; local edits | Local regen | ~1–1.5 h per result |
| 8 | [Sketch2CAD](https://arxiv.org/abs/2009.04927) (abstract) | Stroke + CAD model → CAD op + params | Parametric | 4 ops; synthetic data |
| 9 | [DeepCAD](https://arxiv.org/abs/2105.09492) (abstract) | CAD command sequences; 178k models | Sequences | sketch+extrude only |
| 10 | [SkexGen](https://arxiv.org/abs/2207.04632) (abstract) | Disentangled codes → CAD sequence | Codes | sketch+extrude only |
| 11 | [CAD-LLM](https://research.autodesk.com/app/uploads/2024/05/cadllm_neurips2023_workshop-1.pdf) | Partial 2D sketch → completion | Yes | 2D only; 22.5% accuracy |
| 12 | [Text2CAD](https://arxiv.org/html/2409.17106) | Text → sketch+extrude; 660k texts | Parametric | skewed to boxes/cylinders; ~1% invalid |
| 13 | [CAD-Recode](https://arxiv.org/html/2412.14042) | Point cloud → CadQuery code | Code = params | no revolve/fillets |
| 14 | [CADCodeVerify](https://arxiv.org/html/2410.05340) | Text → CadQuery → render → self-check → fix → STL | Code | metrics miss logic errors |
| 15 | [Zoo Text-to-CAD](https://zoo.dev/research/introducing-text-to-cad), [product](https://zoo.dev/text-to-cad) | Text → KCL + B-Rep; API | Fully parametric | built for engineers |
| 16 | [3D-GPT](https://arxiv.org/html/2310.12945) | Text → agents → Infinigen calls | Stepwise | weak curve control |
| 17 | [BlenderLLM](https://arxiv.org/html/2412.14203) | Text → bpy script | Script | basic shapes, no materials |
| 18 | [LLaMA-Mesh](https://arxiv.org/html/2411.09595) | Text ↔ OBJ text | Raw vertices | ≤500 faces |
| 19 | [MeshGPT](https://arxiv.org/abs/2311.15475) (abstract) | Triangle tokens → artist mesh | No | triangles only |
| 20 | [MeshAnything](https://arxiv.org/html/2406.10163) | Any 3D → artist mesh | No | ≤800 faces |
| 21 | [Holodeck](https://arxiv.org/html/2312.09067) | Text → LLM relations → solver places assets | Conversational | ~3 min, $0.20/room |
| 22 | [Origami Simulator](https://experiments.withgoogle.com/origami-simulator) | SVG crease pattern → folded (three.js) | Fold % | all folds at once |
| 23 | [Origami (packaging app)](https://appsforlife.com/origami/) | Illustrator/SVG dieline; layer/path names define structure → folded GLTF/OBJ; dieline checks | Fold order, thickness | boxes only |
| 24 | [Box-folding sequences](https://arxiv.org/abs/2505.04257v2) (abstract) | Box state → fold sequences | – | robotics |

## Gaps
- Image/diffusion models lose exact geometry (no mm, no editable faces; SketchDream ~1 h).
- CAD models assume engineers and don't read design files; mostly extrude-only (no revolve: Kalpi's lathe fills this).
- Mesh LLMs are tiny (500–800 faces).
- Layers-as-structure exists only in narrow tools (Monster Mash inflate, Origami fold). **Nothing reads a designer's full vector + layer + naming structure and picks the operation per layer.**
- Nothing writes 3D parameters back into the 2D source.

## Smart moves (~20 h)
1. **Shape grammar over Figma nodes:** lathe (half-profile / `bottle/body`), extrude + bevel (closed flat shapes, logos, text), fold (dielines: dashed = crease, solid = cut), inflate (organic), wrap/decal (labels). Layer order = depth order. "Teddy + Monster Mash + Origami, unified over Figma's scene graph."
2. **LLM picks operations and parameters, never vertices:** send the layer tree as JSON, get `{node, op, params:{depth_mm, bevel_mm, axis}}`; deterministic code builds geometry (3D-GPT/Holodeck pattern).
3. **Render-and-check loop** (cheap CADCodeVerify): render 2–3 angles, ask a vision model, re-plan once.
4. **Parametric round-trip:** store the plan with `setPluginData`; editing vector/name regenerates; depth/bevel sliders write back to the node (FiberMesh idea, applied to Figma).
5. **Relations for assembly:** "cap on top of bottle, label centred" → small solver.

## Flows
- Product packshot: bottle half-profile + label + logo → lathe, wrap, emboss → React/three.js → Figma Make.
- Packaging: dieline (dashed = fold) + panel art → animated fold → same file exports print-ready dieline.
- Mascot/icon set: layers → inflate or extrude+bevel → consistent 3D brand assets.
- Plain-English edits: "cap taller, chamfer 1 mm" → parameters change on the node.

## Scale to manufacturing
- Parametric ops → exact solids: STL/3MF now; STEP via CadQuery (revolve/extrude/fillet map 1:1) or Zoo KCL.
- Packaging: dieline is the production file; add thickness/clearance checks; PDF/DXF/SVG with cut/crease/bleed.
- Labels flatten to print-ready PDF at real size.
- "The designer's file becomes the single source for renders, web 3D, prototypes and factory files."

Caveats: Illustrator 3D (Extrude/Revolve/Inflate) is the obvious comparison but its page returned 403; Repoussé not opened; no strong paper on dieline-to-3D (tools are the evidence).
