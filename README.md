# Kalpi

Figma design → editable 3D → shared store → AR. Structured bottles and sofas use a single product document, expressed in meters. SpacetimeDB is the authoritative realtime backend for designs, revisions, memberships, store snapshots, visitor movement, pickup ownership and purchase intent.

Pilot: https://kalpi-roan.vercel.app · Staging: https://kalpi-staging-eight.vercel.app

## Run locally

Requires Node 24 and npm. `setup:local` uses the official Spacetime CLI, runs a dedicated local database on port 3001, publishes the module, generates bindings, and writes private configuration under `.local/`.

```sh
npm ci
npm run setup:local
npm run start:local
```

Open http://127.0.0.1:3002. Local creator accounts are a development convenience; Maincloud requires SpacetimeAuth. `npm run build` rebuilds browser modules and the Figma plugin ZIP after source changes.

## Design and publish

1. Choose **Creator sign in**. Keep the separate sign-in tab open and open the email link in another tab. Close only the email-confirmation tab when prompted; the sign-in tab returns to Kalpi and the original page updates automatically. Check for **Signed in as …**, then start a project. Link a Figma Design file and use **Open Figma**.
2. Download the plugin ZIP, unzip it, and import its manifest through Figma desktop → Plugins → Development. Run Kalpi, generate a pairing link in the website, and paste it into the plugin.
3. Insert an editable bottle or sofa template. Edit supported outlines, dimensions, colors and artwork, then choose **Convert to 3D**. Keep the plugin open for synchronization. Unsupported curves preserve the last valid 3D design and show a recovery message.
4. Orbit, inspect underneath, select parts, change materials, or ask the agent for a change. Undo affects the working draft. **Save direction** creates an immutable version and GLB/USDZ exports.
5. Select saved directions and choose **Put it on the shelf**. Compare at the same physical scale under daylight, warm or cool lighting. Arrange products and fixtures in the boutique or furniture showroom, then publish explicitly.
6. Share the store or use **Invite someone** for a shared room. Customers walk, inspect, pick up bottles, and vote at the exact published price. Furniture supports surrounding inspection and AR.
7. **View in your space** opens the saved revision and a desktop QR handoff. Fixed-scale AR is enabled only after the creator confirms dimensions. Device tracking affects placement; dimensions and footprint support fit assessment without guaranteeing fit.

The backend supports ten visitors in a room. Pickup is transactional and expires after disconnect or a ten-second lease without updates. Publications retain their original designs, prices, lighting and layout. Unpublishing removes public access to their private assets.

## AI providers

OpenAI is the current provider, using the Responses API with validated editing tools. Set `OPENAI_API_KEY`, optionally `OPENAI_MODEL` (default `gpt-5-mini`), and `AI_PROVIDER=openai` on the server. Claude remains supported: set `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), and `AI_PROVIDER=anthropic`.

The agent receives the product parameters, selected part, artwork reference and current rendered view. It can propose supported geometry, material and label edits. It cannot invent prices, capacity or confirmed measurements. Invalid changes do not execute. Requests are authenticated, deduplicated, rate-limited, and saved privately. No credentials are bundled into the browser or plugin.

## Architecture

- `shared/product.js`: canonical documents, validation, typed editing fields and meter-based scale contract.
- `spacetimedb/src/index.ts`: private tables, permission-filtered views, transactional reducers and lease cleanup.
- `src/module_bindings/`: generated Spacetime client bindings.
- `src/geometry.js`: structured geometry and GLB/USDZ exporters; arbitrary imported meshes support viewing and materials.
- `src/studio.js`, `src/store-view.js`: Three.js studio, builder, shared shopping, customer feedback.
- `figma-plugin/source.js`, `src/plugin-panel.js`: native editable vectors, dimension annotations, artwork and revision-based synchronization.
- `server.js`: authenticated AI and asset routes, direct private Blob uploads, and legacy compatibility APIs.

Vercel hosts Express and static bundles. Blob objects are private; asset routes check project membership or active publication status on every request. Large structured uploads go directly to Blob. Local files are only a development fallback.

## Migration and compatibility

The original uncommitted workspace was backed up before restructuring. SQLite remains an immutable migration source; the runtime no longer writes to it. `scripts/migrate.mjs` makes a SQLite backup, preserves IDs, imports records and uploads legacy assets privately when `MIGRATE_TO_BLOB=true`. It refuses conflicting existing records and records a private manifest. Back up both the original SQLite file and `data/uploads/`.

Existing `/shelf/:id`, `/merchant/:id`, embeds, feedback and imported assets retain their IDs and routes. `/legacy` opens the imported-model studio, authorized by the installation's `SELLER_TOKEN`. Earlier local-only documentation is preserved in `docs/history/`.

Ioanna's original repository is unchanged. Selected assets and PBR material recipes are documented in `assets/reference/PROVENANCE.md`. Imported models support Meshopt and named material parts; unknown physical scale is not treated as a confirmed AR measurement. Obsolete bridge pages are excluded from deployment.

## Verify and release

```sh
npm test
npm run test:browser
npx tsc -p spacetimedb/tsconfig.json
npm audit --omit=dev
```

The integration tests publish disposable local Spacetime databases. They verify privacy, Figma projection validation, revision conflicts, retry deduplication, undo, five immutable variants, ten-visitor movement, exclusive pickup, lease expiry, voting, public asset scoping and legacy compatibility. Browser tests exercise actual rendering, exports, publication and independent customer contexts. Test responses are labeled as verification data and are not market research.

See `docs/hosted-pilot.md` for deployment, migration and remaining physical-device acceptance checks. The two research papers inform future spatial assistance and physical metadata; neither is a required geometry-generation service.

## Figma editor and seller embeds

Convert a design in the Figma plugin to inspect and edit its 3D model without leaving Figma. The compact panel supports orbit, standard views, part selection, AI edits, undo, dimensions and commercial details. **Send to shelf** saves an immutable direction and prepares GLB, USDZ and thumbnail assets before opening Kalpi’s shelf comparison. Retrying the same revision reuses its saved version and completed assets.

Arrange the store on Kalpi, then publish explicitly. **Copy embed code** supplies a single script tag for a seller’s custom HTML block. The embed hosts the walkable store, product inspection and purchase-intent voting; Results also lets the seller reopen the embed code. Existing shelf embeds remain supported. Public shopping uses a separate anonymous browser identity, never the seller’s creator session. Unpublishing closes both direct and embedded access.

The existing web editor remains available for compatibility; the Figma-to-shelf handoff opens the shelf directly.
