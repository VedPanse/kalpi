# For Ved: a suggestion for Label to Shelf (try it)

Suggestions for Label to Shelf (on my branch to try):

- Make it a free 3D tool inside Figma, like Illustrator's 3D panel but free
- Extrude flat shapes, logos, text and pencil lines, with depth and a round or sharp bevel
- Inflate shapes into puffy objects; pencil lines as 3D line sculptures
- Spin full drawings around their centre; half-outlines still become bottles with the label at true size (1 px = 1 mm)
- Pasted pictures with a plain background become puffy 3D cut-outs with the picture on the front
- Each Figma layer as a part: recolour, hide, select, explode
- View presets, lighting presets, materials from layer names (gold, metal, glass, matte)
- Next: AI photo-to-3D (TRELLIS 2 on fal), snapped to Figma's size, checked against the Figma outline, with the sharp label put back on
- Next: Spaces to arrange objects into scenes

## Try it (Figma desktop app)
1. `git fetch && git checkout ioanna`
2. Figma → open any **Design** file → Plugins → Development → **Import plugin from manifest…** → `label-to-shelf/manifest.json`
3. Draw a star (shape tool menu → Star), type some text, draw with the pencil, or paste an image with a white background.
4. Plugins → Development → **Label to Shelf**, select your layer(s).
5. Play with Depth, Bevel, Inflate, View, Light, the colour dots and Explode. Rename a layer "gold" or "glass".

Other parts on the branch: `walk-in-store/` (any Shopify store as a walkable 3D store; `npm install && npm run api` + `npm run dev`), `make-app/` (Figma Make app: product, store rooms, Graza store with shopkeeper and cart). See `RUN.md`.
