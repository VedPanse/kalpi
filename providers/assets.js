import { randomUUID } from "node:crypto";
export const assetTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "model/gltf-binary": "glb",
  "model/vnd.usdz+zip": "usdz",
};
export function assetMetadata(p) {
  if (
    !p ||
    !assetTypes[p.mime] ||
    !/^[-a-zA-Z0-9]{8,150}$/.test(p.id || "") ||
    !/^[-a-zA-Z0-9]{8,150}$/.test(p.projectId || "")
  )
    throw Error("Choose a PNG, JPEG, GLB, or USDZ asset for this workspace.");
  return {
    id: p.id,
    projectId: p.projectId,
    mime: p.mime,
    extension: assetTypes[p.mime],
  };
}
export function validateAsset(bytes, mime, maxBytes = 30 * 1024 * 1024) {
  const b = Buffer.from(bytes);
  if (b.length < 4 || b.length > maxBytes)
    throw Error("Assets must be under 30 MB.");
  if (
    mime === "image/png" &&
    !b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error("Invalid PNG.");
  if (mime === "image/jpeg" && !(b[0] === 255 && b[1] === 216 && b[2] === 255))
    throw Error("Invalid JPEG.");
  if (mime === "model/vnd.usdz+zip" && b.readUInt32LE(0) !== 0x04034b50)
    throw Error("Invalid USDZ archive.");
  if (mime === "model/gltf-binary") {
    if (
      b.length < 20 ||
      b.readUInt32LE(0) !== 0x46546c67 ||
      b.readUInt32LE(4) !== 2 ||
      b.readUInt32LE(8) !== b.length ||
      b.readUInt32LE(16) !== 0x4e4f534a
    )
      throw Error("Use a valid glTF 2.0 binary model.");
    const n = b.readUInt32LE(12);
    if (n > b.length - 20) throw Error("Invalid model header.");
    let g;
    try {
      g = JSON.parse(b.subarray(20, 20 + n).toString());
    } catch {
      throw Error("Invalid model data.");
    }
    if (
      [...(g.buffers || []), ...(g.images || [])].some(
        (x) => x.uri && !x.uri.startsWith("data:"),
      )
    )
      throw Error("Models must include their textures and buffers.");
  }
  return b;
}
export const localAssetPath = (extension) =>
  `data/uploads/${randomUUID()}.${extension}`;
