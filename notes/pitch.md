# Kalpi pitch package (Cal Hacks 13)

Researched 24 Oct 2026. [S#] = source (list at the end). "(est.)" = our own arithmetic. "(verify)" = not confirmed.

Check before using:
- Judging criteria and the Figma brief: Devpost blocked the research (403). calhacks.io confirms Figma and Visa as sponsors [S1]. Confirm the Visa "Reimagining Shopping" track and what Figma means by "Stage Log" (Slack / Devpost).
- "Sana" in the script is an imagined seller, not a real person. Her costs are real ranges from the sources.

## A. One-liner and tagline
**One-liner:** Kalpi turns your Figma design into a 3D product, a store shelf and real buyer demand.
**Tagline:** *Figma gives you 2D. Kalpi tells you if anyone will buy it.*
(Alternative: *Make one in Figma before you make 5,000.*)

## B. 3-minute pitch script
| Time | Spoken | On screen |
|---|---|---|
| 0:00–0:25 | "Imagine Sana. She makes olive oil in small batches and wants a real bottle with a real label. The printer says custom boxes start at a thousand to five thousand units, plus up to a thousand dollars in tooling. A co-packer wants 500 to 3,000 jars just to start. So before one stranger has seen her label, Sana has to bet thousands of dollars on it. And she has three versions. Which one?" | Black screen, one line at a time: "1,000–5,000 boxes" [S10], "$800–1,000 tooling" [S10], "500–3,000 jars" [S9]. |
| 0:25–0:45 | "Here is the strange part. Sana already designed all three labels in Figma, where 13 million people work every month. But Figma stops at a flat rectangle. Everything after that is guesswork: mockups, test prints, photo shoots, surveys. We didn't rebuild Figma. It's far better than anything we could build, and sellers' designs already live there. So Kalpi starts exactly where Figma stops." | Figma file with three label frames, A, B and C. |
| 0:45–1:10 | "Select the three labels and run Label to Shelf." *(pause)* "They're on a real-size bottle now. One pixel is one millimetre. Kalpi shows the printed size, the wrap angle and how much of the label hides round the back. That's the mistake you normally find on a test print. Want a jar, a candle, or your own shape? Draw it as a Figma vector." | **Reveal 1:** the plugin wraps A, B and C onto 3D bottles. Rotate one slowly. Point at "% hidden". Draw a quick custom outline. |
| 1:10–1:30 | "Put it on a shelf. Four rooms: Gallery, Apothecary, Stage, Pop-up Loft. Then 'Copy as interactive 3D' turns it into real React and three.js code. We pasted that into Figma Make, asked Make's AI for a taller bottle, and it reshaped it." | **Reveal 2:** the Store tab, then the Make app with the prompt and the result. |
| 1:30–2:05 | "Now a real store. This is graza.co, a real Shopify brand: 75 products, real prices. Kalpi turned the public catalogue into a store you can walk through. We built every product's 3D model from its photo: remove the background, trace the outline, spin it into a shape, and wrap the photo back on at its real size. And there's a shopkeeper." *(type)* "Bring me the Sizzle." *(it walks over)* "Checkout." | **Reveal 3:** the walk-in Graza store. Walk an aisle. The shopkeeper fetches Sizzle, the cart fills, then Add to cart opens the real Shopify link. |
| 2:05–2:30 | "The last step is measuring demand. Likes are cheap. A study of Threadless, with almost 150 million votes, found people vote down their rivals' designs. So Kalpi measures pledges instead: 'I'd buy this at $X', backed by a refundable deposit. Sana prints the label buyers pay for, in the quantity they've already pledged." | Pledge page with A/B/C bars. **Say it's a prototype if it isn't live.** Quote: "voting down their best competitors" [S16]. |
| 2:30–2:50 | "Shopify has millions of merchants and $378 billion in sales a year. Faire has 100,000 independent brands. Today a seller stitches together a mockup tool, a pre-order app and a survey tool, often a few hundred dollars a month. Kalpi is one loop, and it starts where the design already lives." | "millions of merchants · $378B GMV" [S5], "100,000 brands on Faire" [S20], three logos with a plus sign between them. |
| 2:50–3:00 | "Figma is where products get drawn. Kalpi is where they find their buyers before a single unit is made. Don't make five thousand to find out. Make one in Figma." | Kalpi logo, tagline, QR code to the pledge page. |

Delivery: pause a full second at each reveal; one person speaks, one drives the demo; have a recorded backup of the walk-in store.

## C. Devpost write-up
**Inspiration.** Small brands have to bet on packaging before they know anyone wants it. Custom printed boxes start at 1,000–5,000+ units with $800–1,000 tooling [S10]. A custom skincare formula needs 2,500 units and a $2,500 lab fee [S11]. A first co-packed run of 50,000 units can tie up $80k–150k [S9]. These sellers already design in Figma, but Figma ends at a flat design. We wanted to start where Figma stops.

**What it does.** Figma gives you 2D. Kalpi makes the 3D, puts it in a virtual store, measures real demand, and (next) connects you with manufacturers.
- **Label to Shelf (Figma plugin).** Select label frames (A, B, C). They wrap onto a real-size bottle, jar or candle at 1 px = 1 mm, or onto any shape drawn as a vector, with printed size, wrap angle and % hidden round the back. A Store tab has four 3D rooms. "Copy as interactive 3D" exports a React + three.js component.
- **Figma Make app.** Runs that component with all four rooms; Make's AI reshapes the bottle from a prompt.
- **Walk-in 3D store.** Any Shopify store's public catalogue becomes a walkable store with real prices and Add-to-cart links (graza.co, 75 products). Every 3D model is built from its photo: background removal, outline, lathe (the outline spun into a round shape), photo wrapped back on at the real size read from the title.
- **Shopkeeper.** "Bring me the Sizzle", "show me the mayo", "checkout".

**How we built it.** Figma Plugin API, three.js and React, Figma Make, Shopify's public products JSON, a photo-to-3D pipeline (rembg background removal, contour tracing, lathe). We tested Tripo image-to-3D for hero products.

**Challenges.** Real-world scale from a flat design; label seams and hidden area on curved surfaces; inferring physical size from titles; keeping 75 products smooth in a browser; running inside Make's environment.

**Accomplishments.** From a Figma frame to a walkable, shoppable store with real products, with the label at true printed size.

**What we learned.** Votes over-predict sales: Threadless voters strategically vote down competitors [S16], so demand has to be measured with money on the line. And extending Figma beats rebuilding it.

**What's next.** Pledge-weighted demand tests (refundable deposits, waitlist), ads generated from the 3D scene, a manufacturer brief exported from the 3D spec, matching with low-MOQ suppliers.

**Built with:** figma-plugin-api, figma-make, javascript, typescript, react, three.js, webgl, shopify, python, rembg, tripo.

## D. Slides (one number each)
1. **You bet before you know.** 1,000–5,000+ unit minimums for printed boxes [S10].
2. **Cash at stake.** $80k–150k tied up in a first 50,000-unit co-packed run [S9].
3. **Most launches don't last.** 40% of launched products fail (peer-reviewed) [S14]. Not Nielsen's 85% [S13].
4. **Sellers already live in Figma.** 13M+ monthly users, about two-thirds non-designers [S3].
5. **Demo: Figma → shelf → walk-in store.** 75 real Graza products, built in a weekend.
6. **Votes lie, pledges don't.** ~150M Threadless votes; negative votes were gamed [S16].
7. **Market.** Millions of Shopify merchants, $378B GMV [S5]; 100,000 brands on Faire [S20].
8. **Business model.** Today: $29 (Pacdora) + $279 (Prelaunch) + 5% (PreProduct) [S6][S7][S8]. Kalpi: one loop.

## E. Market and competitors
| Tool | Design | 3D / real size | Virtual store | Demand test | Manufacturing | Starts in Figma |
|---|---|---|---|---|---|---|
| Pacdora ($9–59/seat/mo annual; Pro $29/mo) [S6][S19] | Packaging templates | 3D mockups | No | No | No | No |
| Smartmockups (Canva) [S21] | No | Mockups | No | No | No | No |
| Vectary ($25+/mo) [S22] | No | 3D, AR | No | No | No | No |
| Zakeke ($69.90–299.90/mo + 1.5–1.9%) [S23] | Customer customiser | 3D, AR | No | No | No | No |
| Obsess / Emperia | No | Yes | Bespoke, enterprise | No | No | No |
| Prelaunch.com ($279–1,399/mo) [S7] | No | No | No | Deposits, surveys | No | No |
| PreProduct (5% free tier or $59.99–259.99/mo) [S8] | No | No | No | Pre-orders | No | No |
| Kickstarter / BackerKit | No | No | No | Crowdfunding | No | No |
| Pietra, Sourcify, Maker's Row (10,000+ makers) [S24] | No | No | No | No | Yes | No |
| **Kalpi** | **Figma** | **Yes, true size** | **Yes, from any Shopify catalogue** | **Pledge-weighted (in progress)** | **Brief + matching (next)** | **Yes** |

Notes: obsessar.com now redirects to napster.ai/enterprise; Obsess reportedly bought by Infinite Reality in early 2025 (verify) [S25]. Emperia raised a $10M Series A [S26]. Kickstarter: $8.5B+ pledged, 41.98% success rate (Jan 2025) [S18]. The gap: each tool owns one step; none connects the design file to real demand, and none starts where sellers' designs already are.

**TAM / SAM / SOM**
- **TAM:** Shopify "millions of merchants", 175+ countries, 44% US, $378B GMV in 2025 [S4][S5]; Kickstarter $8.5B+ pledged [S18]; creator economy ~$250B → $480B by 2027 (Goldman via secondary source) [S27].
- **SAM:** Faire's 100,000 independent brands as a floor for brands with real packaging [S20]; at ~$600/yr each ≈ $60M/yr (est.), before pledge fees.
- **SOM (3 years, est.):** 2,000 paying brands × $49/mo ≈ $1.2M ARR, plus ~3% of ~$10M pledges ≈ $0.3M → ~$1.5M ARR. Distribution through the free Figma plugin.

## F. Figma sponsor version (60 seconds)
"Thirteen million people use Figma every month, and two-thirds of them aren't designers [S3]. Many are founders designing a real product: a label, a jar, a box. Today their file dies as a flat rectangle. We didn't rebuild Figma. We extended it. Label to Shelf wraps your frames onto real-size 3D packaging, at one pixel to one millimetre. It flags the part of the label that hides round the back. It puts the product in a 3D store and exports React and three.js. We ran that export in Figma Make and reshaped the bottle with a prompt. It fits where Figma is heading, with Make, code layers and 3D transforms at Config 2026 [S28][S29]. And it's a front door: every packaging designer in Figma is one plugin away from finding out whether buyers want their product."

**Before / after (3 label versions; estimate from list prices)**
| Step | Today | With Kalpi |
|---|---|---|
| 3D mockups | Pacdora $29/mo [S19], ~1 hr | Plugin, ~1 min |
| Test prints | $20–50 each, 5–15 days [S10] → ~$105 | Real-size check + % hidden, instant |
| Product photos | $20–95/image [S17] → ~$600 (3 × 4 shots) | 3D store renders, minutes |
| Demand test | Prelaunch Starter $279/mo [S7] | Pledge page from the same file (next) |
| **Total** | **~$1,000 and 1–3 weeks** | **Under 10 minutes; one subscription** |

## G. Judge Q&A
1. **Why not Pacdora?** Pacdora makes pictures of your box. It doesn't start from your Figma file, build a store, or measure demand. Mockups answer "does it look right?"; Kalpi answers "will anyone pay?"
2. **Isn't voting noise?** Yes: Threadless negative votes are gamed [S16]. So we weight by pledges (stated price + refundable deposit), the model Kickstarter runs at $8.5B scale [S18].
3. **How good is the 3D?** Lathe models are exact for round packaging (most of these products). For other shapes we tested Tripo; open models like Stable Fast 3D (0.5 s/model [S30]) and MIT-licensed TRELLIS [S31] keep improving.
4. **Will Figma build this?** Figma builds the platform (Make, code layers, agent [S28][S29]). Demand capture, payments and manufacturers are commerce. Plugins exist for this; Figma sells them with an 85/15 split [S32].
5. **Is the manufacturer side real?** Not yet. Step one: a manufacturer brief from the 3D spec (printed size, material, pledged quantity) sent to low-MOQ suppliers like Pietra or Maker's Row (10,000+ makers [S24]).
6. **Privacy / IP of product photos?** Only public catalogue data; models belong to the merchant; opt-in for merchant-owned stores. Tripo's free tier is non-commercial [S33].
7. **Who pays?** The seller: free plugin, $29–49/mo Pro, ~3% of pledges. Cheaper than Prelaunch at $279/mo [S7].
8. **Isn't a virtual store a gimmick?** It's the test bench: shelf context is how buyers see the product. Shopify supports 3D models (GLB/USDZ) natively [S34].
9. **Most sellers use Canva?** Figma has 13M+ monthly users, two-thirds non-designers [S3], and packaging designers and agencies work there. Start where the best files are; other tools later.
10. **What's defensible?** The loop and the data: every pledge teaches which designs sell. No mockup tool has that.
11. **Deposits and legal risk?** Through a payment processor, the pattern Prelaunch and PreProduct use [S7][S8]; we partner rather than hold funds.
12. **What's mocked?** The pledge results page (if not live), ad generation, manufacturer matching. Everything else runs live.

## H. What to build next (ranked)
1. Live pledge page (3–4 h): A/B/C cards, "I'd buy at $__", email, live bars; QR on the last slide.
2. "Publish to store" (2 h): plugin variant appears in the walk-in store with a pledge button.
3. Backup screen recording of the whole flow (1 h).
4. Figma Stage Log / process doc (1 h).
5. Manufacturer brief export (1.5 h): one-page spec PDF.
6. One Tripo hero model (0.5 h), if paid.
7. Ad generation (2 h), only if ahead.

## Numbers to avoid
- Shopify's "94% higher conversion with 3D" (no source given).
- "4.8M Shopify stores" (third-party blogs; Shopify says "millions").
- Nielsen's 85% failure rate (use the peer-reviewed 40%).

## Sources
- [S1] https://www.calhacks.io/
- [S2] https://innovationlab.fetch.ai/events/calhacks-13-0
- [S3] https://cjgustafson.substack.com/p/figma-ipo-s1-breakdown
- [S4] https://www.sec.gov/Archives/edgar/data/1594805/000159480526000007/shop-20251231.htm
- [S5] https://transcripts.platformaeronaut.com/transcripts/SHOP-4Q25-transcript
- [S6] https://www.pacdora.com/pricing
- [S7] https://prelaunch.com/pricing
- [S8] https://apps.shopify.com/preproduct
- [S9] https://eightx.co/blog/cpg-comanufacturing-cost-moq
- [S10] https://seller.alibaba.com/blogs/2026/southeast-asia/packaging/custom-gift-box-moq-branding-guide-alibaba-b2b
- [S11] https://www.pietrastudio.com/sourcing/products/custom-formulation-mask
- [S13] https://bevindustry.com/articles/87718-nielsen-85-percent-of-new-products-fail-in-the-marketplace
- [S14] Castellion & Markham (2013), JPIM 30(5) (search results only)
- [S16] https://nosh.northwestern.edu/wp-content/uploads/2021/04/2018_01_10_Manuscript_Crowd-voting_Threadless.pdf
- [S17] https://squareshot.com/post/product-photography-pricing-get-the-best-value-for-your-budget
- [S18] https://www.statista.com/statistics/251727/projects-and-dollars-overview-on-crowdfunding-platform-kickstarter
- [S19] https://www.softwareadvice.com/graphic-design/pacdora-3d-packaging-creator-profile/
- [S20] https://www.faire.com/en-gb/about
- [S21] https://www.eu-startups.com/2021/02/global-design-platform-canva-acquires-two-word-class-european-innovators-kaleido-ai-smartmockups/
- [S22] https://www.vectary.com/pricing/
- [S23] https://apps.shopify.com/zakeke-interactive-product-designer
- [S24] Maker's Row (search summary only)
- [S25] https://aeroleads.com/c/obsess
- [S26] https://fashionunited.uk/news/business/emperia-raises-10-million-dollars-to-back-virtual-retail-solutions/2023012567471
- [S27] https://kolaking.substack.com/p/the-creator-economy-could-approach
- [S28] https://forum.figma.com/product-updates-3/everything-announced-at-config-2026-55221
- [S29] https://www.cmswire.com/digital-experience/figma-launches-code-layers-motion-at-config-2026/
- [S30] http://stability.ai/news-updates/introducing-stable-fast-3d
- [S31] https://github.com/microsoft/TRELLIS
- [S32] https://help.figma.com/hc/en-us/articles/12067637274519-About-selling-Community-resources
- [S33] https://www.costbench.com/software/ai-3d-generation/tripo-ai/
- [S34] https://www.shopify.com/ae/blog/3d-model-products
