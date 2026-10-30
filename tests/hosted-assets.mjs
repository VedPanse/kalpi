// Opt-in hosted check: node --env-file=.local/staging-blob.env --env-file=.local/staging.env tests/hosted-assets.mjs
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { uploadPresigned } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { withService, recordStore } from "../providers/spacetime.js";
const base =
    process.env.KALPI_HOSTED_URL || "https://kalpi-staging-eight.vercel.app",
  id = randomUUID();
const crc = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, bytes) => {
  const content = Buffer.concat([Buffer.from(type), bytes]),
    out = Buffer.alloc(content.length + 8);
  out.writeUInt32BE(bytes.length);
  content.copy(out, 4);
  out.writeUInt32BE(crc(content), out.length - 4);
  return out;
};
const w = 1024,
  h = 1536,
  raw = Buffer.alloc(h * (1 + w * 4));
let seed = 12879;
for (let y = 0; y < h; y++)
  for (let x = 1; x <= w * 4; x++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    raw[y * (1 + w * 4) + x] = seed & 255;
  }
const header = Buffer.alloc(13);
header.writeUInt32BE(w);
header.writeUInt32BE(h, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
assert.ok(png.length > 4.5 * 1024 * 1024);
let blob;
try {
  blob = await uploadPresigned(
    `legacy/${id}.png`,
    new Blob([png], { type: "image/png" }),
    {
      access: "private",
      contentType: "image/png",
      handleUploadUrl: base + "/api/seller/uploads",
      headers: { Authorization: "Bearer " + process.env.SELLER_TOKEN },
      clientPayload: JSON.stringify({
        id,
        mime: "image/png",
        name: "Automated large-upload verification.png",
      }),
    },
  );
  let ready = false;
  for (let n = 0; n < 60; n++) {
    const r = await fetch(base + "/api/seller/assets/" + id, {
      headers: { Authorization: "Bearer " + process.env.SELLER_TOKEN },
    });
    if (r.ok) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, "signed callback registers the upload");
  assert.equal((await fetch(base + "/assets/" + id)).status, 401);
  const response = await fetch(base + "/assets/" + id, {
    headers: { Authorization: "Bearer " + process.env.SELLER_TOKEN },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
  console.log(
    `Verified private ${Math.round((png.length / 1024 / 1024) * 10) / 10} MB direct upload, signed callback, authenticated read and anonymous denial.`,
  );
} finally {
  if (blob) {
    await withService(async (c) => {
      const s = recordStore(c);
      s.remove(id);
      await s.commit();
    });
    await del(blob.pathname);
    console.log("Removed the test-only asset.");
  }
}
