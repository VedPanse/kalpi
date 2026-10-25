"""Tiny local helper so the Figma plugin can use fal.ai without the key ever being in the plugin.

Run:  python3 server/fal_helper.py     (key read from ~/.kalpi/fal_key or FAL_KEY)
POST http://localhost:8795/generate  {"prompt": "..."}  ->  {"image": "<base64 png/jpg>", "mime": "..."}
Uses FLUX schnell (~$0.003 per image). Stops after MAX_IMAGES per run as a safety cap.
"""
import base64
import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8795
MAX_IMAGES = 60
KEY = os.environ.get("FAL_KEY") or (Path.home() / ".kalpi" / "fal_key").read_text().strip()
STYLE = ", single object, centered, front view, flat sticker illustration, thick clean outline, plain white background, no text"
made = 0


def fal_image(prompt):
    body = json.dumps({"prompt": prompt + STYLE, "image_size": "square", "num_images": 1, "num_inference_steps": 4}).encode()
    req = urllib.request.Request("https://fal.run/fal-ai/flux/schnell", data=body, method="POST",
                                 headers={"Authorization": f"Key {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        out = json.loads(r.read())
    url = out["images"][0]["url"]
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kalpi"}), timeout=60) as r:
        return r.read(), r.headers.get("Content-Type", "image/jpeg")


class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")   # Figma plugin windows have a "null" origin
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

    def reply(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code); self.cors()
        self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data)))
        self.end_headers(); self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        self.reply(200, {"ok": True, "made": made, "left": MAX_IMAGES - made})

    def do_POST(self):
        global made
        if self.path != "/generate":
            return self.reply(404, {"error": "not found"})
        try:
            prompt = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)) or 2)).get("prompt", "").strip()[:400]
            if not prompt:
                return self.reply(400, {"error": "Type an idea first."})
            if made >= MAX_IMAGES:
                return self.reply(429, {"error": f"Safety cap of {MAX_IMAGES} images reached; restart the helper to continue."})
            img, mime = fal_image(prompt)
            made += 1
            self.reply(200, {"image": base64.b64encode(img).decode(), "mime": mime, "made": made})
        except urllib.error.HTTPError as e:
            self.reply(502, {"error": f"fal said {e.code}: {e.read()[:200].decode(errors='ignore')}"})
        except Exception as e:
            self.reply(500, {"error": str(e)})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"fal helper on http://localhost:{PORT}  (cap {MAX_IMAGES} images)")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
