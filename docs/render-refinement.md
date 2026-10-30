# Product model refinement — October 24, 2026

Implemented beyond lighting:
- Structured glass bottles have an inset cavity, glass heel and connected lip, preserving outer dimensions.
- Rounded profile transitions and crease-aware normals replace unnaturally sharp shading; triangular cuts remain faceted.
- Caps use a rounded lathed profile with a recessed closure seam and a depth matching the bottle.
- Labels follow profile breakpoints and stay above the glass surface, fixing shoulder intersections.
- Deterministic paper and brushed-metal normal textures export with the product. Imported metal parts receive subtle detail only when they lack an authored normal map; source textures remain intact.

Validation: fifteen product/detail/native-plugin tests; browser checks resize all 27 library models, round-trip a GLB at requested dimensions, verify bottle label/cap normal maps in exported GLB, and generate bottle/library USDZ files. Physical device AR appearance remains unverified.

Evidence: outputs/render-refinement/crystal-perfume.png is an actual browser render of the imported crystal model, at the test dimensions (12 × 24 × 8 cm). Bottle before/after screenshots use the same source bottle parameters and lighting, with a generated SOLA test label in place of the study's placeholder artwork to expose the intersection bug.

Limitations: this is improved real-time geometry and surface detail, not a claim of complete photographic realism. Photo-derived library models still lack unseen geometry and full scanned material maps. Existing immutable GLB/USDZ assets are not replaced; export a new saved version to include the model improvements in AR.
