# For Ved: what's new in Label to Shelf (try it)

We're turning Label to Shelf into a free 3D tool inside Figma: any 2D layer becomes a real-size 3D object, like Illustrator's 3D panel but in Figma and free. Select a flat shape, a logo, text or a hand-drawn pencil line and it **extrudes** into a solid object with depth and a round or sharp **bevel**, or **inflates** into a puffy one; pencil lines can become a **3D line** sculpture. **Spin** turns a full drawing around its own centre (like a pottery wheel), and half-outlines like the bottle still spin into bottles with the label wrapped at true printed size (1 px = 1 mm). Paste a **picture or drawing** with a plain background and it becomes a puffy **3D cut-out** with the picture printed on the front. Every Figma layer is its own **part**: recolour it with one click, hide it, select it in 3D or jump to it in Figma, and **explode** the parts apart. There are **view presets** (front, isometric, top, off-axis), **lighting** presets with intensity, and **materials from layer names** (gold, metal, glass, matte). The 3D view fits itself to the object and sits at the top of the panel. Next up: AI photo-to-3D (TRELLIS 2 on fal) that snaps the model to Figma's size, checks it against the Figma outline, and puts the sharp Figma label back on, plus Spaces to arrange objects into scenes.

## Try it (Figma desktop app)
1. `git fetch && git checkout ioanna`
2. Figma → open any **Design** file → Plugins → Development → **Import plugin from manifest…** → `label-to-shelf/manifest.json`
3. Draw a star (shape tool menu → Star), type some text, draw with the pencil, or paste an image with a white background.
4. Plugins → Development → **Label to Shelf**, select your layer(s).
5. Play with Depth, Bevel, Inflate, View, Light, the colour dots and Explode. Rename a layer "gold" or "glass".

Other parts on the branch: `walk-in-store/` (any Shopify store as a walkable 3D store; `npm install && npm run api` + `npm run dev`), `make-app/` (Figma Make app: product, store rooms, Graza store with shopkeeper and cart). See `RUN.md`.
