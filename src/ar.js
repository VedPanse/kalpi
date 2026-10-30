import QRCode from "qrcode";
import { connect, rows } from "./client.js";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
(async () => {
  try {
    await connect();
    const [, , publicationId, versionId] = location.pathname.split("/");
    const p = rows("publishedStores").find((p) => p.id === publicationId);
    if (!p) throw Error("This publication is unavailable.");
    const v = JSON.parse(p.snapshot).versions.find((v) => v.id === versionId);
    if (!v) throw Error("Product not found.");
    const d = v.document,
      base = `/api/assets/${versionId}`,
      query = `?publication=${publicationId}`;
    document.querySelector("#app").innerHTML =
      `<a class="brand" href="/store/${publicationId}">kalpi<span>✳</span></a><div class="heading" style="margin-top:30px"><div><div class="eyebrow">A place in your world</div><h1>${esc(v.name)}</h1><p>${d.scale.confirmed ? "The saved design, at its confirmed nominal size." : "The saved design. Dimensions await creator confirmation."}</p></div></div><div class="ar-grid"><model-viewer src="${base}-glb${query}" ios-src="${base}-usdz${query}" alt="${esc(v.name)}" camera-controls shadow-intensity="1" exposure="1" ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" ar-placement="floor" xr-environment><button id="ar-button" slot="ar-button" class="primary">${d.scale.confirmed ? "View in your space" : "Try estimated size in your space"}</button></model-viewer><section class="panel"><h2>${d.scale.confirmed ? "Product dimensions" : "Estimated dimensions"}</h2><dl class="facts">${["width", "depth", "height"].map((k) => `<dt>${k}</dt><dd>${(d.dimensions[k] * 100).toFixed(1)} cm</dd>`).join("")}<dt>Floor footprint</dt><dd>${(d.dimensions.width * d.dimensions.depth).toFixed(2)} m²</dd></dl>${d.scale.confirmed ? "<p>AR uses fixed 1:1 scale. Move your phone slowly to find the floor, then place the product. Placement accuracy depends on your device’s tracking.</p>" : `<p>AR uses the estimated dimensions above at fixed scale. Use it to preview placement, not to verify a precise fit. To change the size, edit width, depth and height in the studio, then send the updated version to the shelf and publish it.</p><a class="primary" href="/studio?project=${p.projectId}">Edit size in studio</a>`}<p>Open this page on a compatible phone:</p><canvas id="qr" class="qr"></canvas><p id="ar-status" role="status"></p><small>Use the dimensions above to check clearances. AR does not guarantee that an item will fit.</small></section></div>`;
    await QRCode.toCanvas(document.querySelector("#qr"), location.href, {
      width: 180,
      margin: 1,
    });
    const model = document.querySelector("model-viewer");
    model.addEventListener(
      "error",
      () =>
        (document.querySelector("#ar-status").textContent =
          "The 3D file is unavailable. Return to the store and try again."),
    );
    model.addEventListener("ar-status", (e) => {
      document.querySelector("#ar-status").textContent =
        e.detail.status === "failed"
          ? "AR could not start. Use a supported phone and allow camera access."
          : e.detail.status === "session-started"
            ? "Find a clear floor surface."
            : "";
    });
  } catch (e) {
    document.querySelector("#app").innerHTML =
      `<h1>Product unavailable</h1><p>${esc(e.message)}</p>`;
  }
})();
