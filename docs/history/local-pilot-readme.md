# Kalpi

A runnable, single-merchant local product-design and customer-feedback app. The complete core loop works without external credentials: GLB import → finish/label versions → published shelf → customer feedback → seller results → approval.

## Run

Requires Node.js 24 (tested with 24.6.0) and npm. SQLite uses Node's built-in experimental `node:sqlite`; its startup warning is expected.

```sh
cd /Users/vedpanse/kalpi
npm ci
npm start
```

Open http://localhost:3000. No build step. For source reloads use `npm run dev`; refresh the browser after frontend edits. `npm test` runs an isolated API journey using port 3097 and a temporary database. `npm run sample` recreates the original sample GLB if needed.

Records persist in `data/kalpi.sqlite`; uploaded files live outside the database in `data/uploads/`. Back up both together. `data/seller.key` is a generated local seller credential; never share it. The included `sample.glb` is an original, procedurally authored development fixture, not AI-generated output. Demo customer comments explicitly say “Development test.” They are verification data, not market evidence.

Local verification data includes clearly labeled development fixtures; none is customer research. Fresh installations start with no projects or responses.

## Working features

- Create and switch projects; import self-contained textured GLB files up to 30 MB.
- Preserve original assets, coordinates, orientation and source references. Normalize only the screen preview, never the stored model; no claim of actual size.
- View, orbit, zoom, keyboard rotate, compare, duplicate, rename through a saved new version, and delete working versions.
- Change Body finish color, roughness and metallic properties; apply sharp canvas label text or PNG/JPEG artwork to a supported Label mesh.
- Publish 1–8 selected versions as immutable snapshots. Subsequent edits create new IDs. Removing a working version does not remove a published snapshot.
- Separate public shelf, lazy iframe, async mount script, and a real example merchant page containing the iframe.
- Persist anonymous-session views and customer preferences, “none,” comments, and consented waitlist signups. Repeat submissions update the same response. Signup emails live in separate private records and are not exposed in shelf JSON, comments or seller summary payloads.
- Report unique shelf-view sessions, explicit preferences, none responses, comments and signup counts separately. Results retain shelf and version IDs. Refresh on entering Feedback or use its refresh button.
- Approve a direction, save merchant-confirmed product facts, and download a JSON concept-review handoff.
- Optional server-side Claude feedback adapter, enabled only when a key is configured. Calling the summary button may incur API charges; no provider calls were made during development.

## Supported asset contract

GLB 2.0, self-contained buffers/textures, no required extensions. Draco/KTX2/Meshopt decoders and arbitrary external asset URLs are not included. Mesh/material named `Body` receives finish changes; `Cap` gets a coordinated darker finish; a mesh/material named `Label` must have non-overlapping, suitable UVs and a known label surface. Use meters, Y-up, front +Z when preparing new assets. Confirm real dimensions independently.

Arbitrary imported meshes can be viewed with their original materials. Finish and artwork controls only affect the supported named surfaces; the viewer displays a capability note when Body is missing. It does not promise automatic decal placement. The provided bottle uses a planar, UV-mapped front label; curved/irregular label placement needs asset preparation. Label textures are 1024 × 1216; upload art at a matching aspect ratio to avoid distortion.

## Sharing and embedding

In Design studio, check the versions to include and select **Create customer shelf**. Customer shelf contains the exact URL, iframe and async script snippets. Use **Visit example merchant website** to see the actual embed. A new publication produces a new URL; old shelves remain live until explicitly unpublished. An unpublished shelf and its public assets return 404.

Localhost links work only on this computer. A public deployment with HTTPS and persistent file/database volumes is required before sharing with remote customers. Do not deploy a server with an ephemeral filesystem. Script embeds use the script's origin and lazy-load an iframe without browser credentials or blocking the merchant page. No cross-window messaging is needed for the customer embed; its fixed responsive width and internal scroll avoid trusting arbitrary resize messages. Third-party storage restrictions may limit session deduplication across sites.

## Seller authorization and deployment boundary

This is one merchant per installation. Seller operations and private assets require the installation's bearer credential. On loopback only, the local-session endpoint bootstraps the credential into sessionStorage. It validates the local Host and client address. This is a local convenience, not a multi-tenant sign-in system. Before binding to a network interface, set `SELLER_TOKEN` to a long random secret; that disables local bootstrap, and the workspace asks for your token.

Example configuration is in `.env.example`. To load an actual `.env`, run `node --env-file=.env server.js`; npm start does not automatically load it. Set `HOST`/`PORT` if needed. Never put provider tokens in frontend files. Production work still needs account authentication, per-merchant tenancy, upload malware/resource controls, quotas/rate limits, retention/deletion workflows for personal data, backups, secure secret management, and TLS. This build is suitable for local demonstration, not a public multi-tenant service.

## Integration status

| Integration | Status | What actually exists |
| --- | --- | --- |
| GLB import / Three.js rendering | Real | Local files, real meshes and textures, controlled variants |
| Generation / Figma Weave | Manual handoff | Import an exported GLB. No generation API assumed or called |
| Figma | Untested in Figma | Local development plugin under `figma-plugin/`; debounced selected-frame artwork updates, 3D finish controls, save/shortlist/publish inside the panel, real-results insertion |
| Claude | Unavailable without key; adapter untested live | `providers/ai.js`, bounded real-feedback summaries with evidence IDs; no fake substitute |
| Shopify | Unavailable | No store credentials; no product creation/media-upload adapter or remote IDs yet. Fact preparation and local handoff work |
| AR | Unavailable | Intentionally disabled pending scale, dimensions and device validation |
| Manufacturer handoff | Real, limited | JSON concept review with source references, edits, facts and unresolved questions; not CAD |
| Visa qualification | Unconfirmed | No eligibility claim; qualifying integration requires separate confirmation |

Claude setup: set `ANTHROPIC_API_KEY` server-side and optionally `ANTHROPIC_MODEL`, restart, then explicitly request a summary. Evidence includes response IDs and actual views/counts. This feature has not been exercised against the paid API.

Shopify remains blocked until a development store and appropriate API scopes are available. The next implementation needs durable export jobs, an idempotent merchant/approved-version export key, remote IDs persisted before continuing, staged GLB/image upload, polling actual media processing, confirmed single sellable variant/stock, and `DRAFT` status. Do not represent a draft as a published storefront preview. No raw payment fields exist.

## Figma local plugin

1. Run Kalpi on port 3000 and create a project.
2. In Figma desktop, import `figma-plugin/manifest.json` as a development plugin. If Figma requests an assigned plugin ID, create a development plugin and use that ID in the manifest.
3. Run the plugin and select one label frame. It connects automatically; relevant edits update the preview after a 700 ms pause. **Live artwork** pauses/resumes this; **Refresh** is always available.
4. Choose a project (or create one in the panel). Change finish/color, name the direction and select **Save direction**. Saves preserve the source frame reference and exported artwork. The source file key stays private.
5. Save another finish, check the directions to include, and select **Publish directions** directly in the plugin. **Open shelf** opens the customer page; **Copy one-line embed** produces a working single script tag.
6. After actual customer feedback, select **Insert customer results** to create a timestamped Figma frame with counts and selected comments. Completion is reported only after Figma confirms insertion.

The Design studio’s **Figma → 3D** entry explains installation and downloads a ZIP containing the three plugin files. Unzip it and import the manifest. The local development fixture at `/qa/figma-bridge.html` simulates the message bridge for testing and is explicitly labeled; it is not evidence of a live Figma desktop connection.

The 3D stays in the plugin panel, not native canvas layers. This applies 2D artwork to an existing supported bottle GLB; it does not generate an arbitrary 3D shape from a 2D drawing. Live artwork is a preview; saving and publication remain explicit. Only selected-frame descendants and shared style changes trigger debounced exports; no full-document load. Save/publication retry keys avoid duplicate versions/shelves after an unknown response, and durable records are written transactionally. Duplicate artwork uploads are reused during an in-panel retry.

The plugin UI uses a localhost iframe bridge with source/origin checks; the opaque Figma sandbox requires `*` for its outer postMessage target, checked by source window. Tokens never pass to Figma; emails never enter results frames. Figma desktop runtime/localhost permissions still require verification. Existing tools such as Vectary already support Figma-to-3D updates; Kalpi connects design, customer review, and commerce.

## Verification

`npm test`: isolated API journey verifies real GLB upload, persistent records, three versions, public asset scoping, private authorization, project association, immutable publication, deduplication, consent validation, separate email records, approval, handoff, unpublish behavior and invalid models.

Browser verification completed: project creation, sample GLB rendering, three saved finish/label directions, publication, separate customer tab submission, seller counts/comment, direction approval, feedback submitted through merchant iframe, and 390 px responsive layout/product selection. The embedded test submission updated the prior response in the same anonymous session. This is a separate page/tab, not a separate browser profile; isolated API sessions test association. Physical phone/touch testing and separate browser-profile fraud behavior remain untested.

Development checks: `/qa/mobile.html?shelf=SHELF_ID` embeds a real 390 px viewport. `/qa/model-failure.html` intentionally loads a nonexistent GLB to exercise the actionable failure state.

## Two-minute demo

1. Open Design studio; create “Sola fragrance study” if starting fresh.
2. Import `data/uploads/sample.glb` (or use the clearly labeled sample button).
3. Keep Olive; change finish/name/label and save Terra, then Chalk. Each save is a new version.
4. Check all three directions; create a customer shelf and open its separate link.
5. Rotate a bottle, select a preference, type a comment labeled as a demo, and submit. Optional email requires consent.
6. Open Feedback; see the actual counts and comment, then approve a direction.
7. Open the example merchant website and submit through its embed. Revisit Feedback to verify the saved response.
8. Save only confirmed product facts and download the concept handoff. Point out Shopify and AI connection status honestly.

See `docs/integrations.md` for official API references and `docs/development-log.md` for the factual build log.

See `docs/calhacks-submission.md` for the verified Figma prize requirements, remaining submission work, and a focused demo narrative.

Editable source artwork: [Sola label directions in Figma](https://www.figma.com/design/vWJV3nxicYnUcpuLQ7jGet). The local “Sola · Figma label study” project uses actual exports from this file. Desktop plugin execution and public sharing still need verification. See `docs/figma-stage-log.md` for the factual four-stage workflow draft.
