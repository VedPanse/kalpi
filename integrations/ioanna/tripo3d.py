"""Make real 3D models of a store's products with Tripo (image -> textured GLB).

Uses the cut-out photos from tools/make3d.py (data/cache/<store>/3d/tex/*.png).
Each GLB is saved to data/cache/<store>/3d/tripo/<id>.glb and catalog.json gets a "glb" entry,
so the walk-in store loads the Tripo model instead of the spun outline.

Key: put your Tripo API key in ~/.tripo_key (one line), or set TRIPO_API_KEY.
Usage: python3 tools/tripo3d.py data/cache/graza.co [id ...]
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

API = "https://openapi.tripo3d.com/v3"
ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "data/cache/graza.co")
ONLY = set(sys.argv[2:])
OUT = ROOT / "3d"
(OUT / "tripo").mkdir(parents=True, exist_ok=True)

key = os.environ.get("TRIPO_API_KEY") or (Path.home() / ".tripo_key").read_text().strip()
AUTH = {"Authorization": f"Bearer {key}"}


def call(method, path, body=None, data=None, headers=None):
    h = dict(AUTH, **(headers or {}))
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(API + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path}: HTTP {e.code} {e.read()[:300]!r}")


def upload(png: Path) -> str:
    boundary = "----tripo" + str(int(time.time() * 1000))
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{png.name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + png.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    res = call("POST", "/files", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    d = res.get("data", res)
    return d.get("file_token") or d.get("token") or d["image_token"]


def generate(token: str) -> str:
    res = call("POST", "/generation/image-to-model", {"input": token, "texture": True, "pbr": True})
    d = res.get("data", res)
    return d.get("task_id") or d["id"]


def wait(task_id: str) -> str:
    for _ in range(120):  # up to ~10 minutes
        res = call("GET", f"/tasks/{task_id}")
        d = res.get("data", res)
        status = d.get("status")
        if status == "success":
            out = d.get("output", {})
            return out.get("model_url") or out.get("pbr_model") or out.get("model")
        if status in ("failed", "cancelled", "banned"):
            raise RuntimeError(f"task {task_id} {status}")
        time.sleep(5)
    raise RuntimeError(f"task {task_id} timed out")


def main():
    cat = json.load(open(OUT / "catalog.json"))
    for bid, base in cat["bases"].items():
        if ONLY and bid not in ONLY:
            continue
        glb = OUT / "tripo" / f"{bid}.glb"
        if glb.exists():
            print("have", bid)
        else:
            print("Tripo:", bid, "…", flush=True)
            try:
                url = wait(generate(upload(OUT / base["tex"])))
                urllib.request.urlretrieve(url, glb)  # model URLs expire after a few minutes
            except Exception as e:
                print("  failed:", e)
                continue
            print("  saved", glb.name, glb.stat().st_size // 1024, "KB")
        base["glb"] = f"tripo/{bid}.glb"
        json.dump(cat, open(OUT / "catalog.json", "w"))


if __name__ == "__main__":
    main()
