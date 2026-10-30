# FORMA speaker repair

Saved design: 9b49659a-ee24-4db9-a4a3-2f700f049b4d in Sola Fragrance.

The generated acoustic grille front was exactly coplanar with the shell front (.44 in normalized coordinates). The plaque was also inside the body. This caused severe depth-buffer artifacts. The AI selected glazed ceramic despite the board's matte terracotta specification.

The existing draft was updated through the revision-checked edit reducer, preserving undo and the existing design link. Front shell, surround, grille and plaque are now physically separated; dial proportions and rear port are refined. Dimensions remain 180 × 130 × 300 mm, not marked measured. The source backup is kept in gitignored .local/forma-before.json.

Rendering improvements: finer rounded-box tessellation; locally generated woven fabric color/normal maps and subtle ceramic grain; name-plaque text from the editable label text. Matte shell uses the existing powder-coat finish recipe to disable glaze. No fal generation calls were made. These are deterministic concept-model improvements, not a claim of photorealistic reconstruction or manufacturing accuracy.

Tests validate positive grille/shell and plaque/grille clearance, zero clearcoat, and exact physical bounds. Browser renders were reviewed before deployment, followed by production front, side and top inspection. The converter's assembly instructions now explicitly prohibit coplanar visible panels and distinguish matte from glazed ceramics. This prompt guidance does not guarantee arbitrary reconstructions are correct.
