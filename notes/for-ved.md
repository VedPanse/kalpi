# For Ved: a suggestion for Label to Shelf (try it)

Here's a direction I'd like us to consider: making Label to Shelf a free 3D tool inside Figma, so any 2D layer can become a real-size 3D object, a bit like Illustrator's 3D panel but in Figma and at no cost. I've started trying it out on my branch, and I'd love your take. The idea is that a flat shape, logo, text or pencil line could extrude into a solid object with depth and a round or sharp bevel, or inflate into something puffy, and a sketched line could become a 3D line sculpture. Spin could turn a full drawing around its own centre, while half-outlines like the bottle still become bottles with the label at true printed size (1 px = 1 mm). A pasted picture with a plain background could turn into a puffy 3D cut-out with the picture on the front. Each Figma layer would be its own part that you can recolour, hide, select or explode apart, with view presets, lighting presets and materials picked from layer names (gold, metal, glass, matte). If it feels right to you, next steps could be AI photo-to-3D (TRELLIS 2 on fal) that snaps the model to Figma's size, checks it against the Figma outline and puts the sharp Figma label back on, and Spaces for arranging objects into scenes. What do you think, and is there anything you'd change or add?

## Try it (Figma desktop app)
1. `git fetch && git checkout ioanna`
2. Figma → open any **Design** file → Plugins → Development → **Import plugin from manifest…** → `label-to-shelf/manifest.json`
3. Draw a star (shape tool menu → Star), type some text, draw with the pencil, or paste an image with a white background.
4. Plugins → Development → **Label to Shelf**, select your layer(s).
5. Play with Depth, Bevel, Inflate, View, Light, the colour dots and Explode. Rename a layer "gold" or "glass".

Other parts on the branch: `walk-in-store/` (any Shopify store as a walkable 3D store; `npm install && npm run api` + `npm run dev`), `make-app/` (Figma Make app: product, store rooms, Graza store with shopkeeper and cart). See `RUN.md`.
