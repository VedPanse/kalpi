# Kalpi (Figma plugin)

Your Figma design as a 3D prototype at real size: shapes, drawings, labels and images become 3D, with product dimensions, parts, materials and GLB export. Optional AI image-to-3D (Tripo / TRELLIS 2 via fal) through `server/fal_helper.py`.

- **Shelf:** select up to 3 label frames (versions A, B, C). Each wraps onto a bottle, jar or candle built in three.js at real millimetre size, with printed size, wrap angle and how much is hidden round the back.
- **Your own shape:** select a vector outline (1 px = 1 mm, left edge = centre line); each piece becomes a part. **Draw my own shape** adds a starter bottle and cap to bend, cut and move.
- **Store:** the four Kalpi store rooms (Gallery, Apothecary, Stage, Pop-up Loft) with your labels on the products.
- **Place picture** puts the 3D view on the canvas; **Copy as interactive 3D** writes a small React + three.js component for a Figma Make file or code layer (see `../make-app`).

## Load it

Figma desktop app → Plugins → Development → Import plugin from manifest… → `label-to-shelf/manifest.json`.

Files: `manifest.json`, `code.js` (reads the selection, exports frames, places images), `ui.html` (the three.js panel). `IDEAS.md` has the research-backed feature plan.
