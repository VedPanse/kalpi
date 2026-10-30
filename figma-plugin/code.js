(() => {
  // shared/label-art.js
  var hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  function validateLabelArt(a) {
    if (a == null) return null;
    if (!a || !hex(a.background) || !Array.isArray(a.paths) || a.paths.length > 32 || !Array.isArray(a.texts) || a.texts.length > 5) throw Error("Artwork needs a background, up to 32 vector paths and 5 text lines.");
    for (const p of a.paths) {
      if (typeof p.d !== "string" || p.d.length > 6e3 || !/^[MmLlHhVvCcSsQqTtAaZz0-9.,+\s-]+$/.test(p.d) || !/[Mm]/.test(p.d) || !(hex(p.fill) || p.fill === "none") || !(hex(p.stroke) || p.stroke === "none") || !Number.isFinite(p.strokeWidth) || p.strokeWidth < 0 || p.strokeWidth > 20) throw Error("Artwork contains an invalid vector path.");
    }
    for (const t of a.texts) {
      if (typeof t.text !== "string" || t.text.length > 60 || !hex(t.color) || !["serif", "sans-serif"].includes(t.font) || !["normal", "bold"].includes(t.weight) || ![t.x, t.y, t.size].every(Number.isFinite) || t.x < 0 || t.x > 1e3 || t.y < 0 || t.y > 1e3 || t.size < 12 || t.size > 180) throw Error("Artwork text is outside the label.");
    }
    if (JSON.stringify(a).length > 32e3) throw Error("Artwork is too complex. Simplify the illustration.");
    return JSON.parse(JSON.stringify(a));
  }
  function labelArtSvg(a) {
    validateLabelArt(a);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="${a.background}"/>${a.paths.map((p) => `<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`).join("")}</svg>`;
  }

  // shared/assembly-projection.js
  function assemblyProjection(components) {
    const boxes = components.map((part) => {
      const [rx, ry, rz] = part.rotation, points = [];
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
        let [a, b, c] = [x * part.size[0], y * part.size[1], z * part.size[2]];
        [a, b] = [a * Math.cos(rz) - b * Math.sin(rz), a * Math.sin(rz) + b * Math.cos(rz)];
        [a, c] = [a * Math.cos(ry) + c * Math.sin(ry), -a * Math.sin(ry) + c * Math.cos(ry)];
        [b, c] = [b * Math.cos(rx) - c * Math.sin(rx), b * Math.sin(rx) + c * Math.cos(rx)];
        points.push([a + part.position[0], b + part.position[1]]);
      }
      return { minX: Math.min(...points.map((p) => p[0])), maxX: Math.max(...points.map((p) => p[0])), minY: Math.min(...points.map((p) => p[1])), maxY: Math.max(...points.map((p) => p[1])) };
    });
    const minX = Math.min(...boxes.map((b) => b.minX)), maxX = Math.max(...boxes.map((b) => b.maxX)), minY = Math.min(...boxes.map((b) => b.minY)), maxY = Math.max(...boxes.map((b) => b.maxY));
    return boxes.map((b) => ({ x: (b.minX - minX) / (maxX - minX), y: (maxY - b.maxY) / (maxY - minY), width: (b.maxX - b.minX) / (maxX - minX), height: (b.maxY - b.minY) / (maxY - minY) }));
  }

  // shared/figma-selection.js
  function selectionDimensions(width, height, text = "") {
    const clamp = (n) => Math.max(5e-3, Math.min(10, n));
    const match = text.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/i);
    if (match) {
      const unit = { mm: 1e-3, cm: 0.01, m: 1 }[match[4].toLowerCase()];
      const [w, d, h] = match.slice(1, 4).map((n) => Number(n) * unit);
      if ([w, d, h].every((n) => n >= 5e-3 && n <= 10))
        return { dimensions: { width: w, depth: d, height: h }, source: "From selected design annotation (W \xD7 D \xD7 H); review before confirming" };
    }
    const ratio = width / Math.max(height, 1);
    return { dimensions: { width: clamp(0.2 * Math.min(1, ratio)), height: clamp(0.2 / Math.max(1, ratio)), depth: 0.02 }, source: "Estimated: longest side 20 cm, depth 2 cm; 2D proportions preserved. Confirm actual size." };
  }

  // shared/graza-models.js
  var GRAZA_MODELS = { "drizzle": { "kind": "lathe", "heightMM": 235, "widthMM": 79.7, "profile": [[0, 0], [32.6, 2.8], [37.9, 8.1], [39.2, 13.4], [39.2, 18.7], [39.3, 24], [39.3, 29.3], [39.3, 34.6], [39.3, 39.9], [39.3, 45.2], [39.3, 50.1], [39.5, 55.4], [39.5, 60.7], [39.5, 66], [39.5, 71.3], [39.5, 76.6], [39.5, 81.9], [39.5, 87.2], [39.5, 92.5], [39.5, 97.7], [39.5, 103], [39.5, 108.3], [39.7, 113.6], [39.5, 118.9], [39.5, 124.2], [39.5, 129.5], [39.3, 134.8], [39.2, 140.1], [39, 145], [39, 150.3], [38.6, 155.6], [37.2, 160.9], [34.8, 166.2], [30.9, 171.5], [24.5, 176.8], [17.1, 182.1], [17.1, 187.4], [17.3, 192.7], [17.3, 197.9], [16.2, 203.2], [8.1, 208.5], [6.5, 213.8], [6.3, 219.1], [5.3, 224.4], [3.9, 229.7], [3.2, 234.7], [0, 235]], "axisU": 0.4956, "tex": "graza/drizzle.webp", "title": '"Drizzle"', "price": 21 }, "sizzle": { "kind": "lathe", "heightMM": 285, "widthMM": 76.3, "profile": [[0, 0], [32.7, 3.3], [37, 9.9], [37.4, 16.2], [37.4, 22.5], [37.2, 29.1], [37.2, 35.4], [37.2, 41.7], [37.4, 48.3], [37.4, 54.6], [37.4, 60.8], [37.4, 67.5], [37.4, 73.7], [37.4, 80], [37.4, 86.6], [37.4, 92.9], [37.4, 99.2], [37.2, 105.8], [37.2, 112.1], [37.2, 118.3], [37.4, 125], [37.4, 131.2], [37.2, 137.5], [37.2, 144.2], [37.2, 150.4], [37.4, 157.1], [37.4, 163.3], [37.4, 169.6], [37.4, 176.2], [37.2, 182.5], [37.2, 188.8], [37.2, 195.4], [36.9, 201.7], [36.1, 207.9], [33.5, 214.6], [29.5, 220.8], [22.7, 227.1], [16.2, 233.8], [16.2, 240], [16.2, 246.3], [15.7, 252.9], [7.6, 259.2], [6.1, 265.5], [5.7, 272.1], [3.9, 278.4], [3.1, 284.6], [0, 285]], "axisU": 0.4903, "tex": "graza/sizzle.webp", "title": '"Sizzle"', "price": 16 }, "frizzle-squeeze": { "kind": "lathe", "heightMM": 250, "widthMM": 66.4, "profile": [[0, 0], [28.9, 3], [32.4, 8.7], [32.8, 14.3], [32.8, 20], [33, 25.3], [33, 30.9], [33, 36.6], [32.8, 42.2], [32.8, 47.9], [32.8, 53.5], [33, 59.2], [33, 64.9], [33, 70.1], [33, 75.8], [33, 81.5], [33, 87.1], [33, 92.8], [33, 98.4], [33, 104.1], [33, 109.7], [33, 115], [32.8, 120.7], [32.8, 126.3], [32.8, 132], [32.8, 137.6], [32.8, 143.3], [32.8, 148.9], [32.8, 154.6], [32.8, 159.9], [32.8, 165.5], [32.8, 171.2], [32.6, 176.8], [31.9, 182.5], [30.4, 188.2], [27.3, 193.8], [22.2, 199.5], [16, 204.8], [13.9, 210.4], [13.9, 216.1], [13.8, 221.7], [6.8, 227.4], [5.3, 233], [4.7, 238.7], [3.6, 244.3], [2.8, 249.6], [0, 250]], "axisU": 0.4972, "tex": "graza/frizzle-squeeze.webp", "title": '"Frizzle" Squeeze', "price": 14 }, "drizzle-glass": { "kind": "lathe", "heightMM": 215, "widthMM": 82.3, "profile": [[0, 0], [32.6, 2.7], [37.2, 7.5], [39.3, 12.2], [39.6, 17], [39.8, 21.8], [40, 26.5], [40.1, 31.6], [40.3, 36.4], [40.3, 41.2], [40.3, 45.9], [40.3, 50.7], [40.5, 55.8], [40.5, 60.5], [40.5, 65.3], [40.5, 70.1], [40.5, 74.8], [40.5, 79.6], [40.6, 84.7], [40.6, 89.5], [40.6, 94.2], [40.6, 99], [40.6, 103.8], [40.6, 108.9], [40.6, 113.6], [40.6, 118.4], [40.6, 123.2], [40.6, 127.9], [40.3, 132.7], [40.1, 137.8], [40.1, 142.5], [40, 147.3], [39.1, 152.1], [37.2, 156.8], [34.4, 161.9], [30.1, 166.7], [24, 171.5], [18.2, 176.2], [15.3, 181], [14.8, 185.7], [15.8, 190.8], [16.3, 195.6], [16.3, 200.4], [16.3, 205.1], [16.7, 209.9], [16.7, 214.7], [0, 215]], "axisU": 0.4979, "tex": "graza/drizzle-glass.webp", "title": '"Drizzle" Glass', "price": 22.99 }, "sizzle-glass": { "kind": "lathe", "heightMM": 250, "widthMM": 69.6, "profile": [[0, 0], [30, 3], [32.9, 8.6], [34, 14.1], [34.2, 19.7], [34.2, 25.3], [34.2, 30.9], [34.2, 36.8], [34.2, 42.4], [34.2, 48], [34.2, 53.6], [34.2, 59.1], [34.2, 64.7], [34.2, 70.3], [34.2, 75.9], [34, 81.5], [34, 87], [34, 92.6], [34, 98.2], [34, 103.8], [33.9, 109.8], [33.9, 115.3], [33.9, 120.9], [33.9, 126.5], [33.9, 132.1], [33.9, 137.7], [34, 143.2], [33.9, 148.8], [33.9, 154.4], [33.9, 160], [33.9, 165.6], [33.9, 171.1], [34, 176.7], [34, 182.7], [34, 188.2], [33.5, 193.8], [32, 199.4], [28.3, 205], [21.9, 210.6], [15.1, 216.2], [12.7, 221.7], [12.7, 227.3], [13.8, 232.9], [13.9, 238.5], [13.9, 244.1], [14.1, 249.6], [0, 250]], "axisU": 0.4973, "tex": "graza/sizzle-glass.webp", "title": '"Sizzle" Glass', "price": 19.99 }, "drizzle-refill-can": { "kind": "lathe", "heightMM": 170, "widthMM": 65.5, "profile": [[0, 0], [19, 2.1], [23.7, 6], [29, 9.6], [30.8, 13.5], [31.2, 17.4], [31.9, 21.2], [32, 24.8], [32, 28.7], [32, 32.6], [32, 36.5], [32.2, 40.4], [32.2, 43.9], [32, 47.8], [32, 51.7], [32, 55.6], [32, 59.1], [32, 63], [32, 66.9], [32, 70.8], [32, 74.4], [32.2, 78.3], [32.2, 82.2], [32.2, 86.1], [32.2, 89.6], [32.2, 93.5], [32.2, 97.4], [32.2, 101.3], [32.2, 105.2], [32.2, 108.7], [32.2, 112.6], [32.2, 116.5], [32.2, 120.4], [32.2, 124], [32.2, 127.8], [32.2, 131.8], [32.2, 135.7], [32.2, 139.2], [32, 143.1], [32, 147], [30.8, 150.9], [28.2, 154.4], [26.7, 158.3], [25.9, 162.2], [25.7, 166.1], [24.6, 169.7], [0, 170]], "axisU": 0.4973, "tex": "graza/drizzle-refill-can.webp", "title": '"Drizzle" Refill Can', "price": 21 }, "sizzle-refill-can": { "kind": "lathe", "heightMM": 200, "widthMM": 101.5, "profile": [[0, 0], [30.2, 2.6], [37.3, 7.1], [42.6, 11.5], [47.7, 15.9], [49, 20.3], [49.5, 24.7], [49.9, 29.6], [49.9, 34], [49.9, 38.4], [49.9, 42.8], [50.1, 47.2], [50.1, 51.7], [49.9, 56.1], [49.9, 60.9], [49.9, 65.3], [49.9, 69.8], [49.9, 74.2], [49.9, 78.6], [49.9, 83], [49.9, 87.9], [49.9, 92.3], [49.9, 96.7], [49.9, 101.1], [49.9, 105.5], [49.7, 109.9], [49.7, 114.8], [49.7, 119.2], [49.7, 123.6], [49.7, 128], [49.7, 132.4], [49.7, 136.9], [49.7, 141.3], [49.9, 146.1], [49.9, 150.6], [49.7, 155], [49.7, 159.4], [49.7, 163.8], [49, 168.2], [46.8, 173.1], [46.1, 177.5], [44.1, 181.9], [43, 186.3], [43, 190.7], [42.8, 195.1], [41.9, 199.6], [0, 200]], "axisU": 0.5011, "tex": "graza/sizzle-refill-can.webp", "title": '"Sizzle" Refill Can', "price": 16 }, "sizzle-spray": { "kind": "lathe", "heightMM": 195, "widthMM": 49.8, "profile": [[0, 0], [21.1, 2.3], [23.6, 6.8], [23.8, 10.9], [23.8, 15.5], [23.8, 20], [23.9, 24.1], [23.9, 28.7], [23.9, 32.8], [23.9, 37.3], [23.9, 41.9], [24.1, 46], [24.1, 50.5], [24.1, 54.7], [24.1, 59.2], [24.1, 63.7], [24.1, 67.9], [24.1, 72.4], [24.3, 76.6], [24.3, 81.1], [24.1, 85.6], [24.1, 89.8], [24.3, 94.3], [24.3, 98.4], [24.3, 103], [24.3, 107.5], [24.3, 111.6], [24.3, 116.2], [24.3, 120.3], [24.3, 124.8], [24.3, 129.4], [24.3, 133.5], [24.3, 138.1], [23.9, 142.2], [23.2, 146.7], [21.3, 151.2], [19.1, 155.4], [15.7, 159.9], [15.3, 164.1], [15.1, 168.6], [14.1, 173.1], [13.4, 177.3], [13, 181.8], [12.8, 185.9], [11.9, 190.5], [11.5, 194.6], [0, 195]], "axisU": 0.4924, "tex": "graza/sizzle-spray.webp", "title": '"Sizzle" Spray', "price": 7.99 }, "frizzle-spray": { "kind": "lathe", "heightMM": 195, "widthMM": 48.6, "profile": [[0, 0], [22.2, 2.3], [23.8, 6.6], [23.8, 11.2], [23.8, 15.4], [23.8, 19.7], [24, 24.3], [24, 28.6], [24, 32.8], [24, 37.4], [24, 41.7], [24, 46], [24, 50.6], [24, 54.8], [24, 59.1], [24, 63.7], [24, 68], [23.8, 72.2], [23.8, 76.8], [23.8, 81.1], [23.8, 85.3], [23.8, 90], [23.8, 94.2], [23.8, 98.5], [23.6, 103.1], [23.6, 107.3], [23.6, 111.6], [23.6, 116.2], [23.8, 120.5], [23.8, 124.8], [23.8, 129.3], [23.8, 133.6], [23.8, 137.9], [23.5, 142.5], [22.5, 146.7], [20.5, 151], [17.4, 155.6], [15.1, 159.9], [14.9, 164.1], [14.9, 168.7], [14.8, 173], [14.6, 177.3], [14.6, 181.9], [14.3, 186.1], [13.9, 190.4], [3.1, 194.7], [0, 195]], "axisU": 0.4966, "tex": "graza/frizzle-spray.webp", "title": '"Frizzle" Spray', "price": 7 }, "frizzle-jug": { "kind": "lathe", "heightMM": 300, "widthMM": 120.3, "profile": [[0, 0], [44.3, 3.5], [52.3, 10.5], [56, 17], [57.8, 24], [59.1, 30.5], [59.3, 37.1], [59.3, 44], [58.9, 50.6], [58.9, 57.6], [58.9, 64.1], [58.6, 71.1], [58.6, 77.6], [58.6, 84.2], [58.6, 91.1], [58.6, 97.7], [58.6, 104.7], [58.6, 111.2], [58.6, 118.2], [58.6, 124.7], [58.6, 131.7], [58.6, 138.2], [58.6, 144.8], [59.1, 151.7], [59.1, 158.3], [59.1, 165.3], [57.6, 171.8], [57.6, 178.8], [57.8, 185.3], [57.3, 191.9], [56.2, 198.8], [55.2, 205.4], [53.4, 212.3], [51.7, 218.9], [49.3, 225.9], [46.7, 232.4], [43, 239.4], [39.5, 245.9], [38.4, 252.5], [34.5, 259.4], [19, 266], [18.8, 273], [18.5, 279.5], [18.1, 286.5], [17.9, 293], [17.4, 299.6], [0, 300]], "axisU": 0.4946, "tex": "graza/frizzle-jug.webp", "title": '"Frizzle" Jug', "price": 33 }, "sizzle-1l": { "kind": "lathe", "heightMM": 290, "widthMM": 77.2, "profile": [[0, 0], [32.2, 3.6], [36.8, 10.1], [37.4, 16.5], [37.6, 22.9], [37.8, 29.4], [37.8, 35.8], [37.6, 42.6], [37.6, 49.1], [37.8, 55.5], [37.8, 61.9], [37.8, 68.4], [37.8, 75.2], [37.8, 81.7], [37.6, 88.1], [37.6, 94.5], [37.6, 101], [37.8, 107.4], [37.8, 114.2], [37.8, 120.7], [37.8, 127.1], [37.8, 133.5], [38, 140], [38, 146.8], [38, 153.2], [38, 159.7], [38, 166.1], [38, 172.6], [38, 179], [38, 185.8], [38, 192.3], [38, 198.7], [38, 205.1], [37.4, 211.6], [35.4, 218.4], [32, 224.8], [26.6, 231.3], [17.7, 237.7], [16.1, 244.2], [16.1, 250.6], [15.9, 257.4], [7.6, 263.9], [6, 270.3], [5.6, 276.7], [3.8, 283.2], [3.2, 289.6], [0, 290]], "axisU": 0.4922, "tex": "graza/sizzle-1l.webp", "title": "Sizzle 1L", "price": 10 }, "original-mayo": { "kind": "lathe", "heightMM": 185, "widthMM": 75.7, "profile": [[0, 0], [19.9, 2.2], [23, 6.4], [23.4, 10.5], [23.7, 14.7], [23.7, 18.9], [23.7, 23], [23.6, 27.2], [23.6, 31.3], [23.6, 35.5], [23.7, 39.7], [24.1, 43.8], [25, 48], [26.1, 52.1], [27.5, 56.3], [29, 60.5], [30.2, 64.3], [31.5, 68.5], [32.5, 72.7], [33.3, 76.8], [34.1, 81], [34.7, 85.2], [35.4, 89.3], [35.9, 93.5], [36.3, 97.6], [36.8, 101.8], [37, 106], [37.3, 110.1], [37.6, 114.3], [37.6, 118.4], [37.6, 122.6], [37.6, 126.8], [37.7, 130.9], [37.7, 135.1], [37.7, 139.2], [37.7, 143.4], [37.6, 147.6], [37.6, 151.7], [37.3, 155.9], [36.9, 160], [36.6, 164.2], [36.2, 168.4], [35.8, 172.5], [35.2, 176.7], [34.4, 180.8], [33.1, 184.7], [0, 185]], "axisU": 0.4963, "tex": "graza/original-mayo.webp", "title": '"Original" Mayo', "price": 8.95 }, "fancy-mayo": { "kind": "lathe", "heightMM": 185, "widthMM": 84.1, "profile": [[0, 0], [22.8, 2.2], [27.5, 6.5], [28.1, 10.5], [28.3, 14.5], [28.6, 18.9], [28.6, 22.9], [28.6, 27.2], [28.6, 31.2], [28.6, 35.6], [28.3, 39.6], [28.3, 43.6], [28.3, 48], [28.3, 52], [28.9, 56.3], [30.3, 60.3], [31.9, 64.3], [33.4, 68.7], [34.8, 72.7], [36, 77], [37.1, 81], [37.9, 85.4], [38.8, 89.4], [39.4, 93.4], [40.1, 97.8], [40.7, 101.8], [41, 106.1], [41.5, 110.1], [41.6, 114.2], [41.6, 118.5], [41.9, 122.5], [41.9, 126.8], [41.9, 130.9], [41.9, 135.2], [41.9, 139.2], [41.9, 143.2], [41.8, 147.6], [41.8, 151.6], [41.5, 155.9], [41.1, 159.9], [40.5, 164], [40.2, 168.3], [39.6, 172.3], [38.8, 176.7], [37.7, 180.7], [35.3, 184.7], [0, 185]], "axisU": 0.4982, "tex": "graza/fancy-mayo.webp", "title": '"Fancy" Mayo', "price": 10.99 }, "garlic-aioli": { "kind": "lathe", "heightMM": 185, "widthMM": 84.3, "profile": [[0, 0], [23.4, 2.2], [27.6, 6.3], [28.2, 10.4], [28.4, 14.6], [28.5, 18.7], [28.5, 23.1], [28.5, 27.2], [28.5, 31.4], [28.5, 35.5], [28.4, 39.6], [28.4, 43.7], [28.2, 47.8], [28.4, 52], [28.8, 56.1], [29.9, 60.2], [31.8, 64.6], [33.3, 68.7], [34.7, 72.9], [36, 77], [36.9, 81.1], [37.7, 85.2], [38.5, 89.3], [39.3, 93.5], [39.9, 97.6], [40.4, 101.7], [40.9, 106.1], [41.2, 110.2], [41.3, 114.4], [41.5, 118.5], [41.7, 122.6], [41.7, 126.7], [41.8, 130.8], [41.8, 134.9], [42, 139.1], [42, 143.2], [41.8, 147.6], [41.7, 151.7], [41.5, 155.9], [41, 160], [40.7, 164.1], [40.1, 168.2], [39.6, 172.3], [38.8, 176.4], [37.5, 180.6], [35.2, 184.7], [0, 185]], "axisU": 0.4925, "tex": "graza/garlic-aioli.webp", "title": '"Garlic" Aioli', "price": 9.99 }, "potato-chips": { "kind": "flat", "heightMM": 230, "widthMM": 174.7, "tex": "graza/potato-chips.webp", "title": "Classic Sea Salt Olive Oil Potato Chips", "price": 5.99 }, "hot-n-sweet-olive-oil-potato-chips": { "kind": "flat", "heightMM": 230, "widthMM": 182, "tex": "graza/hot-n-sweet-olive-oil-potato-chips.webp", "title": "Hot 'n Sweet Olive Oil Potato Chips", "price": 5.99 }, "zesty-caesar-olive-oil-potato-chips": { "kind": "flat", "heightMM": 230, "widthMM": 179.1, "tex": "graza/zesty-caesar-olive-oil-potato-chips.webp", "title": "Zesty Caesar Olive Oil Potato Chips", "price": 5.99 }, "sea-salt-vinegar-olive-oil-potato-chips": { "kind": "flat", "heightMM": 230, "widthMM": 172.1, "tex": "graza/sea-salt-vinegar-olive-oil-potato-chips.webp", "title": "Sea Salt & Vinegar Olive Oil Potato Chips", "price": 5.99 }, "the-graza-tote": { "kind": "flat", "heightMM": 380, "widthMM": 237.5, "tex": "graza/the-graza-tote.webp", "title": "Graza Tote Bag", "price": 25 }, "graza-gift-card": { "kind": "flat", "heightMM": 60, "widthMM": 84, "tex": "graza/graza-gift-card.webp", "title": "Digital Gift Card", "price": 25 }, "sizzle-bag-in-box": { "kind": "box", "heightMM": 260, "widthMM": 182.2, "tex": "graza/sizzle-bag-in-box.webp", "title": "Sizzle Bag in Box", "price": 32.99 } };

  // shared/model-catalog.js
  var MODEL_CATALOG = [
    { id: "sola-fal-hunyuan", name: "Sola \xB7 fal reconstruction", source: "fal", file: "../generated/sola-hunyuan.glb", dimensions: { width: 0.064, height: 0.118, depth: 0.038 } },
    { id: "perfume-parts", name: "Crystal perfume", file: "perfume-parts.glb", dimensions: { width: 0.075, height: 0.13, depth: 0.055 } },
    { id: "bottle-parts", name: "Bamboo & steel bottle", file: "bottle-parts.glb", dimensions: { width: 0.085, height: 0.25, depth: 0.085 } },
    { id: "candle-parts", name: "Marble candle", file: "candle-parts.glb", dimensions: { width: 0.1, height: 0.13, depth: 0.1 } },
    { id: "lipstick-parts", name: "Crystal lipstick", file: "lipstick-parts.glb", dimensions: { width: 0.025, height: 0.085, depth: 0.025 } },
    { id: "perfume-deco", name: "Art deco perfume", file: "perfume-deco.glb", dimensions: { width: 0.08, height: 0.12, depth: 0.045 } },
    { id: "sage-bottle", name: "Sage bottle", file: "sage-bottle.glb", dimensions: { width: 0.072, height: 0.238, depth: 0.072 } },
    ...Object.entries(GRAZA_MODELS).map(([key, base]) => ({ id: "graza-" + key, name: "Graza \xB7 " + base.title, source: "graza-photo", base, file: base.tex, dimensions: { width: base.widthMM / 1e3, height: base.heightMM / 1e3, depth: base.widthMM / 1e3 * (base.kind === "lathe" ? 1 : base.kind === "box" ? 0.75 : 0.18) } }))
  ];
  var modelById = (id) => typeof id === "string" && /^asset:[a-f0-9-]{36}$/.test(id) ? { id, assetId: id.slice(6), name: "Generated model", source: "fal" } : MODEL_CATALOG.find((m) => m.id === id);

  // shared/product.js
  var MATERIALS = ["glass", "satin", "metal", "ceramic", "fabric"];
  var clone = (value) => JSON.parse(JSON.stringify(value));
  var finite = (v, min, max, name) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      throw Error(`${name} must be between ${min} and ${max}.`);
    return v;
  };
  var short = (v, max = 100) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function validateProduct(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const p = clone(input);
    if (!["bottle", "sofa", "freeform", "assembly"].includes(p.kind))
      throw Error("Unsupported design type.");
    if (p.units !== "m" || p.upAxis !== "Y" || p.frontAxis !== "+Z")
      throw Error("Products must use meters, Y up and +Z front.");
    for (const key of ["width", "height", "depth"])
      finite((_a = p.dimensions) == null ? void 0 : _a[key], 5e-3, 10, key);
    if (!MATERIALS.includes((_b = p.material) == null ? void 0 : _b.type) || !/^#[0-9a-f]{6}$/i.test((_c = p.material) == null ? void 0 : _c.color))
      throw Error("Choose a supported material and color.");
    finite(p.material.roughness, 0, 1, "Roughness");
    finite(p.material.metalness, 0, 1, "Metalness");
    if (((_d = p.shape) == null ? void 0 : _d.modelId) && (p.kind !== "assembly" || !modelById(p.shape.modelId))) throw Error("Unknown library model.");
    if (p.kind === "bottle") {
      if (!["circle", "faceted", "rectangle", "triangular"].includes(p.shape.crossSection))
        throw Error("Unsupported cross-section.");
      finite(p.shape.facets, 4, 32, "Facets");
      if (!Number.isInteger(p.shape.facets))
        throw Error("Facets must be a whole number.");
      finite(p.shape.bevel, 0, 0.45, "Bevel");
      finite(p.shape.neckRatio, 0.1, 0.6, "Neck");
      finite(p.shape.capRatio, 0.05, 0.3, "Cap");
      const pts = p.shape.profile;
      if (!Array.isArray(pts) || pts.length < 2 || pts.length > 24)
        throw Error("Use 2\u201324 profile points.");
      let last = -1;
      for (const point of pts) {
        if (!Array.isArray(point) || point.length !== 2)
          throw Error("Invalid profile point.");
        finite(point[0], 0, 1, "Profile height");
        finite(point[1], 0.05, 1, "Profile width");
        if (point[0] <= last)
          throw Error(
            "The profile must progress from bottom to top without crossing itself."
          );
        last = point[0];
      }
      if (pts[0][0] !== 0 || pts.at(-1)[0] !== 1 || !pts.some((x) => x[1] === 1))
        throw Error("Profile must span height 0\u20131 and reach full width 1.");
    } else if (p.kind === "assembly") {
      if (!Array.isArray((_e = p.shape) == null ? void 0 : _e.components) || p.shape.components.length < 1 || p.shape.components.length > 40) throw Error("Use 1\u201340 product parts.");
      for (const part of p.shape.components) {
        if (!["box", "roundedBox", "ellipsoid", "cylinder", "cone", "torus", "cup", "loft", "rim"].includes(part.type)) throw Error("Unsupported part geometry.");
        if (part.type === "loft") {
          if (!Array.isArray(part.sections) || part.sections.length < 2 || part.sections.length > 24) throw Error("Use 2\u201324 loft sections.");
          let lastZ = -1;
          for (const section of part.sections) {
            if (!Array.isArray(section) || section.length !== 6) throw Error("Invalid loft section.");
            section.forEach((n) => finite(n, 0, 1, "Loft section"));
            const [z, b, s, t, w, r] = section;
            if (z <= lastZ || b >= t || s < b || s > t || w <= 0 || w > 0.5 || r <= 0 || r > w) throw Error("Invalid loft silhouette.");
            lastZ = z;
          }
          if (part.sections[0][0] !== 0 || lastZ !== 1) throw Error("Loft sections must span 0\u20131.");
        }
        if (part.finish && !["lacquer", "polishedMetal", "powderCoat", "ceramic"].includes(part.finish)) throw Error("Unsupported finish.");
        part.name = short(part.name, 60) || "Part";
        if (!MATERIALS.includes(part.material) || !/^#[0-9a-f]{6}$/i.test(part.color)) throw Error("Invalid part material.");
        for (const [key, min, max] of [["position", -2, 2], ["size", 2e-3, 2], ["rotation", -Math.PI * 2, Math.PI * 2]]) {
          if (!Array.isArray(part[key]) || part[key].length !== 3) throw Error("Use three part coordinates.");
          for (const n of part[key]) finite(n, min, max, "Part " + key);
        }
      }
    } else if (p.kind === "freeform") {
      const outlines = (_f = p.shape) == null ? void 0 : _f.outlines;
      if (!Array.isArray(outlines) || !outlines.length || outlines.length > 256) throw Error("Use 1\u2013256 filled outlines. Select a simpler product layer.");
      let total = 0;
      for (const outline of outlines) {
        if (!/^#[0-9a-f]{6}$/i.test(outline.color)) throw Error("Invalid outline color.");
        if (!Array.isArray(outline.holes) || outline.holes.length > 64) throw Error("Too many outline holes.");
        for (const ring of [outline.points, ...outline.holes]) {
          if (!Array.isArray(ring) || ring.length < 3 || ring.length > 1024) throw Error("Invalid outline.");
          total += ring.length;
          for (const point of ring) {
            if (!Array.isArray(point) || point.length !== 2) throw Error("Invalid outline point.");
            finite(point[0], 0, 1, "Outline x");
            finite(point[1], 0, 1, "Outline y");
          }
        }
      }
      if (total > 12e3) throw Error("Design is too complex. Select a simpler product layer.");
    } else {
      for (const [k, min, max] of [
        ["seatHeight", 0.2, 1],
        ["armWidth", 0.02, 0.4],
        ["backHeight", 0.1, 1],
        ["legHeight", 0.02, 0.3]
      ])
        finite(p.shape[k], min, max, k);
      finite(p.shape.seats, 1, 5, "Seats");
      if (!Number.isInteger(p.shape.seats))
        throw Error("Seats must be a whole number.");
      if (p.shape.armWidth * 2 >= p.dimensions.width || p.shape.seatHeight >= p.dimensions.height || p.shape.legHeight + 0.12 >= p.shape.seatHeight || p.dimensions.depth < 0.4 || p.dimensions.width < 0.6)
        throw Error("Sofa parts must fit within its dimensions.");
      if (Math.abs(p.shape.seatHeight + p.shape.backHeight - p.dimensions.height) > 1e-3)
        throw Error("Seat height plus back height must equal total height.");
    }
    p.parts = p.parts || {};
    for (const [part, m] of Object.entries(p.parts)) {
      if (![
        "Body",
        "Cap",
        "Label",
        "Base",
        "Seats",
        "Back",
        "Arms",
        "Legs"
      ].includes(part) || !MATERIALS.includes(m == null ? void 0 : m.type) || !/^#[0-9a-f]{6}$/i.test(m == null ? void 0 : m.color))
        throw Error(`Unsupported ${part} finish. Use type ${MATERIALS.join("/")} and a six-digit hex color such as #000000; received type ${String(m == null ? void 0 : m.type)} and color ${String(m == null ? void 0 : m.color)}.`);
      finite(m.roughness, 0, 1, "Part roughness");
      finite(m.metalness, 0, 1, "Part metalness");
    }
    p.label.text = short(p.label.text, 60);
    if (p.label.artwork !== void 0) p.label.artwork = validateLabelArt(p.label.artwork);
    for (const k of ["width", "height"])
      finite(p.label[k], 0.1, 0.9, `Label ${k}`);
    finite(p.label.y, 0.1, 0.8, "Label position");
    p.label.assetId = typeof p.label.assetId === "string" ? p.label.assetId : null;
    p.facts.name = short(p.facts.name);
    p.facts.brand = short(p.facts.brand);
    p.facts.sizeLabel = short(p.facts.sizeLabel);
    if (p.facts.price !== null) finite(p.facts.price, 0, 1e6, "Price");
    if (!/^[A-Z]{3}$/.test(p.facts.currency))
      throw Error("Use a three-letter currency code.");
    if (p.facts.capacityMl !== null)
      finite(p.facts.capacityMl, 1, 1e5, "Capacity");
    if (p.facts.seating !== null)
      finite(p.facts.seating, 1, 20, "Seating capacity");
    p.scale = {
      confirmed: ((_g = p.scale) == null ? void 0 : _g.confirmed) === true,
      source: short(((_h = p.scale) == null ? void 0 : _h.source) || "design", 300)
    };
    p.figma = {
      fileUrl: short((_i = p.figma) == null ? void 0 : _i.fileUrl, 500),
      nodeId: short((_j = p.figma) == null ? void 0 : _j.nodeId, 80) || null
    };
    if (p.figma.fileUrl && !/^https:\/\/(www\.)?figma\.com\/(design|file)\/[A-Za-z0-9]+/.test(
      p.figma.fileUrl
    ))
      throw Error("Use a Figma Design file link.");
    if (p.reconstruction) {
      p.reconstruction = { method: short(p.reconstruction.method, 40), summary: short(p.reconstruction.summary, 1500), confidence: finite(p.reconstruction.confidence, 0, 1, "Recognition confidence") };
    }
    p.schemaVersion = 1;
    return p;
  }
  var EDIT_FIELDS = [
    "dimensions.width",
    "dimensions.height",
    "dimensions.depth",
    "shape.crossSection",
    "shape.facets",
    "shape.bevel",
    "shape.neckRatio",
    "shape.capRatio",
    "shape.profile",
    "shape.outlines",
    "shape.components",
    "shape.seatHeight",
    "shape.armWidth",
    "shape.backHeight",
    "shape.legHeight",
    "shape.seats",
    "material.type",
    "material.color",
    "material.roughness",
    "material.metalness",
    "label.text",
    "label.artwork",
    "label.assetId",
    "label.width",
    "label.height",
    "label.y",
    "facts.name",
    "facts.brand",
    "facts.sizeLabel",
    "facts.capacityMl",
    "facts.seating",
    "facts.price",
    "facts.currency",
    "scale.confirmed",
    "scale.source",
    "figma.fileUrl",
    "figma.nodeId",
    "parts.Body",
    "parts.Cap",
    "parts.Label",
    "parts.Base",
    "parts.Seats",
    "parts.Back",
    "parts.Arms",
    "parts.Legs"
  ];

  // figma-plugin/source.js
  var nativeLaunchURL = null;
  var bridgeId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  function showPanel() {
    const html = __html__.split("__KALPI_LAUNCH_NONCE__").join(bridgeId).split("__KALPI_PLUGIN_ID__").join(figma.pluginId || "kalpi-local-development");
    figma.showUI(html, { width: 900, height: 820, themeColors: true });
    restorePanel();
  }
  async function restorePanel() {
    send({ type: "runtime-ready" });
    try {
      const url = nativeLaunchURL || await figma.clientStorage.getAsync("kalpiPanel");
      send({ type: "saved-panel", url: url || "https://kalpi-roan.vercel.app/plugin.html" });
    } catch (_) {
      send({ type: "sync-error", message: "Figma could not read your saved workspace. Retry without creating a new pairing link." });
    }
  }
  var active = null;
  var suppressed = 0;
  var timer = null;
  var page = null;
  var lastApplied = "";
  var pending = false;
  var send = (m) => figma.ui.postMessage({ ...m, bridgeId });
  var tag = (node, part) => node.setPluginData("kalpiPart", part);
  function selectedRoot() {
    var _a;
    let n = figma.currentPage.selection[0];
    while (n && n.type !== "PAGE") {
      if ((_a = n.getPluginData) == null ? void 0 : _a.call(n, "kalpiDesignId")) return n;
      n = n.parent;
    }
    return null;
  }
  function sourceNode() {
    if (figma.currentPage.selection.length > 1) return null;
    if (figma.currentPage.selection.length === 1) return selectedRoot() || figma.currentPage.selection[0];
    const visible = figma.currentPage.children.filter((n) => n.visible !== false);
    return visible.length === 1 ? visible[0] : null;
  }
  function describeSelection() {
    const node = sourceNode();
    if (!node) {
      send({ type: "selection-preview", selection: null });
      return;
    }
    const texts = [];
    let count = 0;
    const visit = (n) => {
      if (++count > 300) return;
      if (n.type === "TEXT") texts.push(n.characters);
      for (const c of n.children || []) visit(c);
    };
    visit(node);
    const saved = node.getPluginData("kalpiDocument");
    const inferred = saved ? { dimensions: JSON.parse(saved).dimensions, source: JSON.parse(saved).scale.source } : selectionDimensions(node.width, node.height, node.name + " " + texts.join(" "));
    send({ type: "selection-preview", selection: { nodeId: node.id, name: node.name, designId: node.getPluginData("kalpiDesignId") || node.getPluginData("kalpiSourceDesignId") || null, ...inferred, linked: !!saved } });
  }
  async function exportSelection(m) {
    var _a;
    const node = sourceNode();
    if (!node || node.id !== m.nodeId) throw Error("Your selection changed. Review the selected design and convert again.");
    const svg = await node.exportAsync({ format: "SVG_STRING", svgOutlineText: true });
    if (((_a = sourceNode()) == null ? void 0 : _a.id) !== node.id) throw Error("Your selection changed during export. Try again.");
    send({ type: "selection-export", snapshot: { nodeId: node.id, name: node.name, svg, dimensions: m.dimensions, source: m.source }, designId: node.getPluginData("kalpiDesignId") || node.getPluginData("kalpiSourceDesignId") || null, baseRevision: Number(node.getPluginData("kalpiRevision") || 0), fingerprint: fingerprint(node) });
  }
  async function updateImported(row, node) {
    const p = validateProduct(JSON.parse(row.document));
    suppressed++;
    try {
      const previous = JSON.parse(node.getPluginData("kalpiDocument"));
      if (typeof node.rescale === "function" && Math.abs(p.dimensions.width / previous.dimensions.width - p.dimensions.height / previous.dimensions.height) < 1e-4) node.rescale(p.dimensions.width / previous.dimensions.width);
      else if (typeof node.resize === "function") node.resize(node.width * p.dimensions.width / previous.dimensions.width, node.height * p.dimensions.height / previous.dimensions.height);
      node.setPluginData("kalpiDocument", row.document);
      node.setPluginData("kalpiRevision", String(row.revision));
      node.setPluginData("kalpiFingerprint", fingerprint(node));
      node.setPluginData("kalpiPending", "");
      pending = false;
      lastApplied = row.id + ":" + row.revision;
      send({ type: "template-applied", designId: row.id, revision: row.revision });
      describeSelection();
    } finally {
      suppressed--;
    }
  }
  function currentBoard() {
    const top = (node) => {
      while ((node == null ? void 0 : node.parent) && node.parent.type !== "PAGE") node = node.parent;
      return node;
    };
    const selected = [...new Set(figma.currentPage.selection.map(top))];
    if (selected.length === 1) return selected[0];
    const roots = figma.currentPage.children.filter((n) => n.visible !== false && !n.getPluginData("kalpiDesignId"));
    if (roots.length === 1) return roots[0];
    const b = figma.viewport.bounds;
    if (!b) throw Error("Open the product presentation board, then try again.");
    const overlap = (n) => {
      const r = n.absoluteBoundingBox || n;
      return Math.max(0, Math.min(r.x + r.width, b.x + b.width) - Math.max(r.x, b.x)) * Math.max(0, Math.min(r.y + r.height, b.y + b.height) - Math.max(r.y, b.y));
    };
    const visible = roots.filter((n) => overlap(n) > 0).sort((a, b2) => overlap(b2) - overlap(a));
    if (!visible.length) throw Error("Bring your design board into view, then try again.");
    return visible[0];
  }
  async function readProductBoard(forceImage = false) {
    const linked = selectedRoot();
    if (!forceImage && linked && linked.getPluginData("kalpiDocument") && linked.getPluginData("kalpiImport") !== "true") {
      active = linked;
      await readChanges(true);
      return;
    }
    const board = currentBoard(), layers = [], texts = [];
    let count = 0;
    const visit = (n) => {
      if (++count > 2e3 || n.visible === false) return;
      if (layers.length < 300) {
        const b = n.absoluteBoundingBox, base = board.absoluteBoundingBox;
        const bounds = b && base ? [(b.x - base.x) / board.width, (b.y - base.y) / board.height, b.width / board.width, b.height / board.height].map((v) => Math.round(v * 1e4) / 1e4) : null;
        layers.push({ id: n.id, name: n.name, type: n.type, bounds });
      }
      if (n.type === "TEXT") texts.push(n.characters);
      for (const child of n.children || []) visit(child);
    };
    visit(board);
    const signature = fingerprint(board);
    const bytes = await board.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: Math.min(1, 1600 / Math.max(board.width, board.height)) } });
    if (board.removed || signature !== fingerprint(board)) throw Error("The board changed while it was being read. Try again.");
    send({ type: "bottle-board", boardId: board.id, name: board.name, layers, texts: texts.join("\n").slice(0, 2e4), bytes: Array.from(bytes), fingerprint: signature });
  }
  function textNode(parent, name, value, x, y, size = 16) {
    const n = figma.createText();
    n.name = name;
    tag(n, "annotation");
    n.fontName = { family: "Inter", style: "Regular" };
    n.characters = value;
    n.fontSize = size;
    n.x = x;
    n.y = y;
    parent.appendChild(n);
    return n;
  }
  var rgb = (hex2) => ({
    r: parseInt(hex2.slice(1, 3), 16) / 255,
    g: parseInt(hex2.slice(3, 5), 16) / 255,
    b: parseInt(hex2.slice(5, 7), 16) / 255
  });
  async function writeTemplate(row, existing = null) {
    var _a, _b, _c, _d;
    const p = validateProduct(JSON.parse(row.document));
    let fontTimer;
    try {
      await Promise.race([figma.loadFontAsync({ family: "Inter", style: "Regular" }), new Promise((_, reject) => {
        fontTimer = setTimeout(() => reject(Error("Figma is taking too long to load the font. Your 3D model is saved.")), 1e4);
      })]);
    } finally {
      clearTimeout(fontTimer);
    }
    suppressed++;
    try {
      const frame = existing || figma.createFrame();
      if (!existing) {
        frame.resize(800, 760);
        frame.x = figma.viewport.center.x - 400;
        frame.y = figma.viewport.center.y - 380;
        frame.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.95, b: 0.97 } }];
        figma.currentPage.appendChild(frame);
      }
      frame.name = `Kalpi / ${p.facts.name}`;
      const artwork = frame.children.find(
        (n) => n.getPluginData("kalpiPart") === "artwork"
      );
      for (const child of [...frame.children])
        if (child !== artwork && child.getPluginData("kalpiPart")) child.remove();
      const ppm = p.kind === "assembly" ? 420 / Math.max(p.dimensions.width, p.dimensions.height) : p.kind === "bottle" ? 3e3 : 220, front = figma.createFrame();
      front.name = "Editable front view";
      front.fills = [];
      front.clipsContent = false;
      front.x = 65;
      front.y = 125;
      front.resize(p.dimensions.width * ppm, p.dimensions.height * ppm);
      tag(front, "front");
      frame.appendChild(front);
      if (p.kind === "bottle") {
        const w = p.dimensions.width * ppm, h = p.dimensions.height * (1 - p.shape.capRatio) * ppm, pts = p.shape.profile;
        const left = pts.map(([y, r]) => [(1 - r) * w / 2, h * (1 - y)]), right = [...pts].reverse().map(([y, r]) => [(1 + r) * w / 2, h * (1 - y)]);
        const points = [...left, ...right];
        const n = figma.createVector();
        n.name = "Body outline \xB7 edit nodes symmetrically";
        n.vectorPaths = [
          {
            windingRule: "NONZERO",
            data: "M " + points.map((p2) => p2.join(" ")).join(" L ") + " Z"
          }
        ];
        n.fills = [
          { type: "SOLID", color: rgb((((_a = p.parts) == null ? void 0 : _a.Body) || p.material).color) }
        ];
        n.y = p.dimensions.height * p.shape.capRatio * ppm;
        tag(n, "profile");
        front.appendChild(n);
        const cap = figma.createRectangle();
        cap.name = "Cap";
        cap.resize(
          p.dimensions.width * p.shape.neckRatio * ppm,
          p.dimensions.height * p.shape.capRatio * ppm
        );
        cap.x = (w - cap.width) / 2;
        cap.fills = [
          {
            type: "SOLID",
            color: ((_b = p.parts) == null ? void 0 : _b.Cap) ? rgb(p.parts.Cap.color) : rgb("#29262c")
          }
        ];
        tag(cap, "cap");
        front.appendChild(cap);
        textNode(
          frame,
          "Dimensions",
          `${(p.dimensions.width * 100).toFixed(1)} \xD7 ${(p.dimensions.depth * 100).toFixed(1)} \xD7 ${(p.dimensions.height * 100).toFixed(1)} cm`,
          65,
          front.y + p.dimensions.height * ppm + 25,
          14
        );
        const top = figma.createVector();
        top.name = "Top view \xB7 generated from cross-section";
        const points2 = [];
        const count = p.shape.crossSection === "circle" ? 32 : p.shape.facets;
        if (p.shape.crossSection === "rectangle") {
          const b = p.shape.bevel;
          for (const [x, z] of [
            [-1 + b, -1],
            [1 - b, -1],
            [1, -1 + b],
            [1, 1 - b],
            [1 - b, 1],
            [-1 + b, 1],
            [-1, 1 - b],
            [-1, -1 + b]
          ])
            points2.push([
              x * p.dimensions.width * ppm / 2,
              z * p.dimensions.depth * ppm / 2
            ]);
        } else
          for (let i = 0; i < count; i++) {
            const a = i * Math.PI * 2 / count;
            points2.push([
              Math.cos(a) * p.dimensions.width * ppm / 2,
              Math.sin(a) * p.dimensions.depth * ppm / 2
            ]);
          }
        top.vectorPaths = [
          {
            windingRule: "NONZERO",
            data: "M " + points2.map((p2) => p2.join(" ")).join(" L ") + " Z"
          }
        ];
        top.fills = [
          { type: "SOLID", color: rgb((((_c = p.parts) == null ? void 0 : _c.Body) || p.material).color) }
        ];
        top.x = 410;
        top.y = 135;
        tag(top, "projection");
        top.locked = true;
        frame.appendChild(top);
      } else if (p.kind === "assembly") {
        front.name = "Editable front schematic \xB7 part envelopes";
        const projections = assemblyProjection(p.shape.components);
        p.shape.components.forEach((part, i) => {
          const rect = projections[i], n = part.type === "ellipsoid" ? figma.createEllipse() : figma.createRectangle();
          n.name = part.name;
          n.resize(rect.width * front.width, rect.height * front.height);
          n.x = rect.x * front.width;
          n.y = rect.y * front.height;
          n.fills = [{ type: "SOLID", color: rgb(part.color) }];
          tag(n, "component-" + i);
          front.appendChild(n);
        });
        textNode(frame, "Dimensions", `${(p.dimensions.width * 100).toFixed(1)} \xD7 ${(p.dimensions.depth * 100).toFixed(1)} \xD7 ${(p.dimensions.height * 100).toFixed(1)} cm`, 65, front.y + front.height + 25, 14);
      } else {
        const dims = p.dimensions, s = p.shape, w = dims.width * ppm, h = dims.height * ppm;
        for (const [name, x, y, bw, bh] of [
          [
            "Back",
            s.armWidth * ppm,
            0,
            w - 2 * s.armWidth * ppm,
            s.backHeight * ppm
          ],
          [
            "Seat",
            s.armWidth * ppm,
            s.backHeight * ppm,
            w - 2 * s.armWidth * ppm,
            0.12 * ppm
          ],
          [
            "Left arm",
            0,
            (dims.height - s.seatHeight - 0.12) * ppm,
            s.armWidth * ppm,
            (s.seatHeight + 0.12 - s.legHeight) * ppm
          ],
          [
            "Right arm",
            (dims.width - s.armWidth) * ppm,
            (dims.height - s.seatHeight - 0.12) * ppm,
            s.armWidth * ppm,
            (s.seatHeight + 0.12 - s.legHeight) * ppm
          ]
        ]) {
          const n = figma.createRectangle();
          n.name = name;
          n.resize(bw, bh);
          n.x = x;
          n.y = y;
          n.fills = [
            {
              type: "SOLID",
              color: rgb(
                (((_d = p.parts) == null ? void 0 : _d[name.endsWith("arm") ? "Arms" : name === "Seat" ? "Seats" : "Back"]) || p.material).color
              )
            }
          ];
          tag(n, name.toLowerCase());
          front.appendChild(n);
        }
        textNode(
          frame,
          "Dimensions",
          `${(dims.width * 100).toFixed(0)} \xD7 ${(dims.depth * 100).toFixed(0)} \xD7 ${(dims.height * 100).toFixed(0)} cm`,
          65,
          front.y + h + 25,
          14
        );
      }
      textNode(frame, "Title", p.facts.name, 35, 25, 28);
      textNode(
        frame,
        "Instructions",
        p.kind === "bottle" ? "Edit the front outline and artwork. Set depth, facets, and dimensions in the plugin." : p.kind === "assembly" ? "Front schematic: edit overall size or part colors. Use the 3D studio for shape changes." : "Edit the front frame size and part colors. Set sofa parts and depth in the plugin.",
        35,
        75,
        12
      );
      let art = artwork;
      if (!art && (p.kind !== "assembly" || p.label.artwork)) {
        art = figma.createFrame();
        art.name = "Artwork \xB7 editable label";
        art.resize(240, 240);
        art.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.92, b: 0.84 } }];
        art.x = 480;
        art.y = 370;
        tag(art, "artwork");
        frame.appendChild(art);
        textNode(art, "Label text", p.label.text, 25, 90, 38);
      } else if (art) {
        const label = art.children.find((n) => n.name === "Label text");
        if ((label == null ? void 0 : label.type) === "TEXT") {
          for (const part of label.getStyledTextSegments(["fontName"]))
            await figma.loadFontAsync(part.fontName);
          label.characters = p.label.text;
        }
      }
      if (art && p.label.artwork) {
        const previous = art.children.find((n) => n.getPluginData("kalpiGeneratedArtwork") === "1");
        const illustration = figma.createNodeFromSvg(labelArtSvg(p.label.artwork));
        illustration.name = "AI artwork \xB7 editable vectors and text";
        illustration.setPluginData("kalpiGeneratedArtwork", "1");
        art.appendChild(illustration);
        illustration.x = 0;
        illustration.y = 0;
        for (const line of p.label.artwork.texts) {
          const node = figma.createText();
          const fontName = { family: line.font === "serif" ? "Georgia" : "Inter", style: line.weight === "bold" ? "Bold" : "Regular" };
          try {
            await figma.loadFontAsync(fontName);
            node.fontName = fontName;
          } catch (e) {
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            node.fontName = { family: "Inter", style: "Regular" };
          }
          node.fontSize = line.size;
          node.characters = line.text;
          node.name = "Artwork text \xB7 " + line.text;
          const hex2 = line.color.slice(1);
          node.fills = [{ type: "SOLID", color: { r: parseInt(hex2.slice(0, 2), 16) / 255, g: parseInt(hex2.slice(2, 4), 16) / 255, b: parseInt(hex2.slice(4, 6), 16) / 255 } }];
          illustration.appendChild(node);
          node.x = line.x - node.width / 2;
          node.y = line.y - line.size;
        }
        illustration.rescale(art.width / 1e3);
        if (previous) previous.remove();
      }
      frame.setPluginData("kalpiDesignId", row.id);
      frame.setPluginData("kalpiProjectId", row.projectId);
      frame.setPluginData("kalpiRevision", String(row.revision));
      frame.setPluginData("kalpiDocument", JSON.stringify(p));
      frame.setPluginData("kalpiPPM", String(ppm));
      frame.setRelaunchData({ edit: "Edit this product in Kalpi" });
      frame.setPluginData("kalpiFingerprint", fingerprint(frame));
      frame.setPluginData("kalpiPending", "");
      active = frame;
      lastApplied = row.id + ":" + row.revision;
      pending = false;
      send({
        type: "template-applied",
        designId: row.id,
        nodeId: frame.id,
        revision: row.revision
      });
      if (!existing) {
        figma.currentPage.selection = [frame];
        figma.viewport.scrollAndZoomIntoView([frame]);
      }
    } finally {
      suppressed--;
    }
  }
  function diff(a, b) {
    return EDIT_FIELDS.filter((f) => !f.startsWith("figma.")).flatMap((field) => {
      var _a, _b;
      const [s, k] = field.split(".");
      return JSON.stringify((_a = a[s]) == null ? void 0 : _a[k]) === JSON.stringify((_b = b[s]) == null ? void 0 : _b[k]) ? [] : [{ field, value: b[s][k] }];
    });
  }
  function fingerprint(frame) {
    const node = (n) => {
      var _a;
      return {
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        rotation: n.rotation,
        paths: n.type === "VECTOR" ? n.vectorPaths : void 0,
        fills: n.fills,
        text: n.type === "TEXT" ? n.characters : void 0,
        children: (_a = n.children) == null ? void 0 : _a.map(node)
      };
    };
    if (frame.getPluginData("kalpiImport") === "true" || !frame.getPluginData("kalpiDesignId")) return JSON.stringify(node(frame));
    return JSON.stringify(
      frame.children.filter(
        (n) => ["front", "artwork"].includes(n.getPluginData("kalpiPart"))
      ).map(node)
    );
  }
  async function readChanges(convert = false) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!active || active.removed || suppressed) return;
    try {
      if (active.getPluginData("kalpiImport") === "true") {
        if (convert) {
          const p2 = JSON.parse(active.getPluginData("kalpiDocument"));
          await exportSelection({ nodeId: active.id, dimensions: p2.dimensions, source: p2.scale.source });
        } else send({ type: "sync-error", message: "Your Figma artwork changed. Click Convert this design to 3D to update its outlines." });
        return;
      }
      const original = JSON.parse(active.getPluginData("kalpiDocument")), p = JSON.parse(JSON.stringify(original)), ppm = Number(active.getPluginData("kalpiPPM")), front = active.children.find(
        (n) => n.getPluginData("kalpiPart") === "front"
      );
      if (!front)
        throw Error("The editable front view was removed. Restore the template.");
      p.dimensions.width = +(front.width / ppm).toFixed(6);
      p.dimensions.height = +(front.height / ppm).toFixed(6);
      if (p.kind === "bottle") {
        const outline = front.children.find(
          (n) => n.getPluginData("kalpiPart") === "profile"
        );
        if (!outline || outline.type !== "VECTOR")
          throw Error("Keep the tagged body outline as a vector.");
        const path = outline.vectorPaths;
        if (path.length !== 1 || /[CQASTHV]/i.test(path[0].data))
          throw Error(
            "Use straight outline segments and move paired nodes symmetrically. Curves and compound paths are not supported."
          );
        const nums = ((_a = path[0].data.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)) == null ? void 0 : _a.map(Number)) || [];
        let points = [];
        for (let i = 0; i < nums.length; i += 2)
          points.push([nums[i], nums[i + 1]]);
        if (points.length > 2 && Math.hypot(
          points[0][0] - points[points.length - 1][0],
          points[0][1] - points[points.length - 1][1]
        ) < 1e-3)
          points.pop();
        if (points.length < 4 || points.length % 2)
          throw Error("Use matching left and right outline points.");
        const minX = Math.min(...points.map((p2) => p2[0])), maxX = Math.max(...points.map((p2) => p2[0])), minY = Math.min(...points.map((p2) => p2[1])), maxY = Math.max(...points.map((p2) => p2[1]));
        const half = points.length / 2, profile = [];
        for (let i = 0; i < half; i++) {
          const left = points[i], right = points[points.length - 1 - i];
          if (Math.abs(left[1] - right[1]) > 0.1 || Math.abs(left[0] + right[0] - (minX + maxX)) > 0.1)
            throw Error(
              "The bottle outline must stay symmetric. Move matching nodes together."
            );
          profile.push([
            +(1 - (left[1] - minY) / (maxY - minY)).toFixed(6),
            +((right[0] - left[0]) / (maxX - minX)).toFixed(6)
          ]);
        }
        p.shape.profile = profile;
        p.shape.neckRatio = profile[profile.length - 1][1];
        const fill = (_b = outline.fills) == null ? void 0 : _b[0];
        if ((fill == null ? void 0 : fill.type) === "SOLID") {
          const color = "#" + [fill.color.r, fill.color.g, fill.color.b].map(
            (x) => Math.round(x * 255).toString(16).padStart(2, "0")
          ).join("");
          if ((_c = p.parts) == null ? void 0 : _c.Body) p.parts.Body.color = color;
          else p.material.color = color;
        }
        const cap = front.children.find((n) => n.getPluginData("kalpiPart") === "cap"), capFill = (_d = cap == null ? void 0 : cap.fills) == null ? void 0 : _d[0];
        if ((capFill == null ? void 0 : capFill.type) === "SOLID") {
          const color = "#" + [capFill.color.r, capFill.color.g, capFill.color.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
          const finish = ((_e = original.parts) == null ? void 0 : _e.Cap) || { type: "satin", color: "#29262c", roughness: 0.25, metalness: 0.65 };
          if (color !== finish.color) p.parts.Cap = { ...finish, color };
        }
      } else if (p.kind === "assembly") {
        for (const n of front.children) {
          const index = Number(n.getPluginData("kalpiPart").replace("component-", "")), fill = (_f = n.fills) == null ? void 0 : _f[0];
          if (p.shape.components[index] && (fill == null ? void 0 : fill.type) === "SOLID") p.shape.components[index].color = "#" + [fill.color.r, fill.color.g, fill.color.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
        }
      } else {
        p.shape.backHeight = p.dimensions.height - p.shape.seatHeight;
        for (const n of front.children) {
          const fill = (_g = n.fills) == null ? void 0 : _g[0], key = n.name.endsWith("arm") ? "Arms" : n.name === "Seat" ? "Seats" : "Back";
          if ((fill == null ? void 0 : fill.type) === "SOLID") {
            const color = "#" + [fill.color.r, fill.color.g, fill.color.b].map(
              (x) => Math.round(x * 255).toString(16).padStart(2, "0")
            ).join("");
            const existing = ((_h = p.parts) == null ? void 0 : _h[key]) || p.material;
            if (color !== existing.color) p.parts[key] = { ...existing, color };
          }
        }
      }
      const art = active.children.find(
        (n) => n.getPluginData("kalpiPart") === "artwork"
      );
      const label = art == null ? void 0 : art.children.find((n) => n.name === "Label text");
      if ((label == null ? void 0 : label.type) === "TEXT") p.label.text = label.characters;
      validateProduct(p);
      const signature = fingerprint(active), designId = active.getPluginData("kalpiDesignId"), baseRevision = Number(active.getPluginData("kalpiRevision"));
      if (convert) send({ type: "structured-preview", designId, document: p });
      const bytes = art ? Array.from(
        await art.exportAsync({
          format: "PNG",
          constraint: { type: "WIDTH", value: 1024 }
        })
      ) : null;
      if (signature !== fingerprint(active)) {
        clearTimeout(timer);
        timer = setTimeout(() => readChanges(convert), 700);
        return;
      }
      pending = true;
      active.setPluginData("kalpiPending", "true");
      send({
        type: "figma-change",
        designId,
        baseRevision,
        changes: diff(original, p),
        bytes,
        fingerprint: signature,
        document: p,
        convert,
        nodeId: active.id
      });
    } catch (e) {
      pending = true;
      if (active) active.setPluginData("kalpiPending", "true");
      send({ type: "sync-error", message: e.message });
    }
  }
  function changed(event) {
    if (suppressed || !active || active.removed) return;
    if (fingerprint(active) === active.getPluginData("kalpiFingerprint")) return;
    const relevant = event.nodeChanges.some((c) => {
      let n = c.node;
      while (n) {
        if (n === active) return true;
        n = n.parent;
      }
      return c.type === "DELETE";
    });
    if (!relevant) return;
    pending = true;
    active.setPluginData("kalpiPending", "true");
    clearTimeout(timer);
    send({ type: "sync-pending" });
    timer = setTimeout(() => readChanges(), 700);
  }
  function announce() {
    if (!active) return;
    pending = active.getPluginData("kalpiPending") === "true" || fingerprint(active) !== active.getPluginData("kalpiFingerprint");
    send({
      type: "selected-design",
      designId: active.getPluginData("kalpiDesignId"),
      nodeId: active.id,
      pending
    });
    if (pending) send({ type: "sync-pending" });
  }
  function watch() {
    var _a;
    page == null ? void 0 : page.off("nodechange", changed);
    page = figma.currentPage;
    page.on("nodechange", changed);
    active = selectedRoot() || (((_a = sourceNode()) == null ? void 0 : _a.getPluginData("kalpiDesignId")) ? sourceNode() : null);
    announce();
    describeSelection();
  }
  figma.on("currentpagechange", watch);
  figma.on("selectionchange", () => {
    const n = selectedRoot();
    active = n;
    if (n) announce();
    describeSelection();
  });
  figma.on("close", () => clearTimeout(timer));
  figma.ui.onmessage = async (m) => {
    var _a, _b, _c;
    try {
      if (m.type === "read-selected-label") {
        const nodes = figma.currentPage.selection;
        if (nodes.length !== 1 || !("exportAsync" in nodes[0])) return send({ type: "selected-label", designId: m.designId, error: "Select one label frame or artwork layer in Figma." });
        const bytes = await nodes[0].exportAsync({ format: "PNG", constraint: { type: "WIDTH", value: 1024 } });
        send({ type: "selected-label", designId: m.designId, bytes: Array.from(bytes) });
      }
      if (m.type === "place-product-preview") {
        if (typeof m.data !== "string" || !m.data.startsWith("data:image/jpeg;base64,") || m.data.length > 4e6) throw Error("Invalid preview image.");
        const image = figma.createImage(figma.base64Decode(m.data.split(",")[1])), rect = figma.createRectangle();
        rect.resize(900, 400);
        rect.name = String(m.name || "Kalpi 3D preview").slice(0, 100);
        rect.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FIT" }];
        rect.x = figma.viewport.center.x - 450;
        rect.y = figma.viewport.center.y - 200;
        figma.currentPage.selection = [rect];
        figma.viewport.scrollAndZoomIntoView([rect]);
        figma.notify("3D preview placed on your canvas");
      }
      if (m.type === "link-generated-model") {
        const board = await figma.getNodeByIdAsync(m.boardId);
        if (board && !board.removed && typeof m.designId === "string") board.setPluginData("kalpiSourceDesignId", m.designId);
      }
      if (["read-bottle-board", "read-product-board"].includes(m.type)) await readProductBoard(m.forceImage === true);
      if (["read-bottle-label", "read-product-label"].includes(m.type)) {
        const board = await figma.getNodeByIdAsync(m.boardId);
        const label = await figma.getNodeByIdAsync(m.nodeId);
        let ancestor = label;
        while (ancestor && ancestor !== board) ancestor = ancestor.parent;
        if (!board || !label || ancestor !== board || !["FRAME", "GROUP"].includes(label.type)) {
          send({ type: "bottle-label", bytes: null });
        } else {
          const bytes = await label.exportAsync({ format: "PNG", constraint: { type: "WIDTH", value: 1024 } });
          send({ type: "bottle-label", bytes: Array.from(bytes) });
        }
      }
      if (["create-recognized-bottle", "create-recognized-product"].includes(m.type)) {
        const board = await figma.getNodeByIdAsync(m.boardId);
        if (board) board.setPluginData("kalpiSourceDesignId", m.design.id);
        const existing = figma.currentPage.findAll((n) => n.getPluginData("kalpiDesignId") === m.design.id)[0];
        await writeTemplate(m.design, existing || null);
        if (board && active && !existing) {
          active.x = board.x + board.width + 80;
          active.y = board.y;
        }
        if (!existing && m.labelNodeId) {
          const original = await figma.getNodeByIdAsync(m.labelNodeId);
          let ancestor = original;
          while (ancestor && ancestor !== board) ancestor = ancestor.parent;
          if (original && ancestor === board && ["FRAME", "GROUP"].includes(original.type)) {
            suppressed++;
            try {
              const art = active.children.find((n) => n.getPluginData("kalpiPart") === "artwork");
              const copy = original.clone();
              tag(copy, "artwork");
              copy.name = "Artwork \xB7 original label";
              active.appendChild(copy);
              copy.x = 480;
              copy.y = 370;
              art == null ? void 0 : art.remove();
              active.setPluginData("kalpiFingerprint", fingerprint(active));
            } finally {
              suppressed--;
            }
          }
        }
        send({ type: "recognized-bottle-ready", designId: m.design.id });
      }
      if (m.type === "inspect-selection") describeSelection();
      if (m.type === "export-selection") await exportSelection(m);
      if (m.type === "import-linked") {
        const node = await figma.getNodeByIdAsync(m.nodeId);
        if (!node || node.removed) throw Error("The original Figma layer was removed.");
        node.setPluginData("kalpiImport", "true");
        node.setPluginData("kalpiDesignId", m.design.id);
        node.setPluginData("kalpiProjectId", m.design.projectId);
        node.setPluginData("kalpiDocument", m.design.document);
        node.setPluginData("kalpiRevision", String(m.design.revision));
        node.setPluginData("kalpiFingerprint", m.fingerprint);
        node.setPluginData("kalpiPending", "");
        active = node;
        pending = false;
        lastApplied = m.design.id + ":" + m.design.revision;
        describeSelection();
      }
      if (m.type === "ready") {
        send({ type: "plugin-ready", protocol: 8 });
        watch();
      }
      if (m.type === "save-studio-session" || m.type === "restore-studio-session") {
        if (!/^https:\/\/(kalpi-roan\.vercel\.app|kalpi-staging-eight\.vercel\.app)\/plugin\.html\?project=[a-zA-Z0-9-]+$/.test(m.url || "") && !/^http:\/\/localhost:(3000|3002|3100)\/plugin\.html\?project=[a-zA-Z0-9-]+$/.test(m.url || "")) throw Error("Unrecognized Kalpi workspace.");
        const key = "kalpiSession:" + m.url;
        if (m.type === "save-studio-session") {
          if (typeof m.token !== "string" || !m.token || m.token.length > 16e3) throw Error("Invalid studio session.");
          await figma.clientStorage.setAsync(key, m.token);
          await figma.clientStorage.setAsync("kalpiPanel", m.url);
          nativeLaunchURL = m.url;
        } else send({ type: "studio-session", token: await figma.clientStorage.getAsync(key) || null });
        return;
      }
      if (m.type === "reset-panel") {
        nativeLaunchURL = null;
        await figma.clientStorage.deleteAsync("kalpiPanel");
        showPanel();
        return;
      }
      if (m.type === "launch-native") {
        if (!/^https:\/\/(kalpi-roan\.vercel\.app|kalpi-staging-eight\.vercel\.app)\/plugin\.html(?:[?#]|$)/.test(m.url || "")) throw Error("Use your Kalpi studio link.");
        nativeLaunchURL = m.url;
        showPanel();
        return;
      }
      if (m.type === "bootstrap-ready") {
        await restorePanel();
      }
      if (m.type === "remember-panel" && /^https?:\/\//.test(m.url))
        await figma.clientStorage.setAsync("kalpiPanel", m.url);
      if (m.type === "duplicate-template" && active) {
        if (JSON.parse(m.design.document).kind === "freeform") throw Error("Duplicate the original layers in Figma, then convert the copy.");
        const copy = active.clone();
        copy.x = active.x + 840;
        await writeTemplate(m.design, copy);
        figma.currentPage.selection = [copy];
        await readChanges();
      }
      if (m.type === "ensure-template") {
        const existing = figma.currentPage.findAll((n) => n.getPluginData("kalpiDesignId") === m.design.id)[0];
        if (existing) {
          active = existing;
          figma.currentPage.selection = [existing];
          figma.viewport.scrollAndZoomIntoView([existing]);
          send({ type: "template-applied", designId: m.design.id, revision: Number(existing.getPluginData("kalpiRevision")) });
        } else await writeTemplate(m.design);
      }
      if (m.type === "create-template") {
        if ((_a = JSON.parse(m.design.document).shape) == null ? void 0 : _a.modelId) throw Error("Use Place preview in Figma for a detailed model. Its mesh is edited in the 3D panel.");
        if (JSON.parse(m.design.document).kind === "freeform") throw Error("This design already uses your original Figma layers. Select them on the canvas.");
        await writeTemplate(m.design);
      }
      if (m.type === "remote-design") {
        if ((_b = JSON.parse(m.design.document).shape) == null ? void 0 : _b.modelId) return;
        const frames = figma.currentPage.findAll(
          (n) => n.getPluginData("kalpiDesignId") === m.design.id
        );
        const frame = frames[0];
        if (!frame) {
          send({ type: "sync-unlinked", message: "3D saved. Click Create editable Figma views to link native layers for this design." });
          return;
        }
        if (pending || frame.getPluginData("kalpiPending") === "true" || fingerprint(frame) !== frame.getPluginData("kalpiFingerprint")) {
          send({
            type: "sync-error",
            message: "The website changed while you were editing. Convert your local changes first, or refresh to restore the saved design."
          });
          return;
        }
        if (lastApplied !== m.design.id + ":" + m.design.revision) {
          if (frame.getPluginData("kalpiImport") === "true") await updateImported(m.design, frame);
          else await writeTemplate(m.design, frame);
        }
      }
      if (m.type === "prepare-convert" && active) {
        await writeTemplate(m.design, active);
        await readChanges(true);
      }
      if (m.type === "convert") await readChanges(true);
      if (m.type === "retry") await readChanges(false);
      if (m.type === "sync-ack" && active && active.getPluginData("kalpiDesignId") === m.design.id) {
        active.setPluginData("kalpiDocument", m.design.document);
        active.setPluginData("kalpiRevision", String(m.design.revision));
        lastApplied = m.design.id + ":" + m.design.revision;
        if (fingerprint(active) === m.fingerprint) {
          pending = false;
          active.setPluginData("kalpiPending", "");
          active.setPluginData("kalpiFingerprint", m.fingerprint);
        } else {
          pending = true;
          clearTimeout(timer);
          timer = setTimeout(() => readChanges(), 700);
        }
      }
      if (m.type === "open-studio" && /^https?:\/\//.test(m.url))
        figma.openExternal(m.url);
      if (m.type === "restore-template" && active) {
        if (active.getPluginData("kalpiImport") === "true") throw Error("Original artwork is preserved. Reconvert it to update the 3D outlines; use Figma undo to restore artwork.");
        await writeTemplate(m.design, active);
      }
    } catch (e) {
      send({
        type: "sync-error",
        operation: ["create-recognized-bottle", "create-recognized-product"].includes(m.type) ? "create-recognized-product" : m.type,
        designId: (_c = m.design) == null ? void 0 : _c.id,
        message: e.message || "Figma could not update this product."
      });
    }
  };
  showPanel();
})();
