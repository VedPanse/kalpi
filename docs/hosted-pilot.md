# Hosted pilot operations

## Environments

| Environment | Frontend                               | Maincloud database       | Vercel project  | Private Blob store     |
| ----------- | -------------------------------------- | ------------------------ | --------------- | ---------------------- |
| Pilot       | https://kalpi-roan.vercel.app          | `kalpi-pilot-vedpanse`   | `kalpi`         | `kalpi-pilot-assets`   |
| Staging     | https://kalpi-staging-eight.vercel.app | `kalpi-staging-vedpanse` | `kalpi-staging` | `kalpi-staging-assets` |

Both projects belong to the `kalpi1` Vercel workspace and use OIDC for private storage. OpenAI is enabled; Claude remains optional. The working directory is linked to the pilot project. Explicitly check `.vercel/project.json` before deployment and relink when targeting staging.

Structured-pilot baseline: `dpl_585wfEYxZ5ShAZ6UPyGm8n6fy7FG`, promoted October 24, 2026 from the local working tree based on `404333b`. The final staging journey passed in 3.2 minutes; the live pilot serves the same studio bundle. Public configuration, plugin download, preserved shelf routes and private artwork denial passed after promotion. The deployment error-log scan returned no errors for the ten-minute window ending 10:12 UTC. Changes remain in the local working tree and have not been committed or pushed.

Maincloud disables anonymous creator access. `AUTH_AUDIENCE` is the environment's public OAuth client ID; `AUTH_ISSUER` is `https://auth.spacetimedb.com/oidc`. SpacetimeAuth email login is enabled, anonymous creator login disabled. Public shoppers use database-issued anonymous identities and cannot create projects.

Keep the pilot database, OAuth client and asset store separate from staging. Never point staging at pilot data. The deployment's public `/api/config` contains only public connection details and capability booleans. Service credentials belong only in Vercel server environment variables. The service identity is scoped to the Kalpi module; the account owner's CLI token is never deployed.

Current sign-in repair: `dpl_9UkpWBnCF8HmxqsJMuwteNxBNDo8`, promoted October 24, 2026. The `/auth/start` route and studio bundle match tested staging. Three targeted browser authentication tests pass. The user confirmed fresh real-email completion: Kalpi displays the signed-in identity and Start a project opens the project-name form.

## Rebuild and deploy

1. Run the test commands in README and build the plugin/browser bundles.
2. Publish `spacetimedb/` with the appropriate `AUTH_AUDIENCE` and `AUTH_ISSUER`; never use `ALLOW_LOCAL_CREATORS=true` on Maincloud.
3. Generate bindings with `npm run generate` after schema changes. Review the migration plan before changing tables.
4. Configure the matching Vercel project and private Blob store. `scripts/provision-service.mjs` provisions a separate module service identity; `scripts/configure-vercel.mjs` writes configuration without printing credentials.
5. Deploy staging and verify the public alias, OAuth redirect URI, private uploads, asset routes and published store. Stage the pilot with `vercel deploy --prod --skip-domain`, inspect its configuration and compatibility routes with `vercel curl`, then promote that deployment. Device-specific acceptance checks below remain necessary before claiming full device validation.

Vercel may reject a deployment if the repository's Git author is not connected to the signed-in Vercel account. Resolve that account connection before retrying; do not modify historical author metadata.

## Migration

A private backup of the pre-implementation workspace exists at `/Users/vedpanse/.codex/backups/kalpi-20261024-002534/`. The migration also creates a SQLite snapshot under `.local/backups/`.

```sh
MIGRATE_TO_BLOB=true node --env-file=.local/staging-blob.env --env-file=.local/staging.env scripts/migrate.mjs
```

The migration preserves record IDs and verifies imported records, rejecting conflicting destinations. Original assets and SQLite remain available for recovery. Legacy runtime writes now go only to Spacetime. `SELLER_TOKEN` preserves access to the old imported-model studio. Public shelf and embed routes retain their original IDs.

## Verification and release gates

Automated checks cover validation, native Figma projection, privacy, revisions/conflicts, retry deduplication, undo, immutable versions/prices, ten visitors, ownership leases, real customer response persistence, GLB/USDZ structure and unpublish access checks. Test responses are explicitly labeled and must not be presented as customer evidence.

Verified on October 24, 2026:

- Twelve automated tests pass, including ten simultaneous visitors, exclusive pickup, lease expiry, privacy and compatibility. Type checking and the production dependency audit pass.
- The staging browser journey saved five versions with real private GLB/USDZ/thumbnail uploads, performed an actual OpenAI geometry/material edit, selected two directions, published a store, joined two independent browser contexts, walked, picked up a product, recorded purchase intent, loaded fixed-scale AR assets and verified that unpublishing revoked public asset access.
- A 6 MB direct private upload passed its signed callback, authenticated byte-for-byte download and anonymous-access denial in both staging and pilot. The test assets were removed afterward.
- Both databases preserve the 27 original SQLite records and their assets. Existing shelf IDs and a migrated artwork asset were checked through the hosted pilot routes.
- Creator email confirmation was initially reported as successful, but a later user report exposed an incomplete handoff. Email confirmation alone is not acceptance evidence: require **Signed in as …** in Kalpi and a working **Start a project** form. The separate-tab fix has regression coverage, and the user subsequently confirmed both the signed-in identity and the working project-name form after a fresh email login.
- A browser resilience test keeps rendering paused for 32 seconds, verifies continued room presence, then removes membership and verifies automatic recovery. Network heartbeats run independently of rendering.
- Five native Figma templates were written and round-tripped in the linked Design file. This used the Figma editing tool and metadata shims, not the installed desktop plugin runtime.

To repeat the opt-in hosted checks against staging:

```sh
KALPI_HOSTED_URL=https://kalpi-staging-eight.vercel.app node --env-file=.local/staging.env node_modules/@playwright/test/cli.js test --grep creator
node --env-file=.local/staging-blob.env --env-file=.local/staging.env tests/hosted-assets.mjs
```

The hosted journey provisions a private verification workspace through a service identity and pairs a separate project-scoped browser identity. It does not automate email access or seed customer evidence in the pilot. Keep traces and `.local/` private.

Before describing the pilot as fully device-validated:

- Run the installed Figma desktop plugin through five designs, sync in both directions, close/reopen, offline edits and conflict recovery.
- Physically place the confirmed sofa using iOS Quick Look and Android WebXR/Scene Viewer. Check nominal size against known measurements; retain the device-tracking limitation.
- Measure desktop/mobile FPS on representative devices. Adaptive resolution, transmission quality and shadows reduce rendering load; target FPS is not a measured guarantee.

Client diagnostics keep a bounded local record at `kalpi-diagnostics` of sync state, AI/asset timing and adaptive rendering. They exclude prompts and credentials. Server failures emit structured path/event logs to Vercel. Inspect error logs after deployment and check Maincloud database metrics before inviting pilot visitors.
