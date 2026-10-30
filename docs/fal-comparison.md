# Sola: generated 3D comparison

Live comparison: https://kalpi-roan.vercel.app/studio?project=c926a7d3-1411-43ec-a9d7-b1a7bf38b555&tab=compare&before=ff061640-0243-4208-8411-9bc2b91bf8ec&after=2a932729-53ed-45e2-9e75-5cf8a2dc3e4d

The before is a copy of the original Sola structured Figma conversion. The after is a separate imported model from fal Hunyuan3D v3.1 Pro with PBR maps, generated from an enhanced material reference derived from the same Figma artwork. Both use the proposed 64 × 38 × 118 mm dimensions; neither is marked as physically measured. The original Figma label is a separately editable overlay, avoiding generated small-lettering errors.

Comparison view uses linked cameras and the same lighting, preserves access to both editors, and does not call generation APIs. Existing designs and published snapshots remain intact. The copied native plugin bundle includes the new model catalog entry.

Validation: model library and request-option unit tests; real browser camera synchronization test; all 28 library models resize to requested dimensions; source maps load; GLB/USDZ export smoke tests; authenticated comparison page with live Maincloud state, private label asset, rotation and lighting changes. No physical AR device test was performed in this task.

Budget: user capped fal spending at $1 total and at most one additional attempt after the first. Submitted TRELLIS.2 once ($0.35 listed estimate) and Hunyuan3D Pro with PBR once ($0.525 listed estimate). No custom polygon-count or multiview surcharge selected. Estimated total $0.875; not an independently verified billing statement. Both results cached. No further paid generations allowed under this task.

Credentials are kept only in gitignored `.local/fal.env`, mode 600, never in the browser or native panel. `providers/fal-model.js` is server-side utility code; it is not an unrestricted public generation endpoint. No automatic retry loop exists. The generic Figma Convert workflow has not been globally switched to paid generation by this comparison task.

Limitations: the reconstruction still has baked optical appearance and inferred rear details. The AI material-reference image is not presented as a screenshot of the 3D model. Arbitrary mesh reshaping is not parametrically editable; size, finish and original artwork edits are retained.
