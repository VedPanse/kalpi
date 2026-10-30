# Figma workflow stage log — working submission artifact

Source: [editable Sola labels](https://www.figma.com/design/vWJV3nxicYnUcpuLQ7jGet). Each stage below is under 200 words. Times are rough estimates, not measured stopwatch data. Update after a live Figma desktop run; do not present pending work as completed.

## Ideation

Tools: conversation and Codex; no Figma product used at this stage. The original idea narrowed to independent fragrance brands choosing bottle/label directions before production. Reason: define the decision and complete customer loop before expanding to furniture/AR. Approximate time: 10 minutes across the discussion, not separately tracked. Figma effectiveness: not applicable because it was not used. Output in final build: one source GLB, controlled finish/label versions, embedded customer reviews, actual preference counts and concept approval. No user interviews or market validation claimed.

## Prototyping

Tools: Figma Design via Figma’s connected creation/editing tools; native text and auto-layout label frames. Why: keep the editable artwork in the designer’s environment while using an explicit surface contract for 3D. Approximate time: 5–10 minutes. Effectiveness: 4/5, an assessment of this observed author/export step; not a rating of the untested desktop plugin. Output in final build: Olive, Terra and Night label PNG exports applied to the same bottle in Kalpi. Friction: byte-array exports exceeded a response limit; exporting individual frames as base64 resolved it. No historical Figma design work was invented.

## Handoff

Tools: Figma exportAsync and Kalpi’s real local upload/version APIs. Why: preserve editable source, exact artwork and source frame IDs in the saved version. Approximate time: 5 minutes. Effectiveness: 4/5 for the observed exported-artwork handoff. Actual PNGs were uploaded and saved as three directions, then inspected in the browser. The development plugin also implements 700 ms artwork updates, finish changes, save/shortlist/publish, and results insertion. Those paths are covered by host-mock tests and a labeled browser fixture; a live Figma desktop plugin run is pending. Results are not claimed to have been inserted into the real Figma file yet.

## Code generation

Tools: Codex, terminal, npm, Three.js, Express and Node SQLite. No Figma Make or Figma code-generation agent used. Why: implement a persistent local end-to-end flow and make behavior testable. Approximate time: first implementation 30–40 minutes, subsequent Figma-focused iteration roughly 30 minutes; neither instrumented. Figma effectiveness for code generation: not applicable. Output in final build: protected seller operations, immutable public shelves, private signup records, working one-line embed, feedback association, source references and safe retries. Seven automated tests pass. Browser checks include real Figma-exported artwork rendering, simulated plugin-panel save/publication, and an explicitly labeled test response submitted through the new merchant script embed.
