"""Turn a Shopify store's product photos into simple 3D models for the walk-in store.

For each single product photo:
  1. rembg cuts the product out of its background.
  2. We measure the cut-out's width row by row -> a half-outline (radius, height) in mm.
  3. The cut-out photo is saved; three.js spins the outline into a shape and wraps the photo back on.
Flat things (chip bags, tote, gift card, boxes) become thin boxes with the photo on the front.
Multi-packs ("6 Bottles", "Duo", "Trio") become several copies of the single products.

Usage: .venv-3d/bin/python tools/make3d.py data/cache/graza.co
Writes <dir>/3d/catalog.json and <dir>/3d/tex/*.png
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "data/cache/graza.co")
OUT = ROOT / "3d"
(OUT / "tex").mkdir(parents=True, exist_ok=True)

# The single products, with real heights in mm (from the product names and typical pack sizes).
# kind: lathe = round product spun from its outline; flat = bag/card; box = boxed product.
BASES = {
    "drizzle":            ("lathe", 235),
    "sizzle":             ("lathe", 285),
    "frizzle-squeeze":    ("lathe", 250),
    "drizzle-glass":      ("lathe", 215),
    "sizzle-glass":       ("lathe", 250),
    "drizzle-refill-can": ("lathe", 170),
    "sizzle-refill-can":  ("lathe", 200),
    "sizzle-spray":       ("lathe", 195),
    "frizzle-spray":      ("lathe", 195),
    "frizzle-jug":        ("lathe", 300),
    "sizzle-1l":          ("lathe", 290),
    "original-mayo":      ("lathe", 185),
    "fancy-mayo":         ("lathe", 185),
    "garlic-aioli":       ("lathe", 185),
    "potato-chips":                          ("flat", 230),
    "hot-n-sweet-olive-oil-potato-chips":    ("flat", 230),
    "zesty-caesar-olive-oil-potato-chips":   ("flat", 230),
    "sea-salt-vinegar-olive-oil-potato-chips": ("flat", 230),
    "the-graza-tote":     ("flat", 380),
    "graza-gift-card":    ("flat", 60),
    "sizzle-bag-in-box":  ("box", 260),
}
DEPTH = {"flat": 0.18, "box": 0.75}  # depth as a fraction of width


def count_in(handle):
    m = re.search(r"(\d+)-(bottle|bottles|can|cans|set|sets|jug|pack)", handle)
    return int(m.group(1)) if m else 1


def composition(handle):
    """Which single products (and how many) make up this listing."""
    h = handle
    if h in BASES:
        return [[h, 1]]
    n = count_in(h)
    if "5l" in h:
        return [["frizzle-jug", 3]]
    if "2l" in h:
        return [["frizzle-jug", 4 if "case" in h else 1]]
    if "triple-frizz" in h:
        return [["frizzle-squeeze", n], ["frizzle-spray", n], ["frizzle-jug", n]]
    if "triple-sizz" in h:
        return [["sizzle", n], ["sizzle-spray", n], ["sizzle-refill-can", n]]
    if "starter-kit" in h:
        return [["drizzle", 1], ["sizzle", 1], ["drizzle-refill-can", 1], ["sizzle-refill-can", 1]]
    if "super-gift" in h:
        return [["drizzle", 1], ["sizzle", 1], ["frizzle-squeeze", 1], ["original-mayo", 1]]
    if "cooks-a-lot" in h:
        return [["sizzle", 1], ["sizzle-refill-can", 1]]
    if "trio" in h:
        if "refill" in h:
            return [["drizzle-refill-can", n], ["sizzle-refill-can", n], ["frizzle-jug", n]]
        return [["drizzle", n], ["sizzle", n], ["frizzle-squeeze", n]]
    if "duo" in h or "drizzle-sizzle" in h or "sizzle-drizzle" in h:
        if "glass" in h:
            return [["drizzle-glass", n], ["sizzle-glass", n]]
        if "refill" in h:
            return [["drizzle-refill-can", n], ["sizzle-refill-can", n]]
        return [["drizzle", n], ["sizzle", n]]
    oil = "frizzle" if "frizzle" in h else "sizzle" if "sizzle" in h else "drizzle"
    if "glass" in h:
        return [[oil + "-glass", n]]
    if "spray" in h:
        return [[oil + "-spray", n]]
    if "jug" in h:
        return [["frizzle-jug", 4 if "4-pack" in h or "4-bottles" in h else 1]]
    if "squeeze" in h:
        return [["frizzle-squeeze", n]]
    if "refill" in h or "can" in h:
        return [[oil + "-refill-can", n]]
    return [[oil, n]]


def find_image(base):
    for ext in (".jpg", ".png", ".jpeg", ".webp"):
        p = ROOT / "img" / (base + ext)
        if p.exists():
            return p
    return None


def smooth(a, k=5):
    out = a.copy()
    for i in range(len(a)):
        out[i] = np.median(a[max(0, i - k // 2): i + k // 2 + 1])
    return out


def main():
    session = new_session("u2net")
    bases = {}
    for bid, (kind, height_mm) in BASES.items():
        src = find_image(bid)
        if not src:
            print("no photo for", bid)
            continue
        cut = remove(Image.open(src).convert("RGB"), session=session)  # RGBA
        a = np.array(cut)[:, :, 3]
        ys, xs = np.where(a > 160)
        if len(xs) < 50:
            print("cut-out failed for", bid)
            continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = cut.crop((x0, y0, x1, y1))
        m = np.array(crop)[:, :, 3] > 160
        H, W = m.shape
        scale = min(1.0, 768 / H)
        tex_name = f"tex/{bid}.png"
        crop.resize((max(1, round(W * scale)), max(1, round(H * scale))), Image.LANCZOS).save(OUT / tex_name)
        k = height_mm / H  # mm per pixel
        entry = {"kind": kind, "heightMM": height_mm, "widthMM": round(W * k, 1), "tex": tex_name}
        if kind == "lathe":
            rows = np.linspace(H - 1, 0, 90).astype(int)  # bottom -> top
            lefts, rights = [], []
            for y in rows:
                c = np.where(m[y])[0]
                lefts.append(c.min() if len(c) else np.nan)
                rights.append(c.max() if len(c) else np.nan)
            lefts, rights = np.array(lefts, float), np.array(rights, float)
            axis = float(np.nanmedian((lefts + rights) / 2))
            half = np.nan_to_num((rights - lefts) / 2, nan=0.0)
            half = smooth(half)
            prof = [[0.0, 0.0]]
            for y, r in zip(rows, half):
                prof.append([round(float(r * k), 2), round(float((H - 1 - y) * k), 2)])
            prof.append([0.0, round(float(height_mm), 2)])
            entry.update({"profile": prof, "axisU": round(axis / W, 4)})
        bases[bid] = entry
        print(f"{bid:42s} {kind:5s} {entry['widthMM']:6.1f} x {height_mm} mm")

    data = json.load(open(ROOT / "products.json"))
    products = {}
    for p in data["products"]:
        comp = [c for c in composition(p["handle"]) if c[0] in bases]
        if comp:
            products[p["handle"]] = comp
    json.dump({"bases": bases, "products": products}, open(OUT / "catalog.json", "w"))
    print(f"\n{len(bases)} 3D models, {len(products)} of {len(data['products'])} products mapped -> {OUT/'catalog.json'}")


if __name__ == "__main__":
    main()
