import {appURL} from "./runtime.js";
import { recordDiagnostic } from "./telemetry.js";
import { uploadPresigned } from "@vercel/blob/client";
import { getConfig, requestToken, uuid, rows } from "./client.js";
async function performUpload(projectId, data, mime, id = uuid(), onProgress = () => {}) {
  const config = await getConfig(),
    file = new Blob([data], { type: mime });
  if (config.local && !config.blob) {
    const form = new FormData();
    form.append("file", file);
    form.append("projectId", projectId);
    form.append("id", id);
    form.append("mime", mime);
    const r = await fetch(appURL("/api/local-assets"), {
      method: "POST",
      headers: { Authorization: "Bearer " + await requestToken() },
      body: form,
    });
    const v = await r.json();
    if (!r.ok) throw Error(v.error);
  } else {
    const ext =
      mime === "model/gltf-binary"
        ? "glb"
        : mime === "model/vnd.usdz+zip"
          ? "usdz"
          : mime === "image/jpeg"
            ? "jpg"
            : "png";
    onProgress(0);
    await uploadPresigned(`${projectId}/${id}.${ext}`, file, {
      access: "private",
      multipart: file.size > 4 * 1024 * 1024,
      abortSignal: AbortSignal.timeout(300000),
      handleUploadUrl: appURL("/api/uploads"),
      headers: { Authorization: "Bearer " + await requestToken() },
      clientPayload: JSON.stringify({ projectId, id, mime }),
    });
  }
  const start = Date.now();
  while (!rows("myAssets").some((a) => a.id === id)) {
    if (Date.now() - start > 15000)
      throw Error(
        "Upload finished; asset registration is still pending. Retry after reconnecting.",
      );
    await new Promise((r) => setTimeout(r, 150));
  }
  onProgress(100);
  return id;
}
export async function artworkUrl(id) {
  const r = await fetch(appURL("/api/assets/" + encodeURIComponent(id)), {
    headers: { Authorization: "Bearer " + await requestToken() },
  });
  if (!r.ok) throw Error("Artwork unavailable.");
  return URL.createObjectURL(await r.blob());
}

export async function uploadAsset(...args) {
  const start = performance.now();
  try {
    const id = await performUpload(...args);
    recordDiagnostic("asset.upload.complete", {
      durationMs: performance.now() - start,
    });
    return id;
  } catch (error) {
    recordDiagnostic("asset.upload.failed", {
      durationMs: performance.now() - start,
    });
    throw error;
  }
}
