# Label to Shelf — research-backed plan (24 Oct 2026, ~01:00)

## Build order
1. Print-rules / readability check (3–4 h, plugin only)
   - k = label mm / frame px; x-height mm ≈ fontSize × k × 0.5 (font-dependent, user can override)
   - EU 1169/2011: x-height ≥ 1.2 mm (0.9 mm if largest surface < 80 cm²)
   - FDA net quantity, by front-panel area (cylinder PDP = 0.4 × circumference × height):
     ≤5 in² 1.6 mm · 5–25 3.2 mm · 25–100 4.8 mm · 100–400 6.4 mm · >400 12.7 mm; bottom 30% of PDP
   - red pins on the 3D label; click → figma.viewport.scrollAndZoomIntoView(node)
   - read text: frame.findAll(n => n.type === 'TEXT'), getStyledTextSegments(['fontSize','fontName'])
2. Publish → vote → live results frame (≈6 h, Convex)
   - HTTP actions with Access-Control-Allow-Origin: * (plugin iframe origin is null)
   - manifest allowedDomains: https://*.convex.cloud, wss://*.convex.cloud, https://*.convex.site; 2 s polling fallback
   - one vote per device, hidden tallies + Reveal, pick-to-buy (no downvotes), pledge weight = 1 + log(1 + $), email = 0.5,
     fans (?src=brand) vs strangers, drop <3 s / no-rotation votes, shuffle order
   - results frame: auto layout, keep node IDs and update in place; Inter Regular/Bold via loadFontAsync
3. Round two from the winner (≈4 h): clone() winner in plugin, agent edits copy/colour; MCP use_figma optional (beta, Edu plan)
4. Auto stage log frame (2 h) — Best Stage Log $2k
5. Legibility heatmap: shader × dot(normal, viewDir) (2–3 h)
6. Hidden-zone / seam / 3 mm bleed overlay on the frame (1.5–2 h)

## Later
- Foil layer named "foil" → metalnessMap/roughnessMap/bumpMap (2–3 h)
- Material presets: paper, gloss, clear film (alphaMap), glass jar (transparent ~0.2; r128 has no thickness)
- Conical label: R1 = a·s/(b−a), R2 = R1 + s, s = √(H² + (b−a)²), θ = 2π·f·(b−a)/s → createNodeFromSvg dieline
- Shrink-sleeve map: shrink = 1 − r(y)/r_max; PVC ≤ 60 %, PETG ≤ 78 %
- Shelf-distance presets 30 cm / 1.5 m / 3 m; 3-second shelf find test; proof PDF + cut-line SVG

## Pitch
"Today: rebuild in Illustrator, buy a test print, wait days for feedback.
With Label to Shelf: real size, readability, shopper votes and round two — in one Figma file, in minutes."
Evidence: Figma forum print threads (bleed/crop marks open since 2021, 17.9k views), no packaging plugins,
Selfnamed preview≠print, FDA/EU minimums, Threadless voting study, no HCI paper on legibility in packaging previews.
