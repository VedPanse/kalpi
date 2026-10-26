# Research 4: production-grade, scalable 3D (2020–2026)

29 sources opened. Defensible line on commerce: **AR/3D helps when shoppers are uncertain, and only if the size is right** (Tan et al. 2022; Gallino & Moreno 2018; Hayati et al. 2025). Shopify's "nearly doubles conversion" / "40% fewer returns" were seen only in search snippets: treat as marketing.

**Pitch line:** "Figma stays the source of truth, from 2D artwork to a real-size 3D asset to a file you can manufacture."

## Sources
| # | Source | Gives Kalpi |
|---|---|---|
| 1 | [Depth Pro](https://arxiv.org/abs/2410.02073) | Metric depth + focal from one image, 0.3 s |
| 2 | [UniDepth](https://arxiv.org/abs/2403.18913) | Metric 3D points, no intrinsics |
| 3 | [Metric3D v2](https://arxiv.org/abs/2404.15506) | Metric depth + normals |
| 4 | [SF3D](https://arxiv.org/abs/2408.00653) | 0.5 s textured mesh, material + normal maps, de-lighting |
| 5 | [Material Anything](https://arxiv.org/abs/2411.15138) | PBR for any mesh |
| 6 | [MaterialFusion](https://arxiv.org/abs/2409.15273) | Better albedo/materials under relighting |
| 7 | [IntrinsicAnything](https://arxiv.org/abs/2404.11593) | Albedo/specular under unknown light |
| 8 | [Paint3D](https://arxiv.org/abs/2312.13913) | 2K relightable UV textures |
| 9 | [TEXGen](https://arxiv.org/abs/2411.14740) | UV-space texture diffusion, inpainting |
| 10 | [Meta 3D TextureGen](https://arxiv.org/abs/2407.02430) | <20 s textures, 4K upscale |
| 11 | [TRELLIS](https://arxiv.org/abs/2412.01506) | Structured latents, mesh/Gaussians/NeRF |
| 12 | [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) | MIT; PBR GLB incl. alpha; 3 s / 17 s; 24 GB; default 1M faces |
| 13 | [Hunyuan3D 2.0](https://arxiv.org/abs/2501.12202), [licence](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/LICENSE) | Open shape + paint; excludes EU/UK/KR; 1M MAU cap |
| 14 | [MeshAnything](https://arxiv.org/abs/2406.10163), [V2](https://arxiv.org/abs/2408.02555) | Artist-style low-face meshes |
| 15 | [glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | Metres, +Y up, metallic-roughness PBR |
| 16 | [glTF extensions](https://github.com/KhronosGroup/glTF/blob/main/extensions/README.md) | texture_transform, basisu, clearcoat/transmission/sheen/variants, quantization, Draco, meshopt |
| 17 | [meshoptimizer / gltfpack](https://github.com/zeux/meshoptimizer) | Simplify + quantise; fast decode |
| 18 | [Draco](https://github.com/google/draco) | Smaller geometry |
| 19 | [Manifold](https://github.com/elalish/manifold) | Manifold booleans; WASM; 3MF for printing |
| 20 | [AR Quick Look](https://developer.apple.com/augmented-reality/quick-look/) | USDZ, price / Apple Pay banners |
| 21 | [model-viewer AR](https://modelviewer.dev/examples/augmentedreality/) | WebXR/Scene Viewer/Quick Look; auto USDZ; `ar-scale="fixed"` |
| 22 | [GPTEval3D](https://arxiv.org/abs/2401.04092) | GPT-4V pairwise Elo, matches humans |
| 23 | [T³Bench](https://arxiv.org/abs/2310.02977) | Multi-view CLIP + caption alignment |
| 24 | [3DGen-Bench](https://arxiv.org/abs/2503.21745) | Human-preference data + scorers |
| 25 | [Tan, Chandukala & Reddy, J. Marketing 2022](https://www.kellogg.northwestern.edu/academics-research/research/detail/2022/augmented-reality-in-retail-and-its-impact-on-sales/) | AR lifts sales most for niche/pricier/less-known products |
| 26 | [Gallino & Moreno, M&SOM 2018](https://ideas.repec.org/a/inm/ormsom/v20y2018i4p767-787.html) | Virtual fit: higher conversion, fewer returns (field experiment) |
| 27 | [Hayati et al., EMAC 2025](https://proceedings.emac-online.org/pdfs/A2025-125566.pdf) | AR cuts returns only when size is true |
| 28 | [fal Hunyuan3D v3 pricing](https://fal.ai/models/fal-ai/hunyuan3d-v3/image-to-3d) | $0.225 geometry; +$0.15 PBR / face control |

## Gaps (demo vs shippable asset)
Scale (unitless vs glTF metres; wrong size worsens returns) · materials (baked light; no clearcoat/transmission) · text/logo fidelity (diffusion blurs type) · size/perf (1–2M faces, 30–60× web budget) · licensing (Hunyuan regions, Tripo paid export; TRELLIS.2 MIT cleaner) · evaluation (no "is this the brand's product?" metric).

## Smart moves (~20 h)
1. Real size from Figma: 1 px = 1 mm → node scale 0.001 (metres); "W×H×D mm" badge; `ar-scale="fixed"` in AR. Photos: Depth Pro/UniDepth or one typed dimension.
2. Hybrid: AI body + Figma frame rasterised at 2–4K and projected as a decal; the logo never passes through diffusion.
3. Decimate + compress: gltfpack to ~30k tris, quantise, meshopt, KTX2 1–2K; show before/after live.
4. GLB + USDZ (model-viewer); Quick Look call-to-action/price.
5. PBR from generator (+$0.15 on fal) or from layer names ("matte", "gloss").
6. Quality badge: Claude/GPT pairwise "does this match the frame?", plus faces, MB, bbox mm, watertight.

## Pipeline
```
Figma frame/vector → (a) primitive/extrude when simple (exact, no AI)
                   → (b) AI shape (TRELLIS.2 / Hunyuan via fal) when organic
→ metric scale → de-light / PBR → re-project vector label as decal (2–4K)
→ decimate ≤30k tris → quantise → meshopt/Draco → KTX2
→ validate: glTF-Validator, bbox ±1%, manifold, ≤2–5 MB, renders in model-viewer
→ GLB + USDZ (+ 3MF/STL via Manifold)
→ auto-eval: CLIP/3DGen-Score + MLLM pairwise vs frame; human thumbs-up
```

## Scale and economics
- fal Hunyuan3D v3 $0.225 geometry, ~$0.525 with PBR + face control.
- Self-host TRELLIS.2 (MIT) ~17 s at 1024³ on H100 → est. $0.01–0.02/model; SF3D 0.5 s preview tier.
- Simple geometry is $0 (parametric from vectors); AI only for organic shapes.
- Cache by node hash + params + model version; label/material edits never regenerate.
- One shape per SKU family, variants via KHR_materials_variants.
- On-device: decimation, meshopt, Manifold WASM, decal baking → files stay on the client.
- Manufacturing roadmap: watertight 3MF/STL now → wall-thickness checks → unfold label back to the dieline → STEP for primitives.
