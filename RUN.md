# How to run each part (Ioanna's folders)

No credentials are needed for anything below. Optional keys are read from files or env vars and are never committed.

## 1. Walk-in 3D store (any Shopify catalogue; Graza in 3D)
```sh
cd walk-in-store
npm install
npm run api     # terminal 1: Python helper on http://127.0.0.1:8790 (reads products.json, serves 3D models)
npm run dev     # terminal 2: the store on http://127.0.0.1:5173
```
Open http://127.0.0.1:5173, click **graza.co**, then **Enter the store**. Graza's 75 products appear as 3D models.
- 3D models + catalogue: `walk-in-store/assets/graza.co/` (`3d/catalog.json`, `3d/tex/*.png`, `products.json`). The helper uses these first, so it works offline.
- Preview of all 21 models, spinning: http://127.0.0.1:5173/tools/preview/
- Shop-assistant options: http://127.0.0.1:5173/tools/assistant-options/
- Any other store in 3D: `.venv-3d/bin/python tools/add_store.py <store.com>` (needs `pip install "rembg[cpu]" pillow numpy`), then build that store. Example included: `assets/otherland.com/`.
- Optional Tripo generation: `tools/tripo3d.py` reads a key from `TRIPO_API_KEY` or `~/.tripo_key` (paid credits; not needed for the demo).
- The dancing-robot model is not committed (Poser EULA); the store loads it from Khronos' public copy.

## 2. Make app (product + store rooms + Graza store with shopkeeper and cart) — this is the screenshot in `notes/graza-store-shopkeeper-cart.png`
```sh
cd make-app
npm install
npm run dev     # opens the app; tabs: Product, Store, Graza store
```
- Entry point: `src/main.jsx` → `src/App.jsx` → `LabelToShelf3D.jsx` (product), `StoreRooms3D.jsx` (rooms), `GrazaRooms3D.jsx` (Graza store), `ShopAssistant.js` (shopkeeper you can instruct + cart).
- In Figma Make: attach these files in the chat, or paste them into Make's Files. Make installs `three` itself.
- Note: the purple bottle version made by Make's AI lives only inside the Figma Make file; to sync it, open Files → `src/LabelToShelf3D.jsx` in Make and copy it here.
- `label-to-shelf-3d-standalone.html`: the product as one self-contained page (three.js from a CDN).

## 3. Label to Shelf (Figma plugin)
Figma desktop app → Plugins → Development → Import plugin from manifest… → `label-to-shelf/manifest.json`. Select up to 3 label frames (and optionally a vector outline).

## 4. Product viewer and Cal Hacks pages
```sh
cd product-viewer && python3 -m http.server 8811      # http://127.0.0.1:8811
cd cal-hacks-pages && python3 -m http.server 8822     # bottle maker, store rooms, shape studio, torus, build log
cd kalpi-og && python3 -m http.server 8765            # http://127.0.0.1:8765/team-notes/design-options/favourites.html
```

## Notes
- `notes/pitch.md`: pitch script, Devpost text, slides, market, Q&A. `notes/3d-generation-options.md`: 3D options compared.
- Graza's product photos are Graza's; keep them only while the repo is private, or swap in their CDN links before making it public.
