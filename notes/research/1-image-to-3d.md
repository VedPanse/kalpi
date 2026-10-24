# Research 1: single-image / few-image to 3D (2023–2026)

27 papers opened. Models are very good at plausible shape and weak at what a product designer needs: real-world size, crisp text/logos, a faithful back, editable parts, light clean meshes, on-brand variants. Kalpi already has the designer's vectors, label artwork and mm sizes, which cover almost every gap.

**Pitch line:** "Generators guess; Figma knows. Kalpi fuses them: AI fills in the depth, and Figma's own vectors, mm sizes, labels, layers and tokens make it product-grade, editable and on-brand."

## Papers
| Model | Adds | In → out | Speed | Licence | Stated limits |
|---|---|---|---|---|---|
| [Zero-1-to-3](https://arxiv.org/abs/2303.11328) | Novel-view diffusion | image → views | – | code | synthetic training |
| [One-2-3-45](https://arxiv.org/abs/2306.16928) | Zero123 + reconstructor | image → mesh | 45 s | – | inconsistent views |
| [One-2-3-45++](https://arxiv.org/abs/2311.07885) | Consistent views + 3D diffusion | image → mesh | ~60 s | – | – |
| [LRM](https://arxiv.org/abs/2311.04400) | Large feed-forward NeRF | image → mesh | 5 s | – | – |
| [Instant3D](https://arxiv.org/abs/2311.06214) | 4 views + reconstructor | text → NeRF | 20 s | – | – |
| [InstantMesh](https://arxiv.org/html/2404.07191) | Multi-view + LRM + FlexiCubes | image → mesh | 10 s | open | low-res triplane; thin parts |
| [TripoSR](https://arxiv.org/html/2403.02151) | Improved LRM | image → mesh | <0.5 s | MIT | – |
| [Stable Fast 3D](https://arxiv.org/html/2408.00653) | UV unwrap, de-lighting, roughness/metal | image → GLB ~27k tris | 0.5 s | free <$1M revenue | one material; dark areas |
| [SPAR3D](https://arxiv.org/html/2501.04689) | Editable point-cloud stage | image → PBR mesh | 0.7 s | promised | spikes; ambiguous materials |
| [Wonder3D](https://arxiv.org/abs/2310.15008) | Normals + colour views | image → mesh | minutes | code | – |
| [Unique3D](https://arxiv.org/html/2405.20343) | 2048² views + ISOMER | image → mesh | <30 s | – | skewed input; no texture maps |
| [Era3D](https://arxiv.org/html/2405.11616) | Focal/elevation estimate | image → mesh | ~4 min | – | thin parts; no open surfaces |
| [CRM](https://arxiv.org/html/2403.05034) | Conv U-Net triplane | image → mesh | 10 s | – | high angles/wide lens |
| [LGM](https://arxiv.org/html/2402.05054) | Gaussian splats | image → splats/mesh | 5 s | – | 256² views |
| [TRELLIS](https://arxiv.org/html/2412.01506) | Structured latent; editing | image/text → splats/mesh | 50 steps | MIT | – |
| [TRELLIS.2](https://arxiv.org/html/2512.14692) | O-Voxel; full PBR incl. opacity | image → PBR GLB | 3/17/60 s | MIT, 24 GB GPU | – |
| [Hunyuan3D 2.0](https://arxiv.org/html/2501.12202) | Shape + texture models | image → mesh | – | open | self-occlusion |
| [Hunyuan3D 2.1](https://arxiv.org/html/2506.15442) | Multi-view PBR | image → PBR mesh | – | excludes EU/UK/KR | 512² maps |
| [Hunyuan3D-Omni](https://arxiv.org/html/2509.21245v1) | Box/point/voxel/skeleton control | image + control → mesh | – | CC BY-NC-ND | ill-posed |
| [CLAY / Rodin](https://arxiv.org/abs/2406.13897) | 1.5B shape; 3D controls; 2K PBR | multi → PBR | – | closed | – |
| [Direct3D](https://arxiv.org/html/2405.14832) | Native 3D DiT | image → mesh | 50 steps | – | single objects |
| [TripoSG](https://arxiv.org/html/2502.06608) | Rectified-flow SDF, MoE | image → shape | – | MIT, 8 GB | shape only |
| [Step1X-3D](https://arxiv.org/html/2505.07747) | Open data; symmetry LoRA | image → mesh + texture | – | to open | colour only |
| [SAM 3D Objects](https://arxiv.org/html/2511.16624) | Real data; pose and 3D scale | image + mask → mesh | <1 s | SAM License | occlusion, transparency |
| [PartCrafter](https://arxiv.org/html/2506.05573) | Joint parts (≤16) | image → parts | 34 s | MIT | small part data |
| [OmniPart](https://arxiv.org/html/2507.06165) | 2D masks → part boxes → parts | image + masks → parts | 45 s | CC BY 4.0 | axis-aligned boxes |
| [KaiNinja](https://arxiv.org/abs/2609.15659) | Parts + materials on TRELLIS.2 | image → parts | – | code | – |
| [SAM3D-Part](https://arxiv.org/abs/2609.15639) | Prompt a part out of a mesh | mesh + prompt → part | – | promised | – |
| [Pixal3D](https://arxiv.org/abs/2605.10922) | Pixel-aligned, multi-view | images → asset | – | – | – |

## Gaps
1. No real-world size (unit cube; only SAM 3D estimates scale). 2. Blurry text/logos (512²–2K textures). 3. Back side invented. 4. Baked lighting, weak materials. 5. Camera assumptions break on angles. 6. No editable parts. 7. Heavy, messy meshes (Tripo ~2M faces). 8. Inconsistent variants. 9. Licences: TRELLIS/TRELLIS.2/TripoSR/TripoSG are MIT and safe.

## Smart moves (~20 h)
- Export the Figma frame as a front-on, transparent PNG: the clean input these models want.
- Scale the GLB to Figma's mm box; check silhouette overlap (IoU) with the Figma vector; correct round profiles slice by slice.
- Hybrid: exact lathe/extrude for the body, AI only for caps, pumps, handles.
- **Re-project the crisp Figma label after generation (demo moment: blurry AI label → sharp Figma type).**
- Back panel frame projected onto the back; else symmetry.
- Figma layers → part masks → named 3D parts (OmniPart/KaiNinja).
- Materials from layer names / variables (glass, metal, matte).
- Web-ready: gltf-transform to 30–80k tris, meshopt/Draco, WebP/KTX2.
- Variants = texture/decal swaps, no GPU.

## Flows
A. Label to product: frame + outline → lathe/extrude, or PNG → TRELLIS.2 on fal → fit to vector + mm → re-project label → materials, decimate → React/three.js/GLB → Figma Make.
B. Layers to parts: grouped layers → masks → OmniPart/KaiNinja → named parts to toggle, explode, recolour.
C. Photo/sketch to product: rembg → TRELLIS.2 / Tripo → confirm outline in Figma → flow A fit.
D. Variant sheet: one base model × N label frames → N variants, turntable video per SKU.

## Scale
- fal: [TRELLIS $0.02/run](https://fal.ai/models/fal-ai/trellis); [TRELLIS 2 $0.25/0.30/0.35](https://fal.ai/models/fal-ai/trellis-2) at 512/1024/1536. Previews on TRELLIS, finals on TRELLIS.2.
- Self-host: TRELLIS.2 512³ ~3 s on H100 (est. ~1,000 previews/GPU-hour).
- Cache by hash(PNG + mask + params); label edits never regenerate.
- Async queue; instant lathe preview while the AI version streams in.
- Quality gate: retry when silhouette IoU < 0.9.
