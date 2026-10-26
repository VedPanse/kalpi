# Dark stage inspiration for Kalpi

17 Oct 2026. This is research for **option A · Keynote**: a dark, cinematic three.js stage with the product on a glossy floor under a spotlight and a glowing scan ring.

**Filter used:** keep only pages that make you stop scrolling. Anything that was just "nice" was cut. There is a short list of cut pages, with reasons, at the end of the references.

**How it was checked:** 11 pages were opened in the founder's Chrome, and she said "all of those websites have stunning designs". Those are marked **★ she saw this, loved it**, and the synthesis leans toward them. The other pages were checked through their public Awwwards, Lusion or docs write-ups, plus headless screenshots. Nothing was downloaded or run apart from viewing the pages.

**Rule for every entry:** take the technique, never the code or assets.

---

## Top 5 by pure wow

1. **Huly**: https://huly.io/. One vertical beam of violet-blue light hits a dark horizon and blooms. This is Kalpi's scan line, already made beautiful.
2. **Oryzo** (Lusion): https://oryzo.ai/. A cork coaster launched as if it were an iPhone. That is Kalpi's whole promise in one site.
3. **iPhone 18 Pro**: https://www.apple.com/iphone-18-pro/. Giant liquid-chrome "PRO" letters with the burgundy phone laid across them, on pure black.
4. **Igloo Inc** (abeto + Bureaux, Awwwards Site of the Year 2024): https://www.igloo.inc/. Glowing wireframe lines turn into a photoreal ice igloo on a mountain. The "it becomes real" moment.
5. **Codrops Cinema Seat Preview**: https://tympanus.net/Demos/CinemaSeatPreview/. The film itself lights the whole room. Lighting that comes from the content is the most cinematic idea in this list.

## What the sites she loved have in common

These 7 traits drive the palettes, vibes and techniques below.

1. **One hero object and one dominant light.** There is a single beam (Huly), a single spotlight (three.js), or a single screen (Cinema, Monitors). Everything else falls into darkness.
2. **The light comes from inside the scene.** Emissive screens, a beam or a glowing ring do the lighting, not an invisible ambient fill. The glow also shows up in the floor.
3. **Big, confident type that touches the object.** ORYZO, the chrome PRO, LANDO NORRIS. The product overlaps the word, so type and object share one space.
4. **Real materials, shot like a photograph.** Cork grain, chrome, ice, glass. They use long lenses, shallow depth of field and macro close-ups.
5. **Atmosphere.** Fog, haze and soft falloff melt the floor into the background, so there is never a hard horizon line.
6. **Restraint in colour.** A deep near-black base with one natural tint (navy, teal, ice, burgundy, cork), plus exactly one accent.
7. **A transformation, not a slideshow.** Wireframe becomes solid (Igloo), a face becomes a helmet (Lando), a coaster becomes a launch (Oryzo). Something changes state in front of you.

---

## References (31)

### ★ Pages she saw and loved (11)

**1. Oryzo**, by Lusion. ★ she saw this, loved it.
https://oryzo.ai/ · Awwwards Site of the Day, 13 Apr 2026. Also listed as Site of the Month by FWA and Awwwards on Lusion's project page.
- **Why it's stunning:** a deadpan "most unnecessarily sophisticated cork coaster" given full launch treatment. A huge cream wordmark sits behind the real-time cork, which has visible grain. Desk props (pencil, cutter, cutting mat) are blurred by heavy depth of field, so only the product is sharp. A small "keynote" video tile plays in the corner. The palette is warm near-black #100904 with orange #FF8539.
- **Technique:** three.js / WebGL with GSAP, 3D-to-2D transitions, depth-of-field post-processing, and footer particles.
- **Kalpi could borrow:** the conceit itself (an ordinary seller's product presented like an Apple launch), a giant word behind the product, and depth-of-field blur on everything except the product.

**2. Huly.** ★ she saw this, loved it.
https://huly.io/
- **Why it's stunning:** a single shaft of blue-violet light falls from the top of the screen onto a dark navy horizon. It bursts into a soft bloom with haze around it. The page is almost empty, and the light is the whole hero.
- **Technique:** layered additive gradients with bloom and grain, either a looping video or a shader. The equivalent in three.js is an additive cone plus god rays.
- **Kalpi could borrow:** make the scan line a vertical light column that lands on the floor and blooms out into the ring.

**3. iPhone 18 Pro**, Apple. ★ she saw this, loved it.
https://www.apple.com/iphone-18-pro/
- **Why it's stunning:** pure black. Giant extruded chrome "PRO" letters reflect a studio environment, and the burgundy phone lies across them. Below that, a "Get the highlights" carousel of macro close-ups shows the camera lens in a deep wine colour.
- **Technique:** pre-rendered video and image sequences, with environment-mapped chrome type.
- **Kalpi could borrow:** chrome 3D type (TextGeometry with MeshPhysicalMaterial, metalness 1 and roughness about 0.15, lit by an HDRI) for the product name behind the object, and macro "highlight" cards for the product's details.

**4. Igloo Inc**, by abeto + Bureaux. ★ she saw this, loved it.
https://www.igloo.inc/ · Awwwards Site of the Year 2024.
- **Why it's stunning:** the loader is a glowing wireframe igloo on cool grey. It resolves into a photoreal igloo of ice blocks on a snowy ridge. The blocks carry small numbered mono labels, and scrolling dives inside crystalline interiors. Palette: #383E4E with #B6BAC5.
- **Technique:** three.js with custom shaders, a wireframe-to-solid transition, particles, and infinite-scroll choreography.
- **Kalpi could borrow:** the "seller's photo turns into a 3D product" beat, done as glowing wireframe, then solid, then lit. Small mono labels can annotate the parts.

**5. Monitors**, pmndrs. ★ she saw this, loved it.
https://pmndrs.github.io/examples/monitors
- **Why it's stunning:** a dark room of stacked CRT monitors. Most glow teal and one glows orange. The glow spills onto a wet-looking reflective floor through fog.
- **Technique:** React Three Fiber, drei MeshReflectorMaterial, and postprocessing (Bloom plus DepthOfField). Emissive screens are the main light.
- **Kalpi could borrow:** let emissive elements (the ring, a backdrop strip) be the light, and let their reflection on the floor do half the work.

**6. Image Gallery**, pmndrs. ★ she saw this, loved it.
https://pmndrs.github.io/examples/image-gallery
- **Why it's stunning:** framed works stand in a near-black space (#191920) above a softly blurred mirror floor. Clicking one makes the camera glide to it.
- **Technique:** MeshReflectorMaterial (blur, mixBlur, mixStrength, and resolution of about 1024 on desktop) with damped camera easing.
- **Kalpi could borrow:** this is the "Gallery" view. Hang the 3 versions like framed pieces and fly the camera to the one clicked.

**7. Spotlight example**, three.js. ★ she saw this, loved it.
https://threejs.org/examples/webgl_lights_spotlight.html
- **Why it's stunning:** one SpotLight in darkness. It has a soft penumbra, soft shadows, and projects a texture (a gobo) onto the object and the floor.
- **Technique:** `SpotLight.map` for the projected texture, `penumbra` and `decay`, and PCFSoft shadows.
- **Kalpi could borrow:** a gobo spotlight that projects a soft ring or the Kalpi mark onto the floor, which suits the "under the spotlight" story.

**8. Cinema Seat Preview**, Codrops. ★ she saw this, loved it.
https://tympanus.net/Demos/CinemaSeatPreview/ · source write-up: https://github.com/codrops/CinemaSeatPreview
- **Why it's stunning:** a full cinema with red seats. The film lights the room: each frame is split into an 8×3 grid of patches, and each patch acts as a small area light. There is smoke and fog, and the camera flies to your chosen seat.
- **Technique:** three.js on WebGPU with TSL (falling back to WebGL 2), area lights driven by the video, and volumetric fog.
- **Kalpi could borrow:** sample the product's dominant colour and use it to tint the rim light and the ring, so the product lights its own stage. The camera can also fly to a version.

**9. GeForce RTX 5090**, NVIDIA. ★ she saw this, loved it.
https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/
- **Why it's stunning:** a black stage with the card under hard rim lights. An exploded-view video shows the cooling design, and before/after sliders compare results.
- **Technique:** pre-rendered renders and video, with an interactive comparison slider.
- **Kalpi could borrow:** an exploded view of the product's parts or materials, and a before/after slider between the seller's photo and Kalpi's 3D.

**10. Spaace**, by Lusion + plan8. ★ she saw this, loved it.
https://spaace.io/ · Awwwards Site of the Day, 24 Jun 2024.
- **Why it's stunning:** an interactive sci-fi intro with sound, a network visualisation and an ending sequence, all in one dominant red (#FF1A1A) on dark. Note that the page showed a load error on my pass, so this summary comes from the Awwwards and Lusion write-ups.
- **Technique:** WebGL with sound design and choreographed transitions (Awwwards gave animations and transitions 8.6/10).
- **Kalpi could borrow:** sound. A soft low "whoom" as the scan ring passes, kept off by default and turned on with one tap.

**11. Lando Norris**, by OFF+BRAND. ★ she saw this, loved it.
https://landonorris.com/ · Awwwards Site of the Day, 17 Nov 2025. Also a Site of the Year 2025.
- **Why it's stunning:** the hero is his portrait, and a 3D helmet morphs over it as you move. Faint topographic lines sit behind it. Later sections are lime #D2FF00 on near-black #111112.
- **Technique:** Webflow with WebGL and GSAP, and a cursor-driven mask or morph.
- **Kalpi could borrow:** a "lens" under the cursor (or a finger on mobile) that reveals the 3D product beneath the seller's flat photo. The ring itself can be the lens.

### Studio and brand references (8)

**12. Overworld Audio:** https://overworldaudio.com/
Awwwards Site of the Day, 15 Oct 2026, by Rogier de Boevé. An explorable 3D map of a sound studio's work in navy #13151F and off-white #E9ECEE. Built with three.js and Nuxt, with interactive sound. **Borrow:** how calm and premium a navy that dark looks. It is the basis for the Midnight Navy palette.

**13. Belgrade Arbor:** https://belgradearbor.rs/en
Awwwards Site of the Day, 17 Oct 2026, by Square43. A cinematic architectural story in deep forest #2E3A26 and cream #F4F0DB. Built with three.js, GSAP and Next.js. **Borrow:** proof that forest green can feel luxurious rather than "eco". It is the basis for the Forest Night palette.

**14. Lusion, Porsche: Dream Machine:** https://lusion.co/projects/porsche_dream_machine
A CG film for Porsche and Wallpaper*, shown across 23,000 sq ft of 16K LED at Outernet London. **Borrow:** the colour grading. Deep blacks, a single warm or cool key light, and a slow camera.

**15. Analogue 3D:** https://www.analogue.co/3d
Black studio renders of a console in black and white colourways, presented like a gallery. **Borrow:** a two-colourway toggle on a dark stage, and how far lighting alone can carry a page.

**16. Raycast:** https://www.raycast.com/
A dark hero with a glowing 3D keyboard and frosted blue glass panels. **Borrow:** frosted-glass UI cards floating over the 3D stage (backdrop-filter), so the controls feel part of the scene.

**17. Bruno Simon:** https://bruno-simon.com/
An open-source three.js and WebGPU driving portfolio built with Rapier physics, with devlogs on YouTube. It is not a dark stage, but it is the best public learning source for baked lighting and performance. **Borrow:** the method (bake light into textures so mobile stays fast), not the look.

**18. Awwwards three.js collection:** https://www.awwwards.com/websites/three-js/
The live feed to keep watching. Recent winners include Belgrade Arbor and Overworld Audio.

**19. Lusion studio:** https://lusion.co/
The single best studio to watch for this vibe (Oryzo, Spaace, Porsche, Devin AI).

### Technique references: three.js and pmndrs (12)

**20. Selective bloom:** https://threejs.org/examples/webgl_postprocessing_unreal_bloom_selective.html
Only chosen objects glow. **Borrow:** the ring blooms and the product does not, so its colours stay true.

**21. Ground-projected environment:** https://threejs.org/examples/webgl_materials_envmaps_groundprojected.html
A car sits *inside* an HDRI that is projected onto the ground. **Borrow:** a "real place" mode in which the product sits in a dim showroom instead of a void.

**22. Contact shadows:** https://threejs.org/examples/webgl_shadow_contact.html
A soft, blurred shadow right under the object. **Borrow:** this alone takes a model from "floating" to "physically on the floor".

**23. Screen-space reflections (WebGPU):** https://threejs.org/examples/webgpu_postprocessing_ssr.html
Physically correct glossy reflections. **Borrow:** desktop-only polish for the floor.

**24. Rect area lights:** https://threejs.org/examples/webgl_lights_rectarealight.html
Glowing light bars reflecting as long streaks on a glossy floor. **Borrow:** the Apple-keynote "light strip behind the product" look.

**25. Physical transmission:** https://threejs.org/examples/webgl_materials_physical_transmission.html
Real glass and clear plastic. **Borrow:** bottles, perfume and lipstick tubes, which make up a lot of seller products.

**26. God rays (WebGPU):** https://threejs.org/examples/webgpu_postprocessing_godrays.html
Volumetric light shafts. **Borrow:** a three.js version of Huly's beam.

**27. drei Lightformer and Environment:** https://drei.docs.pmnd.rs/staging/lightformer
Flat rect, circle or ring "softboxes" placed inside the environment map, which give studio reflections without the cost of real lights. **Borrow:** a ring-shaped Lightformer, so the scan ring also shows as a highlight on the product itself.

**28. drei MeshReflectorMaterial:** https://drei.docs.pmnd.rs/shaders/mesh-reflector-material
Blurred, depth-faded floor reflections. Useful props are `blur`, `mixBlur`, `mixStrength`, `resolution` (default 256), and `depthScale`. **Borrow:** the floor.

**29. Caustics:** https://pmndrs.github.io/examples/caustics
Light focused through glass onto the floor. **Borrow:** for glass products, a caustic pattern on the floor is an instant "wow".

**30. Glass Flower:** https://pmndrs.github.io/examples/glass-flower
Transmission plus bloom on a single object in darkness. **Borrow:** the single-object composition.

**31. three.js colour management:** https://threejs.org/docs/#manual/en/introduction/Color-management
How to keep the product's colours true (see technique 1).

### Considered and cut (not "stop-scrolling" for this vibe)

| Page | Why it was cut |
| --- | --- |
| Opal Tadpole | Yellow palette, light |
| Lusion v3 site | Bright blue on lavender |
| AirPods Pro, Vision Pro and MacBook Pro pages | All light heroes now |
| Rivian R2 | Light |
| DJI Osmo Pocket 3 | Light |
| PS5 Pro | Light |
| Shopify Editions Winter '25 | Flat and text-led |
| Teenage Engineering, Nothing | Light product pages at the moment |
| KPR, Messenger | Narrative worlds, not product stages |
| Vercel | Witty crane-and-container hero, but light |

---

## Detailed and analytical, but captivating (13)

These pages make numbers feel like a show. The patterns repeat: **a live number in the hero, one metric at a time, the real product UI as the illustration, and type that is huge for the number and small for the label.**

1. **Stripe homepage:** https://stripe.com/
A tiny live ticker above the headline reads "Global GDP running on Stripe: 1.73409029%" and keeps ticking. Below it, a metric band ($1.9T processed, 99.999% uptime) and dark sections. **Why it's captivating:** eight decimal places imply live, precise data without needing a chart.
2. **Stripe Sessions:** https://stripesessions.com/
Large flowing wave graphics, big type and photography. The keynote energy of an event. **Why it's captivating:** the pacing. One idea per screen.
3. **Linear:** https://linear.app/
Near-black page. The hero illustration *is* the real product (an issue page, an activity feed, a cycle number). **Why it's captivating:** real data, set beautifully, reads as proof instead of decoration.
4. **Ramp:** https://ramp.com/
A live counter for the "% of US corporate payments processed by Ramp", a stippled dot globe showing spend in Tokyo, London and Mexico City, and an invoice that builds itself on a dot-grid stage. **Why it's captivating:** the data is animated *in place* on an object you recognise.
5. **Mercury:** https://mercury.com/
A rotating stack of cards, hero frames that animate between product states, and one clean row of metrics (300K+, 1 in 3 startups, $20B+/mo). **Why it's captivating:** few numbers, each given room.
6. **Apple MacBook Pro chip section:** https://www.apple.com/macbook-pro/
"Three chips." Tabs switch between chips, and each task (LLM prompts, 3D render) shows a big multiplier like "6.4x". **Why it's captivating:** one huge number per claim, with the comparison in small text.
7. **Apple iPhone compare:** https://www.apple.com/iphone/compare/
Sticky columns, colour swatches per model, icon rows and expandable sections. **Why it's captivating:** dense, but every row has the same rhythm, so it scans like music.
8. **Raycast:** https://www.raycast.com/
A dark, glowing 3D keyboard, then real UI demos on frosted glass. **Why it's captivating:** the 3D hero earns attention, and the UI then pays it off.
9. **NVIDIA RTX 5090** (also ★ above): before/after sliders and an exploded view make performance tangible.
10. **The Pudding, "Life After Death?"** (Oct 2026): https://pudding.cool/2026/10/lifeafter
Survey data from nearly 130,000 people in 23 countries, revealed by scrolling, with original music. **Why it's captivating:** the story leads and the chart answers the question you were just asked.
11. **The Pudding** (all stories): https://pudding.cool/
The masters of scroll-revealed charts. Each step adds a single layer.
12. **Our World in Data, Grapher:** https://ourworldindata.org/
14,000+ charts in one consistent system. **Why it's captivating:** absolute consistency of chart grammar makes heavy data feel calm.
13. **Bloomberg, "What's Really Warming the World?"** (2015): https://www.bloomberg.com/graphics/2015-whats-warming-the-world/
A classic scrollytelling piece: each scroll step adds one suspect factor's line against the observed temperature, until the real culprit fits. The page blocks automated fetch, so this summary is from memory. **Why it's captivating:** a mystery structure, "is it this? no... is it this?"

### 3 ideas for Kalpi's own analysis on the dark stage

**Idea 1: The ring is the vote.**
After the scan, the glowing ring around the product's base becomes a live donut chart. Votes arrive as segments that light up around the ring in three steps of the accent colour: *yes* at full glow, *maybe* at half, *no* as a dim stroke. The floor reflection doubles them. Under the floor, one large counting number (tabular figures) shows "71% would buy", with a small label "142 people voted". This is Stripe's ticker plus Ramp's in-place animation: the data lives *on the object*, not in a chart beside it.

**Idea 2: AI guess vs the room.**
Before the votes reveal, a thin hollow tick appears on the ring where the AI predicted the result. It stays dim with the label "AI guessed 62%". Then the room's vote sweeps around the ring and stops at 71%. The arc between the two ticks glows, and a single line explains it: "The room liked it 9 points more than the AI expected." This is Bloomberg's mystery pacing, with one reveal per scroll step.

**Idea 3: The break-even plinth and the maker's words.**
On scroll, the product rises on a dark plinth. A thin horizontal light bar (a rect-area-light streak, keynote style) marks the break-even line on the back wall: "Break-even: 380 units". Pre-orders stack as thin glowing slices that climb toward the bar, and the bar flares when they cross it. In the last beat, the camera pulls back, the spotlight narrows to the product, and the maker's quote appears in very large type *behind* the product, borrowing the chrome-PRO and ORYZO wordmark trick. The quote reads clearly at the top and fades into the floor reflection below.

---

## 10 dark palettes

All are natural and deep, not neon, and none is yellow. "Bg" is the vertical gradient from top to bottom. Contrast was measured against the *lighter* background stop, which is the worst case. All text passes WCAG AA, and most pass AAA. The live board is at `palettes.html`.

| # | Name | Bg top → bottom | Floor | Fog | Rim light | Ring glow | Text | Secondary text | Accent | Text / secondary / accent contrast |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Velvet Plum** | #1A1028 → #0B0812 | #120C1C | #140E20 | #C9B8FF | #A48BFF | #F3EFFA | #A79DB8 | #B79CFF | 16.1 / 7.1 / 8.0 |
| 2 | **Midnight Navy** (Overworld) | #0F1A2E → #060A14 | #0A1220 | #0C1526 | #A9C8FF | #6FA3FF | #EEF3FB | #93A2BA | #7FB0FF | 15.6 / 6.7 / 7.9 |
| 3 | **Forest Night** (Belgrade Arbor) | #0E1F17 → #050C09 | #08130E | #0B1812 | #B8E3CC | #5FD3A0 | #EDF5F0 | #93AA9D | #6FDDAE | 15.4 / 6.9 / 10.3 |
| 4 | **Wine Cellar** (iPhone Pro burgundy) | #2A0E18 → #0E0609 | #160A0F | #1C0C13 | #F2C4CF | #E0718C | #F8EEF1 | #B59AA2 | #EC8AA1 | 15.7 / 6.9 / 7.4 |
| 5 | **Light Column** (Huly) | #121436 → #04050C | #080A18 | #0D1028 | #D6DAFF | #8C93FF | #F1F2FF | #9EA2C4 | #9AA0FF | 16.0 / 7.1 / 7.5 |
| 6 | **Graphite Chrome** (iPhone Pro) | #17171B → #050506 | #0C0C0F | #111114 | #E8E8EE | #C8CCD8 | #F5F5F7 | #9D9DA6 | #D9DDE8 | 16.4 / 6.7 / 13.2 |
| 7 | **Teal Monitor** (pmndrs Monitors) | #0D1E22 → #04090B | #071114 | #0A1A1E | #A8F0E6 | #3FD9C6 | #ECF7F6 | #8FAEAB | #4FE0CE | 15.7 / 7.2 / 10.5 |
| 8 | **Glacier** (Igloo) | #1A2129 → #070A0E | #0D1218 | #141A21 | #E6F1FF | #A9D4F5 | #F2F6FA | #9AA6B3 | #B5DCF7 | 15.0 / 6.6 / 11.2 |
| 9 | **Ember Cork** (Oryzo) | #24130C → #0D0705 | #160C08 | #1C100B | #F5CDB6 | #E8875A | #FAF1EA | #B8A194 | #F0956A | 16.1 / 7.3 / 7.9 |
| 10 | **Deep Petrol** (ink-in-water) | #0B2230 → #03080C | #061620 | #081B27 | #9FD6E8 | #38A7C9 | #EAF4F8 | #8AA7B4 | #4DB8D8 | 14.6 / 6.4 / 7.1 |

**How to use them in three.js:**
- `scene.fog = new THREE.Fog(fog, near, far)`. Make the fog colour match the bottom background stop *visually*, so the floor dissolves with no horizon.
- The ring uses `MeshBasicMaterial({ color: ringGlow, toneMapped: false })` with an intensity above 1 so that selective bloom catches it.
- The rim is a SpotLight or DirectionalLight behind the product at intensity 2–4.
- Keep the key light *neutral white*. Only the rim and the ring carry the tint, so the product's own colour stays true.

---

## 8 new vibe directions

These are new beyond the existing Keynote option, and weighted toward what the sites she loved share.

1. **Light Column.** The scan is a single vertical beam of light that falls from above, hits the glossy floor, and blooms outward into the ring. Then the product forms inside the beam. *Techniques:* an additive cone mesh with a gradient alpha, god rays, selective bloom, floor reflection of the beam, and haze fog. (Huly)
2. **Chrome Wordmark.** The product's name (or the seller's brand) stands behind the product as giant liquid-chrome letters that mirror the studio lights, with the product laid across them. *Techniques:* TextGeometry with MeshPhysicalMaterial (metalness 1, roughness 0.1–0.2), a Lightformer studio environment, and a slow camera dolly. (iPhone 18 Pro, Oryzo)
3. **Wireframe Genesis.** The seller's photo dissolves into glowing edge lines that trace the product's form, then the faces fill in, become solid and get lit, with small mono labels on the parts. *Techniques:* EdgesGeometry or a wireframe shader with an animated dissolve threshold, a fresnel edge glow, and a GSAP timeline. (Igloo Inc)
4. **Self-lit Room.** The product's own dominant colour lights the stage, tinting the rim, the ring and the floor reflection, so every product gets a unique, natural theme. *Techniques:* extract the dominant colour from the photo, derive the palette with OKLCH lightness clamps, and use RectAreaLights in that colour. (Cinema Seat Preview, Monitors)
5. **Gallery Night.** The three versions hang as framed pieces in a dark gallery above a blurred mirror floor. Clicking one glides the camera there, and the others dim. *Techniques:* MeshReflectorMaterial, damped camera, per-frame spotlights. (pmndrs Image Gallery)
6. **Gobo Theatre.** A theatrical spotlight in haze projects a soft pattern (the ring, a window, leaves) across the product and floor, with velvet darkness around it. *Techniques:* `SpotLight.map` with a projected texture, penumbra, fog, and soft shadows. (three.js spotlight)
7. **Exploded Atelier.** The product floats apart into its parts or materials with thin annotation lines, like a designer's breakdown, then snaps back together. *Techniques:* animated offsets per mesh, CSS2D labels, and a slight depth of field on the far parts. (NVIDIA RTX 5090)
8. **Cursor Lens.** A glowing ring follows the cursor (or the finger on mobile) over the seller's flat photo. Inside the ring you see the live 3D product, and outside it the original photo. *Techniques:* a stencil or circular shader mask, render-to-texture, and an eased lens position. (Lando Norris)

**Strongest 3:** Light Column, Wireframe Genesis and Self-lit Room. They are the closest to the sites she loved, and each makes the scan ring the *story* rather than an ornament.

---

## 10 techniques that make the 3D product look premium and true-coloured

| # | Technique | How | Mobile cost |
|---|---|---|---|
| 1 | **Colour management** | Set `renderer.outputColorSpace = SRGBColorSpace`. Base-colour textures use sRGB. Normal, roughness and AO maps use linear. Use `NeutralToneMapping` (Khronos PBR Neutral), which keeps saturated product colours closer to the real ones than ACES does (ACES shifts hues). Keep exposure about 1. To check, put the seller's photo beside the render under a neutral light. | None |
| 2 | **Studio HDRI kept separate from the background** | Use `scene.environment` set to a small (1k) studio HDRI or drei Lightformers, run through PMREM. Keep `scene.background` as the dark palette gradient. The product gets studio reflections while the stage stays dark. | Low (one-time PMREM). Use a 1k HDRI, not a 4k one. |
| 3 | **Key, rim and fill rig** | A neutral white key SpotLight above front with penumbra 0.6–0.8, two tinted rim lights behind left and right (this is what makes a silhouette on black), and a very low fill. Only the key casts shadows. | Low |
| 4 | **Contact shadow / baked AO** | drei ContactShadows, or AccumulativeShadows baked *once*, or three's contact-shadow technique. This takes the product from floating to grounded. | Medium if re-rendered every frame. Low when baked once (frames=1) or when the product doesn't move. |
| 5 | **Reflective floor** | MeshReflectorMaterial with blur about [300, 100], mixBlur about 1, mixStrength 1.5–3, a slight roughness map and depthScale fade. Cheap alternative: a mirrored copy of the model under a gradient-alpha floor. | High (it renders the scene twice). Use resolution 256 on mobile, or the mirrored-copy fake. |
| 6 | **Selective bloom** | Only the ring and beam (emissive above 1, `toneMapped: false`) cross the luminance threshold, about 1. The product never blooms, so its colours stay true. | Medium. Run it at half resolution on mobile. |
| 7 | **Fog and vignette** | Fog in the floor colour, a radial gradient backdrop, and a soft CSS vignette. No horizon line. | None |
| 8 | **Long lens and slow camera** | FOV 22–30° for a product-photography look with no wide-angle distortion. Damped dolly or orbit. Choreograph with GSAP timelines or ScrollTrigger, or Theatre.js for keyframing. | None |
| 9 | **Physical materials** | MeshPhysicalMaterial with clearcoat for gloss and lacquer, sheen for fabric, transmission and IOR for glass, and iridescence sparingly. Ship KTX2 textures and meshopt or Draco geometry. | Low to medium. Transmission adds a full render pass, so swap in an opacity fake on low-end devices. |
| 10 | **Adaptive quality** | Cap DPR at 1.5 on mobile, use drei PerformanceMonitor or AdaptiveDpr, turn depth of field and SSR off on mobile, pause rendering when off-screen, and use `frameloop="demand"` once still. | This is what keeps 60fps everywhere |

**The quickest wins** are techniques 1, 2, 4 and 7. They are nearly free on mobile and they make most of the visible difference.
