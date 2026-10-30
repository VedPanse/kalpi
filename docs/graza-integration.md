# Ioanna Graza integration — 24 October 2026

Source: origin/ioanna f7db3a0 (following 45c82b3). Pre-integration local work is backed up at `.local/backups/pre-graza-integration-1792876124.tar.gz`; source extracted at `.local/ioanna-f7db3a0/`.

The new commits contain the actual `GrazaRooms3D.jsx`, 21 photo-derived shape/texture definitions, tracked catalog and PNG textures, and RUN.md. Kalpi extracts the lighter embedded WebP textures from the Make component without re-encoding them. The source renderer's lathe projection, rear UV mapping and box/flat construction are adapted in `src/photo-model.js`. The same shared product catalog feeds native plugin selection, website editing, geometry/export, backend validation and publication. Original library assets remain available.

Store integration retains the apothecary fixture implementation adapted from Ioanna's store code, adds her timber texture treatment and retains shadows under adaptive rendering. Her visual presentation is integrated into Kalpi's existing walkable renderer rather than replacing realtime state with the Make demo's local cart/checkout.

All 21 products are available through Choose a detailed product → Graza photo models in the plugin. The library remains editable for dimensions, finish and added artwork; cap-only and silhouette changes are rejected for a single photo-derived surface. AI tool capabilities follow those limits. No arbitrary image reconstruction service or payment checkout was introduced.

Dimensions use metres rather than the source demo's 1.6× enlargement. Scale remains unconfirmed. Prices are the imported catalog snapshot, not live offers; storefront is marked as a catalog demo. Photography attribution and source provenance are in `public/models/ioanna/PROVENANCE.md`.

Verification:
- 33 non-realtime unit/backend checks passed; the realtime test timed out during a long machine interruption and passed on a caffeinated retry (ten visitors × twenty moves: 2.7 s).
- All 21 generated geometry bounds match their nominal product dimensions; representative GLB and USDZ export succeeds.
- Hosted plugin UI (opaque iframe with simulated Figma host): real AI finish edit, undo, all eight featured models saved/exported/uploaded via Send to shelf, shelf selection and publication.
- Actual embedded store: walking, large close-up, exclusive pickup, in-hand rotation, release, real purchase-intent write and creator-visible result, then unpublish access blocking. This used a separate ephemeral publication; public demo has no test votes.
- Native Figma desktop UI itself was not controlled by this session. Existing installed files at Downloads/kalpi-figma-plugin were updated in place, preserving identity and pairing.

Maincloud module updated without deleting data. Hosted deployment: dpl_BTER5dQDyLHa5tG2qLeubqTy4Ryw. Existing store links preserved.

Published demo: https://kalpi-roan.vercel.app/store/6dfb5f11-7ae8-42a7-b2b6-2ef3a84b4604

## Editable packaging and source store rooms — 24 October 2026

Release `dpl_J739SzjU9cfX7XXjWT3X4UUzFLBP` is promoted to kalpi-roan.vercel.app. Ioanna's four actual room builders (0307789) now render new packaging publications through `src/ioanna-room.js`; live products, collisions, holds and votes remain publication-backed. Empty packaging layouts are stocked automatically on publication. Manual structural room edits switch back to the custom renderer so displayed fixtures and collision volumes cannot diverge. Existing publications are unchanged.

The plugin adds text-to-structured bottle/carton concepts, an optional source-design reference, packaging review, explicit apply, and linking editable Figma views. Creation is project-authorized and retry-deduplicated, shares the AI request quota, preserves commercial facts, and never marks inferred dimensions confirmed. Review is non-mutating; applying a review checks identity, project, design and base revision. The AI receives rejected tool values during repair. Partial part finishes merge with existing finishes, and body overrides receive global AI finish edits.

Built native plugin code writes editable vectors/fills, preserves artwork, and reports missing links instead of silently claiming Figma synchronization. Cap recolors now round-trip independently. Imported meshes remain unchanged: users create a separate editable packaging concept rather than treating a mesh render as editable 2D geometry. Arbitrary image-to-mesh generation is not implemented by this release.

Verification evidence:
- 40-check complete suite passed, followed by the independent cap round-trip regression (12 native-plugin checks passed).
- Four source rooms constructed in a real browser canvas (`node tests/e2e/ioanna-rooms.mjs`).
- Real hosted AI/API/storage/Maincloud flow passed: text creation → editable-vector creation → amber pyramid edit → undo → Figma recolor to 3D → non-mutating review → apply suggestion → price/save/export → automatic Ioanna layout → publication → walking → pickup/rotation/return → vote persistence → unpublish.
- The seller-page embed separately passed rendering, walking, pickup, rotation, return, voting and access revocation.
- Native sync verification executes the compiled plugin runtime in a simulated Figma API host alongside the actual panel. Figma desktop itself was not automated or visually verified; this is not a claim of a desktop end-to-end test.
- Live test entry point: `KALPI_LIVE_AI_TEST=1 KALPI_TEST_URL=https://kalpi-roan.vercel.app node --env-file=.local/pilot.env tests/e2e/packaging-live.mjs`. It uses real services and creates isolated test data. Test publications were unpublished after successful runs.

Clean demo (no automated votes): https://kalpi-roan.vercel.app/store/378b7459-b40c-4e3d-8608-f89ab428411f . Editable study copied to Sola workspace as design 67b5effa-7ff9-40dc-9232-b258648a37ee. Installed plugin files at Downloads/kalpi-figma-plugin updated in place; reopen the plugin to load them.
