# Research 3: designers and 3D in design tools (2015–2026)

18 papers + Figma's direction + forum demand, all opened. No peer-reviewed study of the Figma plugin ecosystem or of 3D/glTF designer–developer handoff was found: that gap itself is a pitch point.

**Pitch line:** "Figma made every designer a UI engineer. Kalpi makes every Figma frame a real product."

## Papers
| # | Paper | Finding | Limits |
|---|---|---|---|
| 1 | [3DALL-E](https://arxiv.org/abs/2210.11603) (DIS '23) | AI images inside Fusion 360 for reference/fixation/exploration; "prompt bibliographies" | small n; CAD only |
| 2 | [Dreamcrafter](https://arxiv.org/html/2512.20129v1) (CHI) | Prompting faster, sculpting feels more in control: sculpt the shape, prompt the details; 2D previews "lost size information" | 7 participants |
| 3 | ["I Just Need GPT to Refine My Prompts"](https://arxiv.org/html/2603.29118) (CHI '26) | Pros call generated meshes "not usable in a final product"; need concept vs production modes | 2 tools; lab |
| 4 | [Lost in Translation](https://www.research.autodesk.com/app/uploads/2026/04/lost-in-translation-chi2026.pdf) (CHI '26) | AI should work "in the 'native language' of their work" | subjective ratings |
| 5 | [ScaffoldUI](https://arxiv.org/pdf/2505.12101v1.pdf) | Pro 3D tools bury newcomers; simplified apps force a later context switch | constrained tasks |
| 6 | [From Prompts to Worlds](https://arxiv.org/abs/2603.13233) | Users can't specify layout/scale in words; slow, opaque iteration | one platform |
| 7 | [DirectGPT](https://arxiv.org/abs/2310.03691) (CHI '24 HM) | Direct manipulation: 50% faster, 50% fewer, 72% shorter prompts | – |
| 8 | [Sel3DCraft](https://arxiv.org/abs/2508.00428) (VIS '25) | Visual prompting makes text-to-3D guided | multi-view consistency |
| 9 | [LLMR](https://arxiv.org/abs/2309.12276) (CHI '24) | Prompted MR scenes, 4× fewer errors than GPT-4 | – |
| 10 | [Monster Mash](https://dcgi.fel.cvut.cz/home/sykorad/monster_mash) | 3D "without ever having to leave the 2D plane" | single view |
| 11 | [DreamSketch](https://research.autodesk.com/publications/dreamsketch-early-stage-3d-design-explorations-with-sketching-and-generative-design) (UIST '17) | Many 3D options early → better decisions | – |
| 12 | [Sketch2CAD](https://arxiv.org/abs/2009.04927) | Existing model resolves 2D ambiguity | 4 ops |
| 13 | [Magic3DSketch](https://arxiv.org/abs/2407.19225) | Sketch + text more controllable than text alone | sparse sketches |
| 14 | [SketchConcept](https://arxiv.org/abs/2508.07141) | Function reasoning broadens concepts | – |
| 15 | [Design Systems practice](https://ar5iv.labs.arxiv.org/html/2205.10713) | Design system = all-in-one design + dev environment | open-source only |
| 16 | [Tan et al., J. Marketing '22](https://www.kellogg.northwestern.edu/academics-research/research/detail/2022/augmented-reality-in-retail-and-its-impact-on-sales/?p=1) | AR lifts sales most for niche, pricey, less-known products, new customers | one category |
| 17 | [Virtual is so real!](https://ciencia.iscte-iul.pt/publications/virtual-is-so-real-consumers-evaluation-of-product-packaging-in-virtual-reality/92410) (Psych & Mkt '23) | Consumers judge packaging in VR almost as physical; faster, cheaper tests | minor cue differences |
| 18 | [Crear](https://www.politesi.polimi.it/handle/10589/125841) | AR edits on a physical pack; needs link to design software | markers |

## Figma's direction
- Config 2025: Make, Sites, Buzz, Draw ([summary](https://www.digidop.com/blog/figma-announces-figma-sites-and-thats-not-all)).
- [Config 2026](https://forum.figma.com/product-updates-3/everything-announced-at-config-2026-55221): Motion, shader fills, Weave in Design, Figma agent, **Generative Plugins**; coming: Code Layers, **3D Transforms** (planar layers rotated in depth, exported to CSS: [Design Compass](https://designcompass.org/en/2026/06/26/figma-motion-config-2026/)), not meshes or real-size objects.
- [Weave](https://alternativeto.net/news/2025/11/figma-acquires-ai-content-platform-weavy-launching-node-based-image-and-video-editing-tool/): image/video nodes, no 3D node.
- **Figma is going one step into depth (2.5D) and toward code. Real geometry from vectors is the open next step.**

## Forum demand (no staff replies)
[3D transforms](https://forum.figma.com/suggest-a-feature-11/3d-transforms-9604) ("forced to go in Adobe") · [3D tool](https://forum.figma.com/suggest-a-feature-11/3d-tool-41543) (2D layers "extruded into simple 3D objects") · [Add Z axis](https://forum.figma.com/suggest-a-feature-11/add-z-axis-2227) · [Interactive 3D viewer](https://forum.figma.com/suggest-a-feature-11/looking-for-a-way-to-implement-an-interactive-3d-viewer-in-figma-38853) (Spline 60 MB cap; plugins only static images) · [Spline integration](https://forum.figma.com/ask-the-community-7/figma-and-spline-a-better-integration-40878).

## Gaps
Different app, steep curve · prompts poor at space and scale · generated meshes not production-ready · no link to the design system · broken handoff (Spline invisible on canvas, size caps).

## Principles for Kalpi
Stay in Figma's native language · direct manipulation first, prompts second · real size by default · one click with a live preview while generating · live sync with layers and variables · separate concept and production modes · keep a generation history.

## Personas
- **Packaging designer:** dieline → folded real-size box → swap artwork variable → shelf view for testing (#17, #18).
- **Brand founder:** product photo → 3D → Make/Sites page or AR "view at real size" (#16).
- **UI designer:** logo vector → extrude + material from styles → three.js to Make/Sites with Motion (replaces the Spline round trip).

## Measuring value
Task time Figma → web-ready 3D vs Blender/Spline; app switches and prompts per asset (DirectGPT metric); % exports opening cleanly and watertight; size error vs source mm; NASA-TLX; 1–5 certainty; installs, return users, Community remixes, exports used in Make/Sites.
