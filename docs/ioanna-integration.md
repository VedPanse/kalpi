# Ioanna integration — 24 October 2026

Source: origin/ioanna at 9122831. A private backup of all pre-integration modified and untracked files is in .local/backups/pre-ioanna-integration-*.tar.gz.

Integrated:
- Six detailed library products, including named-part crystal perfume, steel bottle, marble candle and lipstick; original GLB geometry/materials, Meshopt and textures retained.
- Same product document, reducer edits, undo, immutable saved versions, export pipeline, private version assets, Figma editor, shelf, store publication and voting.
- Figma selected-label export and place-rendered-preview interactions from Label to Shelf. Imported mesh silhouette is not claimed to be a native editable Figma vector.
- Gallery, Apothecary, Stage and Loft room palettes plus deterministic wood/concrete textures and architectural lighting, without sample catalog items or sample votes.
- Large products (including the car) participate in walking collisions, not just sofas.

Not ported: the simulated checkout/cart and robot assistant (outside the purchase-intent workflow), static sample vote data, video galleries, obsolete renderer patches. The source Label to Shelf outline converter remains a specialized lathe workflow, not arbitrary shape reconstruction.

Generation limitation: latest source includes Tripo screenshots and a Python integration script, not exported Tripo assets or a live authenticated service. Do not claim that using these renderers solves arbitrary Figma-to-mesh generation or improves the saved car geometry. Integrate exported models or a provisioned generation provider separately.

Verification: all 32 unit/backend tests pass. All six library models load in a real browser and their measured 3D bounds match the editable nominal dimensions. The full local and hosted plugin-library → real AI edit/undo → export → embedded store → walking → vote → creator results → unpublish journey passes (hosted: 4.2 minutes). The Figma host is simulated with an opaque plugin iframe; this is not a manual Figma desktop acceptance test. Large private exports use multipart uploads above 4 MB, with bounded upload time, per-file status and deduplicated retry. This resolved stalled single-request transfers of the 8.8 MB GLB and 12.9 MB USDZ.

Plugin discovery follow-up: the panel now re-renders its editor and design selector when the subscribed workspace design list changes. Previously an already-open empty workspace could remain on the conversion landing screen after models were added elsewhere. Verified with a connected empty plugin iframe, external design creation, automatic editor appearance, a second external design, and selection of that new design. Installed plugin files updated in place; hosted release dpl_5CbxMHSJwY1712FfJthAFC6gyo5N.

Persistent sample-price demo: https://kalpi-roan.vercel.app/store/5305c0be-3568-4291-a6c2-203797b24f40 contains Crystal perfume ($35) and Bamboo & steel bottle ($25), with sample-price names. Both completed the plugin Send to shelf handler and private GLB/USDZ/thumbnail uploads. The bottle AR transfer needed a retry and a five-minute upload window. Walking and the voting form were verified in a fresh browser after waiting for the renderer to initialize; no customer response was inserted. Figma desktop itself remains unverified because this session cannot control that native app. Release dpl_vsVG1Zsmomrd1YAG9pZe4yKA1TXb is live and matches the installed plugin bundle.

Stocked-shop follow-up: ported Ioanna's apothecary composition into live Kalpi fixtures: two three-tier cabinets, fluted stone-topped counter, brass pendants and warm shelf strips. Compact 5 × 5 m publication has 22 independently pickable instances of the two unchanged, physically scaled product versions. Added reusable Arrange as a shop action and close-up orbit viewer. Browse products resolves the nearest instance instead of a distant first shelf copy. Four relevant unit checks passed; hosted walking, close-up model load, pickup lease, in-hand rotation, return and voting-form visibility verified. No votes fabricated. New immutable publication: https://kalpi-roan.vercel.app/store/57458e04-fc7a-4c90-94d8-892c4b8e239b . Deployment: dpl_ASQKS8VfobKf5VGHhgzSpQ4RxkXb.
