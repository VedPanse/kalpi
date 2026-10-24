# Walk-in Store

Type any Shopify store's address and walk around a 3D shop filled with its real products, photos and prices. Built at Cal Hacks 13.

## Run it

You need Node 20+ and Python 3.

```sh
npm install
npm run api     # terminal 1: the Shopify helper on http://127.0.0.1:8790
npm run dev     # terminal 2: the site on http://127.0.0.1:5173
```

Open http://127.0.0.1:5173, click **Enter the store**, and walk:

- move the mouse (or drag) to look around
- **W A S D** or the arrow keys to walk, **Shift** to walk faster
- click a product to open it, or click the floor to walk there
- **Esc** gives your mouse back

## How it works

1. `server/server.py` reads the store's public `https://<store>/products.json` and passes product photos through (browsers block reading another site's data directly). No API key is needed.
2. `src/store.ts` builds the shop: one two-sided shelving unit for every 80 products, grouped by product type, with price tags, end-of-aisle displays, aisle signs, a checkout counter and an entrance.
3. `src/walker.ts` handles first-person walking and collisions with the shelves and walls.
4. `src/panel.ts` shows the product card with real **Add to cart** and product-page links to the seller's own store.

## Files

```
index.html          page layout
src/main.ts         wires everything together
src/store.ts        builds the 3D store from the products
src/walker.ts       walking, looking, collisions
src/panel.ts        product card and messages
src/textures.ts     signs, price tags and floor drawn in code
src/api.ts          talks to the helper
src/types.ts        shared types
src/styles.css      page styles
server/server.py    Shopify helper (Python standard library only)
```

## Stack

TypeScript, three.js, Vite; Python 3 standard library for the helper.

## 3D products from product photos

`tools/make3d.py` turns a store's product photos into simple 3D models, on a laptop, for free:

1. Save the store's catalogue and photos to `data/cache/<store>/` (`products.json` + `img/<handle>.jpg`).
2. `python3 -m venv .venv-3d && .venv-3d/bin/pip install "rembg[cpu]" pillow numpy`
3. `.venv-3d/bin/python tools/make3d.py data/cache/<store>`

It cuts each product out of its photo (rembg), measures its outline row by row, and saves a half-outline in millimetres plus the cut-out photo. In the store, `src/model3d.ts` spins round products into shape (three.js `LatheGeometry`) and wraps the photo back on; bags, cards and boxes become boxes with the photo on the front. Multi-packs ("6 Cans", "Trio") become several copies of the single products. When a store has models, its shelves show them instead of flat photos, and the helper falls back to the saved catalogue if the internet is down.

`data/` is not committed: product photos belong to the store.
