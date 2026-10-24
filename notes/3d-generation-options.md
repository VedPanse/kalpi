# Making 3D products: options (24 Oct 2026)

## What we tried
- **Our free method** (`walk-in-store/tools/make3d.py`): rembg cuts the product out of its photo, we measure the outline row by row, three.js spins it (LatheGeometry) and wraps the photo back on. Free, seconds, offline, real size from the title. Wrong for handles, nozzles and boxes (the jug handle became a ring), and the back is a mirror of the front.
- **Tripo Studio** (studio.tripo3d.ai), HD Model, H3.1 "Best Quality", 55 credits per model, about 3 minutes each. The Frizzle jug came out with a real handle, cap ring and readable label all round (`tripo/tripo-frizzle-jug.png`); the Original mayo too. Free plan: 200 credits, one task at a time, **no export**. Exporting GLB needs a paid plan.

## Options
| Option | Cost | Quality | Catch |
|---|---|---|---|
| Tripo Pro | $13/month (yearly), 3000 credits ≈ 50 HD models | Best | Not unlimited; paid |
| TripoSR (Tripo's open model) | Free, unlimited | OK, rougher | Slower on a Mac CPU |
| Stable Fast 3D (Stability AI) | Free, unlimited | Good for simple products, textured | Free licence for small companies |
| TRELLIS / Hunyuan3D | Free | Close to Tripo | Needs a big NVIDIA GPU; free Hugging Face demos have daily limits |
| fal.ai (hosted Tripo / Hunyuan3D) | Pay per model | Good to best | Needs a top-up and a new key |

## Plan
Free model (Stable Fast 3D or our outline method) for every product of any shop; Tripo for 2–3 hero products in the demo. `walk-in-store/tools/tripo3d.py` automates Tripo once there is an API key.
