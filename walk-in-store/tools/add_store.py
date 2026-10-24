"""Turn any Shopify store into 3D products for the walk-in store, in one command.

    .venv-3d/bin/python tools/add_store.py otherland.com [--limit 120]

1. Downloads the store's public products.json and each product's main photo.
2. For each product: cuts it out of the photo (rembg), decides its shape from the title/type
   (round things are spun from their outline; bags, boxes, cards, prints become flat boxes),
   and reads its real size from the title ("8 oz", "250 ml", "16.9 fl oz") or a category default.
3. Writes assets/<store>/products.json and assets/<store>/3d/{catalog.json, tex/*.png}.
The store's helper picks these up automatically: build that store and its shelves are 3D.
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

UA = {"User-Agent": "Mozilla/5.0 (walk-in-store prototype)"}
ROOT = Path(__file__).resolve().parent.parent

FLAT_WORDS = ("bag", "chips", "tote", "card", "gift card", "print", "poster", "sticker", "book", "notebook",
              "pouch", "sachet", "mask sheet", "towel", "blanket", "shirt", "tee", "hoodie", "sock", "apparel")
BOX_WORDS = ("box", "kit", "set", "bundle", "case", "collection", "pack", "gift")
# typical heights in mm when the title gives no size
DEFAULT_H = [("candle", 95), ("lip", 85), ("mascara", 130), ("serum", 110), ("oil", 230), ("sauce", 190),
             ("spray", 190), ("mist", 160), ("perfume", 120), ("fragrance", 120), ("cream", 80), ("balm", 70),
             ("shampoo", 210), ("conditioner", 210), ("wash", 200), ("lotion", 190), ("mug", 100),
             ("tumbler", 200), ("bottle", 230), ("jar", 90), ("can", 120), ("tea", 120), ("coffee", 160)]


def fetch(url, timeout=20):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def size_mm(text, kind):
    """Height in mm from a volume or weight in the title (rough: a cylinder ~1.6x as tall as wide)."""
    t = text.lower()
    ml = None
    if m := re.search(r"(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz", t):
        ml = float(m.group(1)) * 29.6
    elif m := re.search(r"(\d+(?:\.\d+)?)\s*ml\b", t):
        ml = float(m.group(1))
    elif m := re.search(r"(\d+(?:\.\d+)?)\s*(?:l|liter|litre)\b", t):
        ml = float(m.group(1)) * 1000
    elif m := re.search(r"(\d+(?:\.\d+)?)\s*g\b", t):
        ml = float(m.group(1))  # ~1 g/ml
    if ml and 3 < ml < 6000:
        # volume = pi r^2 h with h = 3.2 r  ->  h = (3.2^2 * V / pi)^(1/3), in cm -> mm, plus caps/shoulders
        h_cm = (3.2 ** 2 * ml / np.pi) ** (1 / 3)
        return round(h_cm * 10 * 1.15)
    for word, h in DEFAULT_H:
        if word in t:
            return h
    return {"flat": 230, "box": 160}.get(kind, 180)


def kind_of(title, ptype):
    t = f"{title} {ptype}".lower()
    if any(re.search(rf"\b{w}s?\b", t) for w in FLAT_WORDS):
        return "flat"
    if any(re.search(rf"\b{w}\b", t) for w in BOX_WORDS):
        return "box"
    return "lathe"


def smooth(a, k=5):
    out = a.copy()
    for i in range(len(a)):
        out[i] = np.median(a[max(0, i - k // 2): i + k // 2 + 1])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("store")
    ap.add_argument("--limit", type=int, default=150, help="max products to model")
    args = ap.parse_args()
    store = args.store.lower().replace("https://", "").replace("http://", "").strip("/").removeprefix("www.")
    out = ROOT / "assets" / store
    (out / "3d" / "tex").mkdir(parents=True, exist_ok=True)
    (out / "img").mkdir(exist_ok=True)

    items = []
    for page in (1, 2):
        batch = json.loads(fetch(f"https://{store}/products.json?limit=250&page={page}")).get("products", [])
        items += batch
        if len(batch) < 250:
            break
    (out / "products.json").write_text(json.dumps({"products": items}))
    print(f"{store}: {len(items)} products")

    session = new_session("u2net")
    bases, products = {}, {}
    for p in items[: args.limit]:
        imgs = p.get("images") or []
        if not imgs:
            continue
        h, title, ptype = p["handle"], p.get("title", ""), p.get("product_type", "")
        src = imgs[0]["src"]
        photo = out / "img" / (h + ".jpg")
        try:
            if not photo.exists():
                photo.write_bytes(fetch(src + ("&" if "?" in src else "?") + "width=800"))
            cut = remove(Image.open(photo).convert("RGB"), session=session)
        except Exception as e:
            print("  skip", h, e.__class__.__name__)
            continue
        a = np.array(cut)[:, :, 3]
        ys, xs = np.where(a > 160)
        if len(xs) < 50:
            continue
        crop = cut.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        m = np.array(crop)[:, :, 3] > 160
        H, W = m.shape
        kind = kind_of(title, ptype)
        if kind == "lathe" and W / H > 1.4:
            kind = "box"  # wide and short: more likely a box/set than a bottle
        height = size_mm(f"{title} {ptype}", kind)
        k = height / H
        scale = min(1.0, 768 / H)
        crop.resize((max(1, round(W * scale)), max(1, round(H * scale))), Image.LANCZOS).save(out / "3d" / "tex" / f"{h}.png")
        e = {"kind": kind, "heightMM": height, "widthMM": round(W * k, 1), "tex": f"tex/{h}.png"}
        if kind == "lathe":
            rows = np.linspace(H - 1, 0, 90).astype(int)
            L, R = [], []
            for y in rows:
                c = np.where(m[y])[0]
                L.append(c.min() if len(c) else np.nan)
                R.append(c.max() if len(c) else np.nan)
            L, R = np.array(L, float), np.array(R, float)
            half = smooth(np.nan_to_num((R - L) / 2, nan=0.0))
            prof = [[0.0, 0.0]] + [[round(float(r * k), 2), round(float((H - 1 - y) * k), 2)] for y, r in zip(rows, half)]
            prof.append([0.0, round(float(height), 2)])
            e.update({"profile": prof, "axisU": round(float(np.nanmedian((L + R) / 2)) / W, 4)})
        bases[h] = e
        products[h] = [[h, 1]]
        print(f"  {kind:5s} {height:4d} mm  {title[:60]}")
    (out / "3d" / "catalog.json").write_text(json.dumps({"bases": bases, "products": products}))
    print(f"\n{len(bases)} products in 3D -> {out / '3d' / 'catalog.json'}")
    print(f"Build '{store}' in the walk-in store to see them.")


if __name__ == "__main__":
    sys.exit(main())
