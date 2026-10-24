# Research gaps → Figma "Label-to-Shelf" (23 Oct 2026, evening)

Four agents read ~55 papers. Furniture / "will it fit" dropped (her call).

## Product
Design a label/packaging in Figma → plugin wraps A/B/C variants onto true-scale 3D products
(lathe bottle/jar/candle/mug, separate cap/label/body, real materials, openable cap/lid/pump)
→ Publish test → walkable store vote with pledges → results + round-two variants written back into Figma → make the winner.

## Gaps used (research as infrastructure)
1. Scale: SAM 3D / π3 / VGGT output has no real scale; metric depth fails on packshots. Ill-Posed by Design (arXiv 2606.24335): text beats VLMs for size. → read "50 ml"/"8 oz" from listing text, scale mesh by inner volume.
2. Parts: PartCrafter / OmniPart limited; articulation papers (Real2Code, Articulate-Anything, URDF-Anything+, PhysX-Anything) are robots/furniture only, weak on small parts. → lathe from SAM mask, LLM picks joint (screw/hinge/pump).
3. Labels/glass: generators blur text, fail on transparency. → project Figma frame as cylindrical UV texture; MeshPhysicalMaterial.
4. Variants: SimFoundry / ACDC "digital cousins" → auto A/B/C.
5. Votes ≠ demand: Threadless study (negative votes gamed, voters ≠ buyers); Kickstarter signal weakens for novel items; VR store shrinks stated-vs-real gap (Fang 2021). → pledge-weighted votes, hidden tallies, new-visitor vs community split.
6. Customisation toolkits don't convert, typical self-designs fail (Zaggl 2025). → cluster shoppers' customisations into A/B/C spanning typical→distinctive.
7. Figma: no native 3D; Vectary = 1 model, Artboard = static; DesignBridge (IUI'26) / DesignFromX (DIS'25) small, 2D, cut off from the designer's file.

## Competitors
ProductPoll, Product Love (2D polls, no deposits); Zakeke (customiser only); Obsess (stores, Shop with Friends, no voting); Vurvey AR (enterprise); 3DMyPhoto/Cubic/3Dify (single rigid mesh).

## Figma prize (verify on site)
Devpost: 5 × $1k (Best Use Case, Best Use of Figma Agent, Most Creative Agent, Best Design, Most Creative).
Figma doc "Idea To Demo": Best Design $500, Most Creative $500, Best Figma Workflow $2k, Best Stage Log $2k.
Deliverables: ≤3 min video, stage log (≤200 words/stage: ideation, prototyping, handoff, codegen; tool, minutes, 1–5 rating), Figma Slides, files shared "Anyone", repo, Edu-verified team.
Judged on workflow, adoptability (before/after), output, presentation, innovation; not scope.
Tools: plugin exportAsync → texture; MCP write-to-canvas (beta, needs Edu/Pro); Figma Make for the vote page.
