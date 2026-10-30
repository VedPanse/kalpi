# Conversion pipeline readiness

This change affects future conversions only. No saved products were edited.

- New assembly proposals are validated before saving. Axis-aligned thin front grilles, badges, labels, and panels receive bounded clearance from the main box-shaped housing and larger supporting panels. Deeply embedded parts are rejected. Rotated surfaces, arbitrary meshes, and lofted vehicles are outside this automatic clearance rule.
- Matte/unglazed ceramic annotations select the existing matte finish recipe. This is annotation-driven, not a claim of general visual material understanding.
- Structured native Kalpi layers emit a local 3D preview before artwork export and persistence. This does not reconstruct an arbitrary raster image.
- Completed identical board results are cached within the authorized user/project/artwork digest and pipeline version. UI labels reuse explicitly. Pending matching requests are checked to avoid starting another conversion; this is not a distributed billing guarantee.
- AI concept responses report measured provider-processing duration. The UI calls this an approximate concept, not photorealistic reconstruction.

Validation: 50 varied new assembly cases, deeply buried-panel rejection, no movement of unrelated/rotated parts, and native structured preview before blocked artwork export. Existing Figma bridge, selection, and credential tests pass. Browser conversion request tests intercept the AI response, so they do not prove image reconstruction quality. No new paid generations were made.

Measured local structured preview: 1552 ms from button click through two animation frames in a sandboxed headless browser on this machine. Excludes plugin launch, AI, artwork export and save. This misses a one-second target and is not a device-wide performance guarantee. Arbitrary-image, top-quality generation within one second is not achieved. No cached model is presented as a freshly generated result.
