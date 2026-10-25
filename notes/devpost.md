# Kalpi — Devpost (paste-ready)

**Tagline:** Figma makes it in 2D. Kalpi makes it 3D, without leaving Figma.

## Inspiration
Designers have asked Figma for 3D for years ("forced to go in Adobe", "extrude 2D layers into simple 3D objects", "add Z axis"). Today a logo, label or product sketch has to leave Figma for Blender, Spline or a paid mockup tool, and AI 3D tools give you something with no real size, blurry text and huge files. We didn't want to rebuild Figma: designers already work there and Figma's AI already makes great 2D. So we built the step that's missing.

## What it does
Kalpi is a Figma plugin that turns anything 2D in Figma into a real 3D object:
- **Extrude, bevel and inflate** any shape, logo, text or pencil drawing, like Illustrator's 3D panel but free and inside Figma. Pencil lines can become 3D line sculptures.
- **Pictures become 3D:** paste an image, or generate one with Figma's AI, and it becomes a puffy 3D cut-out. One click, **Make it 3D with AI**, turns it into a full 3D model (Tripo H3.1 or TRELLIS 2), sized to the Figma layer.
- **Real size:** 1 px = 1 mm. Half-outlines become bottles and jars with the label wrapped at true printed size, showing how much of the label hides round the back.
- **Every Figma layer is a part:** recolour, hide, select and explode parts; materials from layer names (gold, metal, glass, matte); view and lighting presets; turntable spin.
- **Back into Figma and beyond:** place a render on the canvas, download a GLB (web, AR, Blender), or copy live three.js code into Figma Make.
- Bonus: any Shopify store's public catalogue becomes a walkable 3D store with real products, prices and Add-to-cart links, with 3D products made from their photos.

## How we built it
Figma Plugin API (selection, vector paths, image export, placing images), three.js in the plugin UI (ExtrudeGeometry with bevels, a distance-field "inflate" surface, LatheGeometry for round products, picture cut-outs traced from the image), a tiny local helper that keeps the API key off the plugin and calls fal.ai (Tripo H3.1 / TRELLIS 2 for image-to-3D), GLTFExporter for GLB, React + three.js for Figma Make, TypeScript + Vite + Python for the walk-in store (rembg cut-outs → outlines → 3D).

## Challenges
Real-world scale from flat designs; making inflate grow smoothly instead of popping; tracing clean outlines from pictures; colours that look like the designer's colours under 3D lighting; Figma plugin limits (no 3D on the canvas, network rules, clipboard rules); keeping AI models light enough to spin smoothly.

## Accomplishments
From a Figma drawing, a pasted picture or a Figma-AI image to a real, editable 3D object in seconds, inside Figma, with the design's own size, layers and colours.

## What we learned
Generators guess; Figma knows. The AI is best at filling in depth, and the designer's file already holds the size, outline, label and parts. Combining the two beats either alone. And extending Figma beats rebuilding it.

## What's next
Snap AI models to the Figma outline automatically and re-project the sharp Figma label onto them; Spaces to arrange objects into scenes; AR at true size; print and manufacturing files (STL/3MF, flattened dielines).

## Built with
figma-plugin-api, figma-make, three.js, webgl, javascript, typescript, react, vite, python, fal.ai, tripo, trellis, rembg, shopify

*AI tools disclosed: Claude Code (coding assistant), fal.ai (Tripo H3.1, TRELLIS 2, FLUX), Figma AI.*
