# Ioanna's product models

Ported from VedPanse/kalpi, branch `ioanna`, commit `91228317820da84ef60c82cbf7e34b7802f17164` (24 October 2026).

- `*-parts.glb`, `perfume-deco.glb`: `kalpi-og/media/examples/`
- `sage-bottle.glb`: `kalpi-og/media/example-bottle/3d-sage.glb`

Original geometry, textures and PBR materials are retained; Meshopt is decoded with the current Three.js loader. Published product versions retain catalog IDs and editable nominal meter dimensions. These are reusable library models, not reconstructions of the user's Figma artwork. No Tripo screenshot is presented as an exported 3D model.

Room palettes and procedural texture recipes in `src/room-finishes.js` are adapted from `make-app/src/StoreRooms3D.jsx`. Figma label-export and preview-placement interactions are adapted from `label-to-shelf/code.js`. The original branch remains the historical source.

Store composition follow-up: `src/shop-fixtures.js` and `shared/retail-layout.js` adapt the three-tier shelves, timber counter and brass pendant arrangement from `make-app/src/StoreRooms3D.jsx`'s apothecary room. All stocked objects refer to real immutable Kalpi product versions and independently leasable placement IDs; no source demo inventory or votes were imported.

## Graza photo-derived models — f7db3a0

The `graza/*.webp` textures are extracted byte-for-byte from the embedded `GRAZA` data in Ioanna's `make-app/src/GrazaRooms3D.jsx` at f7db3a0. Product photography belongs to Graza. `shared/graza-models.js` preserves that file's 21 profiles, nominal dimensions, titles and historical catalog prices. The accompanying tracked catalog and PNG source textures are available in `walk-in-store/assets/graza.co/` on that branch. No API credential is needed.

`src/photo-model.js` adapts her lathe/photo-projection and flat/box construction, including the non-mirrored rear texture mapping. Kalpi uses metres and confirmed/unconfirmed scale metadata instead of the Make demo's 1.6× display enlargement. Prices are an imported 24 October 2026 snapshot, not a live offer. Unseen surfaces remain approximations. The original product photos remain baked into the texture; a separately editable cap is not available.

Ioanna's timber grain and punctual lighting informed the shop renderer. Kalpi retains its own persistent layouts, immutable publications, transactional pickups, shared visitor state, privacy and purchase-intent voting. Demo checkout is not imported.

## Store room source (24 October 2026)

`src/ioanna-room.js` ports the room builders, procedural textures, fixtures and lighting from `make-app/src/GrazaRooms3D.jsx` on Ioanna's branch at `0307789`. Its gallery, apothecary, stage and loft compositions are retained. Hard-coded inventory, local cart, generated source-code export and shopkeeper are excluded; Kalpi supplies immutable product versions, movement, collision, transactional holds and purchase-intent records. Nominal geometry remains in metres. Existing published custom rooms continue using their original renderer; new Ioanna presets have `scene: "ioanna"`.
