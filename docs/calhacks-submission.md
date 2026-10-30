# Cal Hacks 13.0 — Kalpi submission working notes

## Verified primary track: Figma, Idea to Demo

Read the [Figma sponsor brief](https://docs.google.com/document/d/1HjzThDGveSLiilIdEPEHq12ZVLZ5eS0T8CQC5_m_-rg/edit) through the connected Google Drive tool on October 23, 2026, America/Los_Angeles. The brief rewards an intentional, traceable workflow and a working demo. A plugin alone does not satisfy the submission deliverables.

Required submission work:

- Demo video, no longer than three minutes — not recorded yet.
- Workflow/stage log, no more than 200 words per stage — four stages: ideation, prototyping, handoff, code generation. Include actual Figma product, reason, approximate minutes, effectiveness rating 1–5, and how the output reached the final build. Do not invent tool usage or scores for untried steps.
- Figma Slides showing the work and workflow — not created yet.
- Figma files accessible to Anyone — sharing not verified or changed.
- Embed the actual Figma Make file(s) and/or prototype(s) in the working code/prototype, plus repository link — actual editable label file now exists at https://www.figma.com/design/vWJV3nxicYnUcpuLQ7jGet ; an embedded Make/prototype presentation remains pending.
- Edu verification — user must confirm account status.

Best Figma Workflow and Best Stage Log are particularly relevant. The brief also lists Best Design and Most Creative. Eligibility and judging outcomes are not guaranteed.

## The product story — current packaging workflow

Packaging starts as 2D artwork and concepts in Figma. Evaluating its three-dimensional appearance through physical samples can introduce sampling costs, shipping costs and additional rounds of waiting when a design changes.

Kalpi brings supported packaging concepts into editable 3D inside the Figma plugin. Designers can ask the AI to change the silhouette or color, or request a packaging improvement and choose whether to apply it. Structured packaging edits update native editable Figma views as well as the 3D model. Designers save alternatives and send them to a virtual store to assess shelf presence across room styles and lighting before ordering physical samples.

Customer purchase-intent feedback is an additional decision signal, distinct from actual sales. The business goal is fewer avoidable visual revisions in physical sampling; cost or time savings have not yet been measured.

### Claims and boundaries

- Supported packaging: editable bottle/jar and carton/box concepts. Whole-board recognition reads Figma images and artwork, but inferred geometry and missing dimensions are estimates. Do not promise faithful reconstruction of every arbitrary image.
- AI iteration: real validated edits, undo, review/apply and two-way structured-design sync. The pilot has a 30-request hourly AI limit; do not say unlimited usage.
- Imported detailed meshes support narrower edits; shape changes require a separate editable packaging concept. Do not present rendered images pasted into Figma as native editable geometry.
- Store: Ioanna's gallery, apothecary, stage and loft rooms, daylight/warm/cool lighting, inspection, pickup, embedded visits and purchase-intent voting.
- Virtual review supports appearance decisions. It does not verify leak resistance, strength, material compatibility, manufacturing tolerances, print accuracy or tooling feasibility. Physical sampling and manufacturer review remain necessary.
- Do not claim company closures or year-long delays without attributable customer evidence.

### Sampling evidence for the pitch

[Elegant Packaging's FAQ](https://www.elegantpackaging.com/faq) gives approximately two weeks for its prototype approval process and describes possible design, development and freight charges. This supports an example, not a universal fourteen-day rule or a perfume-bottle-specific benchmark. [APG Packaging](https://apgpackaging.com/capabilities/rapid-prototyping/) advertises some box/foam prototypes in the same day to 24 hours, illustrating the variation. Say “sampling can take weeks and involve sample and shipping costs,” not “every manufacturer takes fourteen days.” Use “shipping/freight costs”; do not imply freight is necessarily charged in both directions.

## Demo, under three minutes

- 0:00–0:20 — Show a real perfume packaging board in Figma and explain the visual sampling decision.
- 0:20–0:45 — Convert the board to a structured 3D concept. Show its editable native Figma views; identify estimated dimensions.
- 0:45–1:10 — Ask “make this a square-based pyramid in amber glass.” Show the geometry and fill changing in 3D and the native Figma vectors, then undo.
- 1:10–1:30 — Use Suggest improvements, explain the proposed tradeoff, and apply it. Recolor a native Figma layer and show the 3D update.
- 1:30–1:55 — Save a version and Send to shelf. Compare daylight, warm and cool light.
- 1:55–2:25 — Choose an Ioanna room and lighting, publish, and open its seller-page embed. Walk, pick up and inspect the saved design.
- 2:25–2:45 — Show the purchase-intent question at the displayed sample price. Distinguish feedback from a purchase.
- 2:45–3:00 — Close: “Make your visual decisions before ordering the physical sample.” Explain that physical and manufacturing validation still follow.

Recorded browser-host tests are labeled simulations of the Figma host. A final pitch recording must show the actual desktop plugin if claiming a native desktop demo.

## Related tracks, using the pasted sponsor list

- Visa: the supplied criteria weight innovation, usability, technical execution, merchant outcomes, and trust. The in-site 3D review loop is relevant, but full eligibility/API requirements need confirmation with Visa. Shopify checkout alone is not evidence of Visa qualification. No payment integration exists in this build.
- Anthropic: named community, a grounded real problem, a usable narrow flow, and meaningful Claude use. The summarizer must operate on actual comments with evidence. The adapter remains untested without credentials; interview a real target seller.
- Microsoft: measurable usefulness, responsible design, production path and end-to-end agent functionality. Current prototype has no verified Microsoft-specific agent integration and should not claim one.
- Avoid unrelated sponsor integrations added solely to accumulate tracks. No Factory, Convex, Cartesia, Bright Data or other sponsor product is claimed in the runtime.

## Honest build status

The hosted packaging flow has passed real AI, backend and storage tests: text creation, shape and color edits, undo, reverse sync, non-mutating review and explicit apply, export, publication, walking, pickup, rotation, return, voting and unpublishing. The seller-page embed was also exercised. Native sync tests execute the actual compiled plugin against a simulated Figma API host; they do not constitute an automated Figma desktop run. Whole-board recognition has separate source/evidence and geometry tests; the latest full hosted flow began with text creation, so a live whole-board-to-store desktop rehearsal remains necessary before presenting that exact sequence as demonstrated.

See `docs/graza-integration.md` for release and evidence details. No measured business outcomes, manufacturing-ready CAD or physical-device AR accuracy are claimed. The prior four-stage draft in `docs/figma-stage-log.md` still needs the remaining real-file/plugin evidence and final submission deliverables.
