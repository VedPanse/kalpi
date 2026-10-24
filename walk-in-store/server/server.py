"""Local helper for the 3D store prototype.

Serves the page, reads a Shopify store's public /products.json, and passes product
images through so three.js can use them as textures (browsers block reading other
sites' data and images directly).

Run:  python3 server/server.py   (API on http://127.0.0.1:8790; during development
      open the Vite page at http://127.0.0.1:5173, which forwards /api and /img here.
      After `npm run build`, this server also serves the built site from dist/.)
"""
import json
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "dist"
CACHE = Path(__file__).resolve().parent.parent / "data" / "cache"  # saved catalogues + 3D models, per store
PORT = 8790
UA = {"User-Agent": "Mozilla/5.0 (store-prototype)"}
IMAGE_HOSTS = ("cdn.shopify.com",)


def fetch(url, limit=8_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read(limit), r.headers.get("Content-Type", "application/octet-stream")


def clean_domain(raw):
    raw = raw.strip()
    if "://" not in raw:
        raw = "https://" + raw
    host = urllib.parse.urlparse(raw).hostname or ""
    if not host or "." not in host:
        raise ValueError("Enter a store address like homesick.com")
    return host


ASSETS = Path(__file__).resolve().parent.parent / "assets"  # committed catalogues + 3D models (e.g. assets/graza.co)


def cache_dir(domain):
    """Saved catalogue + 3D models for a store: the committed assets/ folder first, then the local data/cache/."""
    d = domain.removeprefix("www.")
    return ASSETS / d if (ASSETS / d / "3d" / "catalog.json").exists() else CACHE / d


def products(domain):
    items = []
    try:
        for page in (1, 2):
            body, _ = fetch(f"https://{domain}/products.json?limit=250&page={page}")
            batch = json.loads(body).get("products", [])
            items += batch
            if len(batch) < 250:
                break
    except Exception:
        saved = cache_dir(domain) / "products.json"   # offline: use the saved copy if we have one
        if not saved.exists():
            raise
        items = json.loads(saved.read_text()).get("products", [])
    out = []
    for p in items:
        imgs = [i["src"] for i in p.get("images", []) if i.get("src")]
        variants = p.get("variants") or []
        if not imgs or not variants:
            continue
        v = variants[0]
        out.append({
            "id": p["id"],
            "title": p.get("title", ""),
            "vendor": p.get("vendor", ""),
            "type": p.get("product_type", ""),
            "handle": p.get("handle", ""),
            "price": v.get("price"),
            "variant_id": v.get("id"),
            "image": imgs[0],
        })
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def send_bytes(self, code, data, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "max-age=3600")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        try:
            if url.path == "/api/products":
                domain = clean_domain(q.get("store", [""])[0])
                data = {"store": domain, "products": products(domain)}
                return self.send_bytes(200, json.dumps(data).encode(), "application/json")
            if url.path == "/api/models":
                catalog = cache_dir(clean_domain(q.get("store", [""])[0])) / "3d" / "catalog.json"
                if not catalog.exists():
                    return self.send_bytes(404, b'{"error": "no 3D models for this store"}', "application/json")
                return self.send_bytes(200, catalog.read_bytes(), "application/json")
            if url.path.startswith("/models/"):
                # /models/<store>/<file>, e.g. /models/graza.co/tex/drizzle.png
                parts = url.path.split("/", 3)
                if len(parts) < 4:
                    return self.send_bytes(404, b"not found", "text/plain")
                base = (cache_dir(clean_domain(parts[2])) / "3d").resolve()
                f = (base / parts[3]).resolve()
                if base not in f.parents or not f.is_file():
                    return self.send_bytes(404, b"not found", "text/plain")
                ctype = "image/png" if f.suffix == ".png" else "image/jpeg" if f.suffix in (".jpg", ".jpeg") else "application/octet-stream"
                return self.send_bytes(200, f.read_bytes(), ctype)
            if url.path == "/img":
                src = q.get("u", [""])[0]
                host = urllib.parse.urlparse(src).hostname or ""
                if not host.endswith(IMAGE_HOSTS):
                    return self.send_bytes(400, b"image host not allowed", "text/plain")
                sep = "&" if "?" in src else "?"
                body, ctype = fetch(src + sep + "width=360")
                return self.send_bytes(200, body, ctype)
        except ValueError as e:
            return self.send_bytes(400, json.dumps({"error": str(e)}).encode(), "application/json")
        except Exception as e:  # network errors, stores that don't share products.json
            msg = f"Couldn't read that store's products ({e.__class__.__name__}). It may not be a Shopify store, or it hides its catalogue."
            return self.send_bytes(502, json.dumps({"error": msg}).encode(), "application/json")
        return super().do_GET()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"3D store prototype: http://127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
