import {SHELF_PRESETS,shelfLayout} from '../shared/shelf-presets.js';
import {icon} from './ui-icons.js';
import {ensureVersionPreview} from './version-assets.js';
import {placeOnShelf} from './shop-handoff.js';
import {ioannaLayout} from '../shared/retail-layout.js';
import {MODEL_CATALOG} from '../shared/model-catalog.js';
import {libraryProduct} from '../shared/library-product.js';
import {roomPalette} from './room-finishes.js';
import {storage} from "./runtime.js";
import {ensureVersionAssets} from "./version-assets.js";
import { Identity } from "spacetimedb";
import * as T from "three";
import QRCode from "qrcode";
import {
  connect,
  rows,
  call,
  uuid,
  identity,
  getConfig,
  signIn,
  creatorSignedIn,
  api,
} from "./client.js";
import {
  defaultProduct,
  isHandheld,
  defaultLayout,
  clone,
  EDIT_FIELDS,
  applyChanges,
} from "../shared/product.js";
import { studioViewer, thumbnailProduct } from "./render.js";
import { storeViewer } from "./store-view.js";
import { exportProduct } from "./geometry.js";
import { uploadAsset, artworkUrl } from "./assets.js";
import { creatorUser, redirectCreatorSignIn, signInPending } from "./auth.js";
const app = document.querySelector("#app"),
  params = new URLSearchParams(location.search);
let projectId = params.get("project") || storage.getItem("kalpi-project"),
  designId = params.get("design"),
  tab = ["shelf","store","results","compare","connect"].includes(params.get("tab")) ? params.get("tab") : "design",
  selection = new Set((params.get("versions")||"").split(",").filter(Boolean)),
  view = null,
  productInspection = null,
  renderTimer,
  selectedPart = "Body",
  busy = false,
  chat = [],
  roomId = params.get("room") || uuid(),
  roomJoined = false,
  publicationId = location.pathname.startsWith("/store/")
    ? location.pathname.split("/")[2]
    : null,
  inspection = null,
  config,
  creator = null,
  assetURLs = {},
  status = "Connecting…";
let pendingEdit = Promise.resolve(),
  draftDirty = false;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)];
function toast(message) {
  const e = $("#toast");
  e.textContent = message;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 6000);
}
async function act(fn) {
  try {
    await fn();
  } catch (e) {
    console.error(e);
    toast(e.message);
  }
}
function project() {
  return (
    rows("myProjects").find((p) => p.id === projectId) || rows("myProjects")[0]
  );
}
function designs() {
  return rows("myDesigns")
    .filter((d) => d.projectId === project()?.id)
    .sort((a, b) => a.updatedAt === b.updatedAt
      ? a.id.localeCompare(b.id)
      : a.updatedAt > b.updatedAt ? -1 : 1);
}
function design() {
  return designs().find((d) => d.id === designId) || designs()[0];
}
function versions() {
  return rows("myVersions").filter((d) => d.projectId === project()?.id);
}
function layout() {
  return rows("myLayouts").find((d) => d.projectId === project()?.id);
}
function doc() {
  return design() ? JSON.parse(design().document) : null;
}
const dims = (p) =>
  `${(p.dimensions.width * 100).toFixed(1)} × ${(p.dimensions.depth * 100).toFixed(1)} × ${(p.dimensions.height * 100).toFixed(1)} cm`;
const price = (p) =>
  p.facts.price === null
    ? "Price not set"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: p.facts.currency,
      }).format(p.facts.price);
function bind(id, fn) {
  const e = $(id);
  if (e) e.onclick = () => act(fn);
}
function shell(content) {
  productInspection?.dispose();productInspection=null;
  view?.dispose();
  view = null;
  const p = project();
  if (p) {
    projectId = p.id;
    storage.setItem("kalpi-project", p.id);
  }
  app.innerHTML = `<header class="topbar"><a class="brand" href="/">kalpi<span>✳</span></a>${
    p
      ? `${rows("myProjects").length>1?`<select id="project-select" aria-label="Project">${rows("myProjects")
          .map(
            (p) =>
              `<option value="${p.id}" ${p.id === projectId ? "selected" : ""}>${esc(p.name)}</option>`,
          )
          .join("")}</select>`:""}<nav class="nav">${[
          ["design", "Design"],
          
          ["compare", "Compare"],
          ["store", "Shop"],
          ["results", "Results"],
        ]
          .map(
            ([id, name]) =>
              `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${name}</button>`,
          )
          .join("")}</nav>`
      : ""
  }${status==='Reconnecting…'?'<span role="status">Reconnecting…</span>':''}${p ? '<button id="connect-figma" class="connect-button">Connect Figma</button>' : ""}</header><main class="page">${content}${p?'<footer style="margin-top:32px;border-top:1px solid var(--line);padding-top:16px"><details><summary>Workspace settings</summary><p class="workspace-name">'+esc(p.name)+'</p><div class="actions" style="margin-top:12px"><button id="collaborators">Collaborators</button><button id="new-project">New project</button><button id="renew-sign-in">Reconnect sign-in</button></div></details></footer>':''}</main>`;
  bind("#new-project", newProject);
  bind("#renew-sign-in", () => beginCreatorSignIn(true));
  bind("#connect-figma", connectFigma);
  bind("#collaborators", collaborators);
  all("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        render();
      }),
  );
  $("#project-select")?.addEventListener("change", (e) => {
    projectId = e.target.value;
    designId = null;
    selection.clear();
    render();
  });
}
function connectFigma() {
  const projectAtOpen = project().id;
  const state = setupState();
  const trigger = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.id = "figma-connection";
  dialog.setAttribute("aria-labelledby", "figma-connection-title");
  dialog.innerHTML = `<div class="row"><h2 id="figma-connection-title">Connect Figma</h2><button id="close-connection" aria-label="Close Figma connection">✕</button></div><p>Copy a pairing link, then paste it into the Kalpi plugin in Figma.</p><button id="connection-create" class="primary full-width">Create pairing link</button><div id="connection-result" hidden><label>Pairing link<input id="connection-link" readonly></label><button id="connection-copy" class="primary full-width">Copy pairing link</button><p id="connection-message" role="status">Paste into Figma → Connect workspace. Links expire after five minutes.</p><button id="connection-renew" class="ghost">Create a fresh link</button></div><details class="divider"><summary>Need the plugin?</summary><p><a href="/kalpi-figma-plugin.zip">Download Kalpi plugin</a></p><p>Unzip it. In Figma desktop, choose Plugins → Development → Import plugin from manifest, then select manifest.json.</p></details>`;
  document.body.append(dialog);
  const showLink = () => {
    dialog.querySelector("#connection-create").hidden = true;
    dialog.querySelector("#connection-result").hidden = false;
    dialog.querySelector("#connection-link").value = state.link;
  };
  const create = async () => {
    const buttons = [dialog.querySelector("#connection-create"), dialog.querySelector("#connection-renew")];
    buttons.forEach(b => b.disabled = true);
    try {
      const code = uuid();
      await call("createPairing", { projectId: projectAtOpen, code });
      state.link = `${location.origin}/plugin.html?project=${projectAtOpen}#${code}`;
      state.expires = Date.now() + 5 * 60 * 1000;
      showLink();
    } finally { buttons.forEach(b => b.disabled = false); }
  };
  dialog.querySelector("#connection-create").onclick = () => act(create);
  dialog.querySelector("#connection-renew").onclick = () => act(create);
  dialog.querySelector("#connection-copy").onclick = () => act(async () => {
    if (Date.now() >= state.expires) await create();
    try {
      await navigator.clipboard.writeText(state.link);
      dialog.querySelector("#connection-message").textContent = "Copied. Paste into the Kalpi plugin, then click Connect workspace.";
    } catch {
      dialog.querySelector("#connection-link").select();
      dialog.querySelector("#connection-message").textContent = "Select and copy this link, then paste it into the Kalpi plugin.";
    }
  });
  dialog.querySelector("#close-connection").onclick = () => dialog.close();
  dialog.addEventListener("close", () => { dialog.remove(); trigger?.focus(); });
  if (state.link && state.expires > Date.now()) showLink();
  dialog.showModal();
}
function modal(title, body, onSubmit, submitLabel = "Continue") {
  const d = document.createElement("dialog");
  d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${body}<div class="actions"><button value="cancel" formnovalidate>Cancel</button><button class="primary" value="default">${esc(submitLabel)}</button></div></form>`;
  document.body.append(d);
  d.addEventListener("close", () => {
    if (d.returnValue === "default")
      act(() => onSubmit(new FormData(d.querySelector("form"))));
    d.remove();
  });
  d.showModal();
}
function collaborators() {
  modal(
    "Workspace collaborators",
    `<p>Share your public identity with the workspace owner to request access. Invitations grant editing access to this project.</p><label>Your public identity<input readonly value="${identity()}"></label>${project().owner.toHexString() === identity() ? '<label>Collaborator public identity<input name="identity" required pattern="[a-fA-F0-9]{64}" placeholder="64-character public identity"></label>' : "<p>Only the workspace owner can invite collaborators.</p>"}`,
    async (f) => {
      if (!f.get("identity")) return;
      await call("inviteCollaborator", {
        projectId: project().id,
        identity: Identity.fromString(f.get("identity")),
      });
      toast("Collaborator added. Their workspace updates immediately.");
    },
  );
}
async function newProject() {
  if (config?.authClientId && !(await creatorSignedIn()))
    return beginCreatorSignIn();
  modal(
    "A new product story",
    '<label>Project name<input name="name" placeholder="Sola fragrance study" required></label>',
    async (f) => {
      projectId = uuid();
      await call("createProject", { id: projectId, name: f.get("name") });
      tab = "design";
      designId = null;
      render();
    },
  );
}
function beginCreatorSignIn(restart = false) {
  signIn({ restart });
  creator = null;
  if (!project()) intro();
  else
    toast(
      "Keep the sign-in tab open. Open the email link in another tab; Kalpi will reconnect automatically.",
    );
}
function intro() {
  shell(
    `<section class="intro"><div><div class="eyebrow">A little closer to what’s next</div><h1>From your first line<br>to their first<br><em>impression.</em></h1><p>Design in Figma. Find the form in 3D. Step into a store together and learn what people would choose.</p><button class="primary" id="begin">Start a project ↗</button> ${creator ? `<p class="status" role="status">Signed in${creator.profile?.email ? ` as ${esc(creator.profile.email)}` : " as a creator"}. Start a project to connect Figma.</p>` : `<button id="sign-in" class="ghost">${signInPending() ? "Return to sign-in tab" : "Creator sign in"}</button>`} <button id="copy-identity" class="ghost">Copy public identity</button>${!creator && signInPending() ? `<div class="panel divider" role="status"><h3>Waiting for your email confirmation</h3><p>Keep the sign-in tab open. Open the magic link in a separate tab. When it says you can close the tab, close only that email-confirmation tab.</p><p>The sign-in tab will return to Kalpi, and this page will update automatically.</p><small>If the sign-in tab was closed or replaced, start again for a fresh email link.</small><button id="restart-sign-in" class="ghost">Start sign-in again</button></div>` : ""}</div><div class="panel"><div class="eyebrow">The way from idea to aisle</div>${[
      [
        "01",
        "Start in Figma",
        "Editable outlines and artwork. Every detail stays connected.",
      ],
      [
        "02",
        "Shape it together",
        "Ask for a new silhouette, material, or finish. See it from every side.",
      ],
      [
        "03",
        "Give it a place",
        "Build a store, invite people in, and hear what they think.",
      ],
    ]
      .map(
        ([n, t, s]) =>
          `<div class="step"><b>${n}</b><div><h3>${t}</h3><p>${s}</p></div></div>`,
      )
      .join("")}</div></section>`,
  );
  bind("#begin", newProject);
  bind("#sign-in", () => beginCreatorSignIn());
  bind("#restart-sign-in", () => beginCreatorSignIn(true));
  bind("#copy-identity", async () => {
    await navigator.clipboard.writeText(identity());
    toast("Public identity copied. Share it with your workspace owner.");
  });
}
const setupProgress = new Map();
function setupState() {
  const id = project().id;
  if (!setupProgress.has(id)) setupProgress.set(id, {
    step: project().figmaUrl ? 2 : 1, url: project().figmaUrl || "", link: "", expires: 0,
  });
  return setupProgress.get(id);
}
function setup() {
  const state = setupState();
  const step = state.step;
  shell(`<div class="heading"><div><div class="eyebrow">Figma setup · Step ${step} of 3</div><h1>Let’s get your design into 3D.</h1><p>Your Figma link opens your file. Convert, rotate, and edit your product inside the Kalpi plugin. Send it here when you are ready to arrange a shelf.</p></div></div>
    <div class="setup-guide"><nav class="setup-steps" aria-label="Setup progress">${["Your file", "Install plugin", "Connect & design"].map((name, i) => `<button data-setup-step="${i + 1}" ${step === i + 1 ? 'aria-current="step"' : ''}>${i + 1}. ${name}</button>`).join("")}</nav>
    <section class="panel">
    ${step === 1 ? `<h2>1. Open your Figma file</h2><p>Paste the link to your Design file. We’ll save it for this project.</p><label>Figma Design file URL<input id="figma-link" type="url" placeholder="https://www.figma.com/design/…" value="${esc(state.url)}"></label><button id="open-figma" class="primary">Open Figma & continue ↗</button><p><small>Figma opens in another tab. Return here for the next step.</small></p>` : ""}
    ${step === 2 ? `<h2>2. Add Kalpi to Figma — just once</h2><p>This pilot uses a development plugin, so this step needs the <strong>Figma desktop app</strong>.</p><ol class="setup-instructions"><li><a href="/kalpi-figma-plugin.zip" download>Download the Kalpi plugin</a>, then unzip the download.</li><li>Open your design file in Figma desktop.</li><li>In Figma’s menu, choose <strong>Plugins → Development → Import plugin from manifest…</strong></li><li>Choose <strong>manifest.json</strong> inside the unzipped folder.</li><li>Choose <strong>Plugins → Development → Kalpi</strong> to run it.</li></ol><button id="plugin-ready" class="primary">The Kalpi panel is open →</button><p><small>Already installed? Just run Kalpi from the Development menu.</small></p>` : ""}
    ${step === 3 ? `<h2>3. Connect, then convert your design</h2><p>Keep the Kalpi panel open in Figma and follow these steps:</p><ol class="setup-instructions"><li>Click <strong>Create pairing link</strong> below, then copy it.</li><li>Paste it into the Kalpi panel in Figma and click <strong>Connect workspace</strong>.</li><li>Bring your presentation board into view in Figma.</li><li>Click <strong>Convert to 3D ↗</strong>. Rotate and edit the model right inside Figma, then click <strong>Send to shelf ↗</strong>.</li></ol><button id="pair" class="primary">Create pairing link</button><div id="pair-result">${state.link && state.expires > Date.now() ? `<label>Paste this into the Figma plugin<input id="pair-link" readonly value="${esc(state.link)}"></label><button id="copy-pair">Copy pairing link</button><p role="status">Link created. Paste it into Figma within five minutes. Keep it private.</p>` : ""}</div><p class="divider">Your original artwork stays in place. Review inferred geometry and dimensions in Figma before sending a saved direction to Kalpi.</p>` : ""}
    ${step > 1 ? `<button id="setup-back" class="ghost">← Back</button>` : ""}
    </section><section class="panel setup-shortcut"><h3>Want to try 3D first?</h3><p>Start with a sample product here. You can connect Figma later from <strong>Connect Figma</strong>. This creates a new product; it does not import your artwork.</p><div class="actions"><button id="new-bottle">Bottle template</button><button id="new-sofa">Sofa template</button><select id="library-choice" aria-label="Detailed product model">${MODEL_CATALOG.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}</select><button id="new-library">Use detailed model</button></div></section></div>`);
  setupBindings();
}
function setupBindings() {
  const state = setupState();
  all("[data-setup-step]").forEach((button) => button.onclick = () => {
    state.step = Number(button.dataset.setupStep);
    setup();
  });
  const input = $("#figma-link");
  if (input) input.oninput = () => { state.url = input.value; };
  bind("#open-figma", async () => {
    const url = state.url.trim();
    if (!/^https:\/\/(www\.)?figma\.com\/(design|file)\/[a-zA-Z0-9]+/.test(url))
      throw Error("Paste your Figma Design file link first, then click Open Figma.");
    window.open(url, "kalpi-figma", "noopener");
    await call("setFigmaLink", { projectId: project().id, url });
    state.url = url;
    state.step = 2;
    setup();
  });
  bind("#setup-back", () => { state.step--; setup(); });
  bind("#plugin-ready", () => { state.step = 3; setup(); });
  bind("#pair", async () => {
    const code = uuid();
    await call("createPairing", { projectId: project().id, code });
    state.link = `${location.origin}/plugin.html?project=${project().id}#${code}`;
    state.expires = Date.now() + 5 * 60 * 1000;
    setup();
  });
  bind("#copy-pair", async () => {
    if (Date.now() >= state.expires) throw Error("This link expired. Click Create pairing link for a fresh one.");
    try { await navigator.clipboard.writeText(state.link); toast("Copied. Paste it into the Kalpi panel in Figma."); }
    catch { $("#pair-link").select(); toast("Select and copy the link, then paste it into Figma."); }
  });
  bind("#new-bottle", () => createDesign("bottle"));
  bind("#new-library",()=>{const p=libraryProduct($("#library-choice").value);return createDesign(p.kind,JSON.stringify(p));});
  bind("#new-sofa", () => createDesign("sofa"));
}
async function createDesign(kind, document = "") {
  designId = uuid();
  await call("createDesign", {
    id: designId,
    projectId: project().id,
    kind,
    document,
  });
  tab = "design";
  render();
}
function update() {
  if (publicationId) {
    if (view) {
      view.sync?.(
        rows("roomVisitors").filter((v) => v.roomId === roomId),
        rows("roomHolds").filter((v) => v.roomId === roomId),
      );
      const count = $("#visitor-count");
      if (count)
        count.textContent = `${rows("roomVisitors").filter((v) => v.roomId === roomId).length} in this store`;
      const held = $("#held-status");
      if (held)
        held.textContent = rows("roomHolds").some(
          (h) =>
            h.roomId === roomId &&
            h.holder.toHexString() === identity() &&
            Number(h.expiresAt) > Date.now(),
        )
          ? "Holding product"
          : "";
      if($("#return-product"))$("#return-product").hidden=!held?.textContent;
      if($('#hand-rotation'))$('#hand-rotation').hidden=!held?.textContent;
      for(const id of ['#pickup','#ask-shopkeeper'])if($(id))$(id).hidden=Boolean(held?.textContent);
      return;
    }
  }
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    if (!busy && !draftDirty && !document.querySelector("#figma-connection")) render();
  }, 90);
}
function option(v, current) {
  return `<option value="${v}" ${v === current ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`;
}
function field(label, name, value, type = "number", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${esc(typeof value === "number" ? Number(value.toFixed(5)) : (value ?? ""))}" ${extra}></label>`;
}
const partKey = (n) =>
  n.startsWith("Seat")
    ? "Seats"
    : n.endsWith("arm")
      ? "Arms"
      : n === "Leg"
        ? "Legs"
        : n;
function undoTarget(d) {
  const stack = [];
  for (const r of rows("myRevisions")
    .filter((r) => r.designId === d.id)
    .sort((a, b) => a.revision - b.revision)) {
    if (r.origin === "undo") {
      const i = stack.findLastIndex((x) => x.document === r.document);
      if (i >= 0) stack.splice(i + 1);
    } else stack.push(r);
  }
  return stack.length > 1 ? stack.at(-2).revision : null;
}
const openEditSections = new Set();
let manualControlsOpen = false;
function studio() {
  const d = design(),
    p = doc();
  if (!p) return setup();
  designId = d.id;
  const savedMessages = rows("myConversations")
    .filter((x) => x.designId === d.id)
    .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  const log = [
    ...savedMessages.flatMap((x) => [
      { role: "user", text: x.prompt },
      { role: "assistant", text: x.status === "applied" ? "Applied to 3D. " + x.response : x.response },
    ]),
    ...chat.filter(
      (x) =>
        x.designId === d.id &&
        !savedMessages.some((y) => y.id.endsWith(x.operationId)),
    ),
  ];
  shell(
    `<div class="heading"><div><h1>${esc(p.facts.name || "Your design")}</h1><p>${esc(project().name)} <span class="badge">REVISION ${d.revision}</span></p></div><div class="actions"><button type="button" id="undo" title="Undo last edit" ${undoTarget(d) === null ? "disabled" : ""}>↶ Undo</button><button id="duplicate">Duplicate</button><button id="save-version" class="primary">Send to shelf</button></div></div><div class="workspace"><section class="canvas-card"><div class="canvas-note"><select id="draft-select" aria-label="Working design">${designs()
      .map(
        (x) =>
          `<option value="${x.id}" ${x.id === d.id ? "selected" : ""}>${esc(JSON.parse(x.document).facts.name)} · r${x.revision}</option>`,
      )
      .join(
        "",
      )}</select></div><div id="viewport" class="viewport"></div><div class="canvas-tools"><button data-view="front">Front</button><button data-view="side">Side</button><button data-view="top">Top</button><button data-view="bottom">Underneath</button><button id="dimensions">Dimensions</button><select id="lighting" aria-label="Lighting">${["daylight", "warm", "cool"].map((v) => option(v, "daylight")).join("")}</select><span class="dimension-label">${dims(p)}</span></div></section><form id="properties" class="panel inspector"><div class="row"><h3>Product details</h3><span class="badge" id="selected-part">${esc(selectedPart)}</span></div>${p.reconstruction ? `<details><summary>About this 3D model</summary><p>${esc(p.reconstruction.summary)}</p></details>` : ""}${field("Design name", "facts.name", p.facts.name, "text")}${field("Brand", "facts.brand", p.facts.brand, "text")}<h3 class="divider">Dimensions · cm</h3><div class="three-fields">${["width", "height", "depth"].map((k) => field(k[0].toUpperCase() + k.slice(1), "dimensions." + k, p.dimensions[k] * 100, "number", 'step="0.1" min="0.5" max="1000"')).join("")}</div><label><span><input name="scale.confirmed" type="checkbox" ${p.scale.confirmed ? "checked" : ""}> I confirm these product dimensions</span></label>${field("Dimension source", "scale.source", p.scale.source, "text")}<p class="muted">After changing size, apply changes first, then confirm the measured dimensions for AR. Save and publish a new version to use that size.</p><details class="edit-section"><summary>Shape</summary>${p.kind === "bottle" ? `<label>Cross-section<select name="shape.crossSection">${["circle", "faceted", "rectangle", "triangular"].map((v) => option(v, p.shape.crossSection)).join("")}</select></label><div class="field-grid">${field("Facets", "shape.facets", p.shape.facets, "number", 'min="4" max="32" step="1"')}${field("Bevel", "shape.bevel", p.shape.bevel, "number", 'min="0" max="0.45" step="0.01"')}${field("Neck ratio", "shape.neckRatio", p.shape.neckRatio, "number", 'step="0.01"')}${field("Cap ratio", "shape.capRatio", p.shape.capRatio, "number", 'step="0.01"')}</div><details><summary>Outline control points</summary><label>Bottom-to-top height / radius<textarea name="shape.profile">${esc(JSON.stringify(p.shape.profile))}</textarea></label></details>` : p.kind === "sofa" ? `<div class="field-grid">${["seatHeight", "armWidth", "backHeight", "legHeight"].map((k) => field(k.replace(/([A-Z])/g, " $1") + " · cm", "shape." + k, p.shape[k] * 100, "number", 'step="1"')).join("")}${field("Seat cushions", "shape.seats", p.shape.seats, "number", 'min="1" max="5"')}</div>` : p.kind === "assembly" ? `<p>${p.shape.modelId ? "Detailed library model. Edit size, finishes and artwork; mesh reshaping needs a new model." : "Built from editable 3D parts. Ask the AI to change individual parts, proportions, or materials."}</p>` : `<p>Extruded from your Figma outlines. Edit the original artwork and reconvert to change its silhouette.</p>`}</details><details class="edit-section"><summary>Material & artwork</summary><div class="field-grid"><label>Material<select name="material.type">${["glass", "satin", "metal", "ceramic", "fabric"].map((v) => option(v, p.material.type)).join("")}</select></label>${field("Color", "material.color", p.material.color, "color")}${field("Roughness", "material.roughness", p.material.roughness, "number", 'min="0" max="1" step="any"')}${field("Metallic", "material.metalness", p.material.metalness, "number", 'min="0" max="1" step="any"')}</div>${p.kind === "bottle" ? `${field("Label text", "label.text", p.label.text, "text")}<label>Artwork<input id="artwork" type="file" accept="image/png,image/jpeg"></label><div class="field-grid">${field("Label width", "label.width", p.label.width, "number", 'step=".05"')}${field("Label height", "label.height", p.label.height, "number", 'step=".05"')}${field("Label position", "label.y", p.label.y, "number", 'step=".05"')}</div>` : ""}<details class="divider"><summary>Selected part finish</summary><label>Part<select id="part-name">${(p.kind === "bottle" ? ["Body", "Cap"] : p.kind === "sofa" ? ["Base", "Seats", "Back", "Arms", "Legs"] : ["Body"]).map((n) => option(n, partKey(selectedPart))).join("")}</select></label><label>Material<select id="part-type">${["glass", "satin", "metal", "ceramic", "fabric"].map((n) => option(n, (p.parts?.[partKey(selectedPart)] || p.material).type)).join("")}</select></label><label>Color<input id="part-color" type="color" value="${(p.parts?.[partKey(selectedPart)] || p.material).color}"></label><label>Roughness<input id="part-roughness" type="number" min="0" max="1" step=".05" value="${(p.parts?.[partKey(selectedPart)] || p.material).roughness}"></label><button type="button" id="apply-part">Apply part finish</button></details></details><details class="edit-section"><summary>Price & product information</summary><div class="field-grid">${field("Price", "facts.price", p.facts.price, "number", 'min="0" step=".01"')}${field("Currency", "facts.currency", p.facts.currency, "text")}${["freeform","assembly"].includes(p.kind) ? "" : field(p.kind === "bottle" ? "Capacity · ml" : "Seating capacity", p.kind === "bottle" ? "facts.capacityMl" : "facts.seating", p.kind === "bottle" ? p.facts.capacityMl : p.facts.seating, "number", 'min="1"')}${field("Size label", "facts.sizeLabel", p.facts.sizeLabel, "text")}</div></details><button type="submit">Apply changes</button></form></div><div class="bottom-grid"><section class="panel"><div class="row"><h2>Saved designs</h2><div class="actions"><button id="add-design">+ Design</button><button id="to-shelf" ${selection.size ? "" : "disabled"}>Open shop →</button></div></div><div class="variant-list">${variantCards()}</div></section><section class="panel"><h2>Edit with AI</h2><div id="chat-log" class="chat-log">${log.length ? log.map((m) => `<div class="chat-message ${m.role}">${esc(m.text)}</div>`).join("") : "<p>Ask for a design review, or describe a change.</p>"}</div><div id="design-recommendation"></div><form id="chat-form" class="chat-form"><textarea id="chat-input" aria-label="Describe a product change" placeholder="What would you change?" required></textarea><button class="primary" type="submit">Send</button></form><small>${config.ai ? "AI edits the draft. Send to shelf when it feels right." : "AI editing needs an OpenAI or Claude key on the server."}</small></section></div>`,
  );
  document.querySelector("main").classList.add("design-page");
  const lowerPanels = $(".bottom-grid"), assistant = lowerPanels.lastElementChild;
  assistant.classList.add("assistant-panel");
  const side = document.createElement("aside");
  side.className = "design-sidebar";
  const manual = document.createElement("details");
  manual.className = "manual-controls";
  manual.innerHTML = '<summary>Edit manually <span>Dimensions, shape & finish</span></summary>';
  manual.open = manualControlsOpen;
  manual.ontoggle = () => { manualControlsOpen = manual.open; };
  manual.append($("#properties"));
  side.append(assistant, manual);
  $(".workspace").append(side);
  lowerPanels.classList.add("saved-designs");
  $("#chat-input").placeholder = "Describe a change…";
  const subtitle = document.createElement("p");
  subtitle.className = "assistant-subtitle";
  subtitle.textContent = "Describe it. See it take shape.";
  assistant.querySelector("h2").after(subtitle);
  const hint = document.createElement("div");
  hint.className = "orbit-hint";
  hint.textContent = "Drag to rotate · Scroll to zoom";
  $("#viewport").append(hint);
  all(".edit-section").forEach(section => {
    const key = section.querySelector("summary").textContent;
    section.open = openEditSections.has(key);
    section.ontoggle = () => section.open ? openEditSections.add(key) : openEditSections.delete(key);
  });
  $("#chat-log").scrollTop = $("#chat-log").scrollHeight;
  $("#part-name").onchange = (e) => {
    selectedPart = e.target.value;
    const m = p.parts?.[selectedPart] || p.material;
    $("#part-type").value = m.type;
    $("#part-color").value = m.color;
    $("#part-roughness").value = m.roughness;
  };
  bind("#apply-part", async () => {
    const key = $("#part-name").value;
    await call("editDesign", {
      id: d.id,
      baseRevision: d.revision,
      changes: JSON.stringify([
        {
          field: "parts." + key,
          value: {
            type: $("#part-type").value,
            color: $("#part-color").value,
            roughness: Number($("#part-roughness").value),
            metalness: $("#part-type").value === "metal" ? 0.9 : 0,
          },
        },
      ]),
      origin: "studio-part",
      operationId: uuid(),
    });
    busy = false;
    render();
  });
  $("#draft-select").onchange = (e) => {
    designId = e.target.value;
    busy = false;
    render();
  };
  view = studioViewer($("#viewport"), [p], {
    onSelect: (name) => {
      selectedPart = name;
      $("#selected-part").textContent = name;
      const key = partKey(name);
      if ([...$("#part-name").options].some((o) => o.value === key)) {
        $("#part-name").value = key;
        $("#part-name").dispatchEvent(new Event("change"));
      }
    },
    artworkUrls: assetURLs,
  });
  loadArtwork(p);
  all("[data-view]").forEach(
    (b) => (b.onclick = () => view.view(b.dataset.view)),
  );
  let measure = false;
  bind("#dimensions", () => view.dimensions((measure = !measure)));
  $("#lighting").onchange = (e) => view.setLighting(e.target.value);
  $("#properties").onsubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    busy = true;
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    pendingEdit = act(async () => {
      try {
        const data = new FormData(form),
          changes = [];
        for (const [key, raw] of data) {
          const [s, k] = key.split(".");
          if (!EDIT_FIELDS.includes(key)) continue;
          let value = raw;
          if (key.startsWith("dimensions.")) value = Number(raw) / 100;
          else if (["shape.profile","shape.components"].includes(key)) value = JSON.parse(raw);
          else if (
            ["seatHeight", "armWidth", "backHeight", "legHeight"].includes(k)
          )
            value = Number(raw) / 100;
          else if (
            typeof p[s]?.[k] === "number" ||
            ["facts.price", "facts.capacityMl", "facts.seating"].includes(key)
          )
            value = raw === "" ? null : Number(raw);
          else if (key === "scale.confirmed") value = true;
          if (JSON.stringify(value) !== JSON.stringify(p[s]?.[k]))
            changes.push({ field: key, value });
        }
        if (!data.has("scale.confirmed") && p.scale.confirmed)
          changes.push({ field: "scale.confirmed", value: false });
        if (changes.length) {
          const next = applyChanges(p, changes);
          try {
            await call("editDesign", {
              id: d.id,
              baseRevision: d.revision,
              changes: JSON.stringify(changes),
              origin: "studio",
              operationId: uuid(),
            });
          } catch (error) {
            if (!error.message.includes("CONFLICT")) throw error;
            modal(
              "This design changed elsewhere",
              '<p>Your edits are still here. Choose how to continue.</p><label>Resolve<select name="resolution"><option value="duplicate">Duplicate my edited draft</option><option value="reload">Reload the latest shared draft</option></select></label>',
              async (f) => {
                busy = false;
                if (f.get("resolution") === "duplicate")
                  await createDesign(p.kind, JSON.stringify(next));
                else render();
              },
            );
            return;
          }
          toast("Product updated. Figma will follow while the plugin is open.");
        }
        draftDirty = false;
        busy = false;
        render();
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  };
  $("#properties").oninput = () => {
    busy = true;
    draftDirty = true;
  };
  $("#artwork")?.addEventListener("change", (e) =>
    act(async () => {
      const f = e.target.files[0];
      if (!f) return;
      const assetId = await uploadAsset(project().id, f, f.type);
      await call("editDesign", {
        id: d.id,
        baseRevision: d.revision,
        changes: JSON.stringify([{ field: "label.assetId", value: assetId }]),
        origin: "artwork",
        operationId: uuid(),
      });
      busy = false;
    }),
  );

  bind("#duplicate", () => createDesign(p.kind, JSON.stringify(p)));
  bind("#add-design", () =>
    modal(
      "Create a product",
      '<label>Template<select name="kind"><option value="bottle">Bottle</option><option value="sofa">Sofa</option></select></label>',
      (f) => createDesign(f.get("kind")),
    ),
  );
  bind("#save-version", async () => {
    await pendingEdit;
    if (draftDirty)
      throw Error("Apply your product changes before sending to shelf.");
    const latest = design(),
      snapshot = JSON.parse(latest.document);
    modal(
      "Send to shelf",
      `<label>Name<input name="name" value="${esc(snapshot.facts.name)} ${versions().length + 1}" required></label>`,
      async (f) => {
        busy = true;
        try {
          const existing = versions().find(v => v.designId === latest.id && v.revision === latest.revision);
          const id = existing?.id || uuid();
          if (!existing) await call("saveVersion", {
            id,
            designId: latest.id,
            baseRevision: latest.revision,
            name: f.get("name"),
          });
          selection.add(id);
          await placeOnShelf(latest.projectId,id,latest.document);
          tab = "store";
          render();
          toast("Added to your shop. Preparing its preview…");
          await ensureVersionPreview({
            id,
            projectId: latest.projectId,
            document: latest.document,
          });
          toast("Added to your shop. Preview ready.");
        } catch (e) {
          toast("Model saved on your shelf. Preview is not ready: " + e.message + " Use Retry preview on its card.");
        } finally {
          busy = false;
          render();
        }
      },
      "Send to shelf",
    );
  });
  bind("#undo", () =>
    call("undoDesign", {
      id: d.id,
      baseRevision: d.revision,
      targetRevision: undoTarget(d) ?? 0,
      operationId: uuid(),
    }),
  );
  bind("#to-shelf", () => {
    tab = "store";
    render();
  });
  bindVariants();
  bindRecommendation($("#design-recommendation"),()=>p,()=>view.capture(),$("#chat-input"));
  $("#chat-form").onsubmit = (e) => {
    e.preventDefault();
    const prompt = $("#chat-input").value.trim();
    if (!prompt) return;
    const operationId = uuid();
    chat.push({ role: "user", text: prompt, designId: d.id, operationId });
    const button = e.target.querySelector("button");
    button.disabled = true;
    button.textContent = "Editing…";
    $("#chat-log").insertAdjacentHTML("beforeend", `<div class="chat-message user">${esc(prompt)}</div><div class="chat-message" role="status">Updating your 3D design…</div>`);
    $("#chat-log").scrollTop = $("#chat-log").scrollHeight;
    busy = true;
    act(async () => {
      try {
        const result = await api("/api/ai/edit", {
          projectId: project().id,
          designId: d.id,
          baseRevision: d.revision,
          prompt,
          selectedPart,
          view: view.capture(),
          operationId,
        });
        chat.push({
          role: "assistant",
          designId: d.id,
          operationId,
          text: result.changes ? "Applied to 3D. " + result.explanation : result.clarification,
        });
      } catch (err) {
        chat.push({
          role: "assistant",
          text: err.message,
          designId: d.id,
          operationId,
        });
      } finally {
        busy = false;
        render();
      }
    });
  };
}
async function loadArtwork(p) {
  if (!p.label.assetId || assetURLs[p.label.assetId]) return;
  try {
    assetURLs[p.label.assetId] = await artworkUrl(p.label.assetId);
    if (["design", "shelf", "store"].includes(tab) && !busy) render();
  } catch (e) {
    toast(e.message);
  }
}
const thumbnailRequests = new Set();
let thumbnailQueue=Promise.resolve();
const previewPlaceholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="320"><rect width="400" height="320" fill="#e8e6e1"/><text x="200" y="160" text-anchor="middle" fill="#6d7269" font-family="sans-serif" font-size="16">Preparing preview…</text></svg>');
function thumbnailUrl(id) {
 if(assetURLs[id]||thumbnailRequests.has(id))return;
 thumbnailRequests.add(id);
 thumbnailQueue=thumbnailQueue.then(async()=>{
  const v=versions().find(v=>v.id+'-thumb'===id);if(!v)return;
  try{
   if(rows('myAssets').some(a=>a.id===id)){
    try{const url=await artworkUrl(id);const probe=new Image();probe.src=url;await probe.decode();assetURLs[id]=url;}catch{delete assetURLs[id];}
   }
   if(!assetURLs[id]){
    const bytes=await thumbnailProduct(JSON.parse(v.document));
    assetURLs[id]=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
   }
   for(const img of all(`[data-thumbnail="${id}"]`))img.src=assetURLs[id];
  }catch(e){console.warn('Preview unavailable',e);for(const img of all(`[data-thumbnail="${id}"]`))img.alt='Preview unavailable — open the design to inspect it';}
 });
}
function variantCards() {
  const list = versions();
  return list.length
    ? list
        .map((v) => {
          const p = JSON.parse(v.document);
          thumbnailUrl(v.id + "-thumb");
          return `<article class="variant ${selection.has(v.id) ? "selected" : ""}" data-version="${v.id}"><input type="checkbox" aria-label="Select ${esc(v.name)}" value="${v.id}" ${selection.has(v.id) ? "checked" : ""}><img data-thumbnail="${v.id}-thumb" class="variant-thumbnail" alt="${esc(v.name)} 3D preview" ${assetURLs[v.id + "-thumb"] ? `src="${assetURLs[v.id + "-thumb"]}"` : `src="${previewPlaceholder}"`}><strong>${esc(v.name)}</strong><small>${price(p)}</small><button data-open-version="${v.id}" class="circle-control card-edit" aria-label="Edit a copy of ${esc(v.name)}" title="Edit a copy">${icon("edit")}</button></article>`;
        })
        .join("")
    : '<div class="empty">Open a design and click Send to shelf to start your collection.</div>';
}
function bindVariants() {
  for(const img of all('[data-thumbnail]'))img.onerror=()=>{
    const id=img.dataset.thumbnail;
    img.onerror=null;img.src=previewPlaceholder;
    delete assetURLs[id];thumbnailRequests.delete(id);
    thumbnailUrl(id);
  };

  all("[data-retry-files]").forEach(b=>b.onclick=()=>act(async()=>{
    b.disabled=true;
    try {const v=versions().find(v=>v.id===b.dataset.retryFiles);await ensureVersionPreview(v,toast);toast("Preview ready. You can publish this model.");}
    finally {render();}
  }));
  all("[data-version] input").forEach(
    (i) =>
      (i.onchange = () => {
        i.checked ? selection.add(i.value) : selection.delete(i.value);
        i.closest(".variant").classList.toggle("selected", i.checked);
        params.set('versions',[...selection].join(','));history.replaceState(null,'','/studio?'+params);
        const b = $("#to-shelf");
        if (b) b.disabled = !selection.size;
      }),
  );
  all("[data-open-version]").forEach(
    (b) =>
      (b.onclick = () =>
        act(() => {
          const v = versions().find((v) => v.id === b.dataset.openVersion);
          return createDesign(JSON.parse(v.document).kind, v.document);
        })),
  );
}
const ensureExports = ensureVersionAssets;

function shelf() {
  const chosen = versions().filter((v) => selection.has(v.id));
  chosen.forEach((v) => loadArtwork(JSON.parse(v.document)));
  shell(
    `<div class="heading"><div><div class="eyebrow">03 / See what belongs together</div><h1>A little shelf perspective.</h1><p>Compare the same physical scale under different retail lighting.</p></div><div class="actions"><button id="edit-store">Arrange in a store →</button><button id="publish-shelf" class="primary" ${chosen.length ? "" : "disabled"}>Publish selected directions</button></div></div><div class="canvas-card"><div id="viewport" class="viewport"></div><div class="canvas-tools"><label>Lighting <select id="lighting">${["daylight", "warm", "cool"].map((v) => option(v, "daylight")).join("")}</select></label><span class="dimension-label">${chosen.length} selected · actual relative dimensions</span></div></div><div class="panel" style="margin-top:22px"><h2>Choose your directions</h2><div class="variant-list">${variantCards()}</div><button id="refresh-shelf" style="margin-top:15px">Update comparison</button></div>`,
  );
  if (chosen.length)
    view = studioViewer(
      $("#viewport"),
      chosen.map((v) => JSON.parse(v.document)),
      { shelf: true, artworkUrls: assetURLs },
    );
  else
    $("#viewport").innerHTML =
      '<div class="empty">Select saved directions below to compare.</div>';
  $("#lighting").onchange = (e) => view?.setLighting(e.target.value);
  bindVariants();
  bind("#refresh-shelf", render);
  bind("#edit-store", () => {
    tab = "store";
    render();
  });
  bind("#publish-shelf", publish);
}
let publishing=false;
async function publish() {
  if(publishing)return;
  const chosen = versions().filter((v) => selection.has(v.id));
  if (!chosen.length) throw Error("Select at least one saved direction.");
  if (chosen.some((v) => JSON.parse(v.document).facts.price === null))
    throw Error(
      "Each direction needs a listed price. Open a copy, set its price, and save it.",
    );
  publishing=true;busy = true;
  const publishButton=$('#publish-store')||$('#publish-shelf');
  if(publishButton){publishButton.disabled=true;publishButton.textContent='Publishing…';}
  toast("Publishing your shop…");
  try {
    // Store rendering uses saved product geometry; AR exports must not block publication.
    const currentLayout=layout(),savedLayout=currentLayout?JSON.parse(currentLayout.document):null;
    if(currentLayout&&!savedLayout.placements.length&&chosen.every(v=>isHandheld(JSON.parse(v.document)))){
      await call('saveLayout',{projectId:project().id,baseRevision:currentLayout.revision,document:JSON.stringify(ioannaLayout(chosen.map(v=>v.id))),operationId:uuid()});
    }
    const id = uuid();
    await call("publishStore", {
      id,
      projectId: project().id,
      versionIds: chosen.map((v) => v.id),
      name: project().name,
    });
    showStoreEmbed(id);

  } finally {
    publishing=false;busy = false;
    if(publishButton){publishButton.disabled=false;publishButton.textContent='Publish store';}
  }
}
function showStoreEmbed(id) {
  const url=`${location.origin}/store/${encodeURIComponent(id)}`;
  const code=`<div data-kalpi-store="${id}"></div><script async src="${location.origin}/embed.js"></script>`;
  modal("Your store is ready",`<p>Paste this code into a custom HTML block on your website. Customers can walk around, inspect products, and vote here.</p><label>Embed code<textarea id="store-embed-code" readonly rows="3">${esc(code)}</textarea></label><button type="button" id="copy-store-embed">Copy embed code</button><p id="embed-copy-status" role="status"></p><label>Customer link<input readonly value="${url}"></label><a href="/store/${id}" target="_blank" rel="noopener">Visit your store ↗</a>`,()=>{});
  $("#copy-store-embed").onclick=async()=>{try{await navigator.clipboard.writeText(code);$("#embed-copy-status").textContent="Copied. Paste into your website’s custom HTML block.";}catch{$("#store-embed-code").select();$("#embed-copy-status").textContent="Select and copy the code above.";}};
}
function builder() {
  versions().forEach((v) => loadArtwork(JSON.parse(v.document)));
  const l = layout(),
    data = l ? JSON.parse(l.document) : defaultLayout();
  if(!selection.size&&!params.has('versions'))for(const p of data.placements)selection.add(p.versionId);
  shell(
    `<div class="heading"><div><h1>Your shop</h1></div><div class="actions"><button id="publish-store" class="primary">Publish store</button></div></div><div class="workspace"><div class="canvas-card"><div id="store-preview" class="viewport" style="height:660px"></div><p class="canvas-tools">Walk: W A S D or arrow keys · Right-drag to look · Click a product to edit a copy</p></div><form id="layout-form" class="panel inspector"><h2>Atmosphere</h2><label>Setting<select name="presentation">${option("shelf",data.presentation||"shelf")}${option("boutique",data.presentation||"shelf")}</select></label><div class="shelf-palettes">${SHELF_PRESETS.map(p=>`<button type="button" data-palette="${p.id}" aria-pressed="${data.palette===p.id}" style="--swatch:${p.background};--swatch2:${p.shelf}"><span></span>${p.name}</button>`).join('')}</div><div class="field-grid">${field('Background / walls','wallColor',data.wallColor,'color')}${field('Shelf','shelfColor',data.shelfColor||data.floorColor,'color')}${field('Floor','floorColor',data.floorColor,'color')}</div><label>Lighting<select name="lighting">${["daylight", "warm", "cool"].map(v=>option(v,data.lighting)).join('')}</select></label><button class="primary" type="submit">Save layout</button></form></div><div class="panel" style="margin-top:22px"><h2>Products to publish</h2><div class="variant-list">${variantCards()}</div></div>`,
  );
  view = storeViewer(
    $("#store-preview"),
    {
      layout: data,
      versions: versions().map((v) => ({
        ...v,
        document: JSON.parse(v.document),
      })),
    },
    { artworkUrls: assetURLs, walking:true, onInspect:v=>inspectDraftProduct(v) },
  );
  bindVariants();
  $("#layout-form").oninput = () => {
    busy = true;
  };
  const save = async (d) => {
    await call("saveLayout", {
      projectId: project().id,
      baseRevision: l.revision,
      document: JSON.stringify(d),
      operationId: uuid(),
    });
    busy = false;
    render();
  };
  all('[data-palette]').forEach(button=>button.onclick=()=>act(async()=>{
    const chosen=versions().filter(v=>selection.has(v.id));
    if(chosen.some(v=>!isHandheld(JSON.parse(v.document))))throw Error('Shelf palettes are for handheld products.');
    button.disabled=true;
    try{const next=shelfLayout(chosen.map(v=>v.id),button.dataset.palette);next.presentation=$("#layout-form").elements.presentation.value;next.shelfColor=next.floorColor;await save(next);}finally{button.disabled=false;}
  }));
  $("#layout-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      next = clone(data);
    for (const [key, v] of f) {
      const parts = key.split(".");
      if (parts.length === 3) {
        next[parts[0] === "fixture" ? "fixtures" : "placements"][
          Number(parts[1])
        ][parts[2]] = Number(v);
      } else next[key] = ["width", "depth"].includes(key) ? Number(v) : v;
    }
    if(next.shelfColor&&!/^#[0-9a-f]{6}$/i.test(next.shelfColor))throw Error('Choose a valid shelf colour.');
    // Editing room geometry switches to the custom layout renderer; source presets
    // have fixed fixture geometry and must not leave invisible collision volumes.
    if(next.scene==='ioanna'){
      const structural=['width','depth','style','wallColor','floorColor','fixtures'];
      if(structural.some(k=>JSON.stringify(next[k])!==JSON.stringify(data[k])))delete next.scene;
    }
    act(() => save(next));
  };
  bind("#publish-store", publish);
}
function results() {
  const pubs = rows("myPublications").filter(
      (p) => p.projectId === project().id,
    ),
    votes = rows("myVotes").filter((v) => v.projectId === project().id),
    people = new Set(votes.map((v) => v.identity.toHexString())).size;
  shell(
    `<div class="heading"><div><div class="eyebrow">05 / Listen before you launch</div><h1>What would they choose?</h1><p>Responses reflect the exact design and price each customer saw.</p></div></div><div class="stats">${[
      ["People who responded", people],
      ["Product responses", votes.length],
      ["Would consider buying", votes.filter((v) => v.intent === "yes").length],
    ]
      .map(
        ([n, v]) =>
          `<div class="panel"><small>${n}</small><div class="stat">${v}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="panel"><h2>Published studies</h2>${pubs.map((p) => `<div class="row divider"><div><h3>${esc(p.name)}</h3><small>${p.published ? "Open for responses" : "Unpublished"}</small></div><div class="actions"><a href="/store/${p.id}" target="_blank">Open store ↗</a>${p.published ? `<button data-store-embed="${p.id}">Embed code</button><button data-unpublish="${p.id}">Unpublish</button>` : ""}</div></div>`).join("") || "<p>Publish a store or shelf to begin collecting responses.</p>"}</div><div class="panel" style="margin-top:22px;overflow:auto"><h2>Purchase intent</h2><table class="results-table"><thead><tr><th>Direction</th><th>Listed price</th><th>Yes</th><th>No</th><th>Unsure</th><th>Preferred</th></tr></thead><tbody>${pubs
      .flatMap((p) =>
        JSON.parse(p.snapshot).versions.map((v) => {
          const group = votes.filter(
            (x) => x.publicationId === p.id && x.versionId === v.id,
          );
          return `<tr><td>${esc(v.name)}</td><td>${price(v.document)}</td>${["yes", "no", "unsure"].map((i) => `<td>${group.filter((x) => x.intent === i).length}</td>`).join("")}<td>${group.filter((x) => x.preferred).length}</td></tr>`;
        }),
      )
      .join(
        "",
      )}</tbody></table><p style="margin-top:18px"><small>These are expressions of interest, not orders or sales. Anonymous identities reduce duplicate responses within a browser; they do not verify a unique person.</small></p></div><div class="panel" style="margin-top:22px"><h2>In their words</h2>${
      votes
        .filter((v) => v.comment)
        .map((v) => `<p class="chat-message">${esc(v.comment)}</p>`)
        .join("") || "<p>Customer comments will appear here.</p>"
    }</div>`,
  );
  all("[data-store-embed]").forEach(b=>b.onclick=()=>showStoreEmbed(b.dataset.storeEmbed));
  all("[data-unpublish]").forEach(
    (b) =>
      (b.onclick = () =>
        act(() => call("unpublishStore", { id: b.dataset.unpublish }))),
  );
}
function comparison() {
  const available=designs();
  if(available.length<2){shell('<h1>Compare designs</h1><p>Create two designs to compare their geometry and materials.</p>');return;}
  const before=available.find(d=>d.id===params.get('before'))||available[0];
  const after=available.find(d=>d.id===params.get('after'))||available.find(d=>d.id!==before.id);
  const pair=[before,after],documents=pair.map(d=>JSON.parse(d.document));
  shell(`<div class="heading"><div><div class="eyebrow">Design comparison</div><h1>See the difference.</h1><p>Same lighting, linked camera, real 3D models. Drag either view to inspect both.</p></div><label>Lighting<select id="compare-light">${['daylight','warm','cool'].map(n=>option(n,'daylight')).join('')}</select></label></div><div class="comparison-grid">${pair.map((d,i)=>`<section class="canvas-card"><div style="padding:20px"><h2>${i?'After':'Before'}</h2><select aria-label="${i?'After':'Before'} design" data-compare-select="${i?'after':'before'}">${available.map(a=>`<option value="${esc(a.id)}" ${a.id===d.id?'selected':''}>${esc(JSON.parse(a.document).facts.name)}</option>`).join('')}</select><p class="muted">${esc(dims(documents[i]))}</p></div><div id="compare-${i}" class="compare-viewport"></div><div style="padding:20px"><p>${esc(documents[i].reconstruction?.summary||'Editable structured geometry')}</p><button data-compare-edit="${d.id}">Edit this design</button></div></section>`).join('')}</div><p class="muted">Generated geometry and unseen surfaces are estimates. A generated mesh supports finish, size and artwork edits; it does not retain the original parametric shape controls.</p>`);
  let a,b,linking=false;
  const sync=other=>state=>{if(linking||!other())return;linking=true;try{other().syncCamera(state);}finally{linking=false;}};
  a=studioViewer($('#compare-0'),[documents[0]],{artworkUrls:assetURLs,onCameraChange:sync(()=>b)});
  b=studioViewer($('#compare-1'),[documents[1]],{artworkUrls:assetURLs,onCameraChange:sync(()=>a)});
  view={dispose(){a.dispose();b.dispose();}};
  $('#compare-light').onchange=e=>{a.setLighting(e.target.value);b.setLighting(e.target.value);};
  all('[data-compare-select]').forEach(e=>e.onchange=()=>{params.set(e.dataset.compareSelect,e.value);params.set('tab','compare');params.set('project',projectId);history.replaceState(null,'','/studio?'+params);render();});
  all('[data-compare-edit]').forEach(e=>e.onclick=()=>{designId=e.dataset.compareEdit;tab='design';render();});
  for(const p of documents)if(p.label.assetId&&!assetURLs[p.label.assetId])artworkUrl(p.label.assetId).then(url=>{assetURLs[p.label.assetId]=url;if(tab==='compare')render();}).catch(e=>toast(e.message));
}
function render() {
  draftDirty = false;
  busy = false;
  if (publicationId) return renderStore();
  if (!project()) return intro();
  params.set('project',project().id);
  params.set('tab',tab);
  if(design())params.set('design',design().id);else params.delete('design');
  history.replaceState(null,'','/studio?'+params.toString());
  if (tab === "connect") return setup();
  (({ design: studio, shelf: builder, store: builder, results, compare: comparison })[tab] || studio)();
}
function renderStore() {
  const pub = rows("publishedStores").find((p) => p.id === publicationId);
  if (!pub) {
    shell(
      '<div class="empty"><h1>This store is unavailable.</h1><p>It may have been unpublished by its creator.</p></div>',
    );
    return;
  }
  const snapshot = JSON.parse(pub.snapshot);
  productInspection?.dispose();productInspection=null;
  view?.dispose();
  let latestPosition = {
      x: 0,
      z: Math.min(3, snapshot.layout.depth / 2 - 0.6),
      yaw: 0,
    },
    movementSequence = 0,
    sendingMovement = false,
    sessionDisposed = false,
    retryJoinAt = 0,
    lastMovementAt = 0,
    lastPosition = "",
    joiningRoom;
  const ensureJoined = async () => {
    if (roomJoined || sessionDisposed) return;
    if (joiningRoom) return joiningRoom;
    retryJoinAt = Date.now() + 5000;
    joiningRoom = call("joinRoom", {
      roomId,
      publicationId,
      name:
        storage.getItem("kalpi-visitor-name") ||
        "Visitor " + identity().slice(-4),
    })
      .then(() => {
        if (sessionDisposed) return;
        roomJoined = true;
        movementSequence = 0;
        latestPosition = {
          x: 0,
          z: Math.min(3, snapshot.layout.depth / 2 - 0.6),
          yaw: 0,
        };
        view?.resetPosition?.();
        update();
      })
      .finally(() => {
        joiningRoom = null;
      });
    return joiningRoom;
  };
  const sendMovement = async () => {
    if (sessionDisposed || sendingMovement) return;
    sendingMovement = true;
    try {
      if (!roomJoined) {
        if (Date.now() >= retryJoinAt) await ensureJoined();
        return;
      }
      const position = JSON.stringify(latestPosition);
      if (position === lastPosition && Date.now() - lastMovementAt < 1000)
        return;
      await call("moveVisitor", {
        roomId,
        ...latestPosition,
        sequence: ++movementSequence,
      });
      lastPosition = position;
      lastMovementAt = Date.now();
    } catch (error) {
      if (String(error.message).includes("Join the room first")) {
        roomJoined = false;
        retryJoinAt = 0;
      }
    } finally {
      sendingMovement = false;
    }
  };
  app.innerHTML = `<header class="topbar">${params.get("embed") === "1" ? "" : '<a class="brand" href="/">kalpi<span>✳</span></a>'}<span>${esc(pub.name)}</span><span class="status" id="visitor-count">Joining store…</span><button id="visitor-name">Your name</button><button id="share-room">Invite someone</button><button id="product-list">Browse products</button></header><main class="page" style="padding-top:16px"><div class="store-shell"><div id="store-view" class="store-viewport"></div><aside id="product-sheet" class="product-sheet" hidden></aside><div class="walk-controls"><span id="held-status" role="status"></span><button id="walk">Look around</button><button data-move="KeyW" aria-label="Walk forward">↑</button><button data-move="KeyA" aria-label="Walk left">←</button><button data-move="KeyS" aria-label="Walk backward">↓</button><button data-move="KeyD" aria-label="Walk right">→</button><button id="return-product" hidden>Return product</button></div><div class="room-info">WASD to walk · click a product to inspect<br>Right-drag to look · Esc releases the mouse</div></div></main>`;
  view = storeViewer($("#store-view"), snapshot, {
    walking: true,
    identity: identity(),
    artworkUrls: Object.fromEntries(
      snapshot.versions
        .filter((v) => v.document.label.assetId)
        .map((v) => [
          v.document.label.assetId,
          `/api/assets/${v.document.label.assetId}?publication=${pub.id}`,
        ]),
    ),
    onInspect: (v, id) => {
      inspection = { version: v, instanceId: id };
      inspectProduct(pub, v, id);
    },
    onMove: (data) => {
      latestPosition = { x: data.x, z: data.z, yaw: data.yaw };
      const el = $("#store-view");
      if (el) el.dataset.position = JSON.stringify({ x: data.x, z: data.z });
    },
  });
  // Keep leases and room presence alive when requestAnimationFrame is paused.
  // A suspended browser may still expire; the next heartbeat rejoins safely.
  const heartbeat = setInterval(sendMovement, 100);
  const resume = () => {
    if (!document.hidden) {
      retryJoinAt = 0;
      void sendMovement();
    }
  };
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("pageshow", resume);
  const disposeViewer = view.dispose.bind(view);
  view.dispose = () => {
    sessionDisposed = true;
    clearInterval(heartbeat);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("pageshow", resume);
    disposeViewer();
  };
  bind("#visitor-name", () =>
    modal(
      "Your name in this store",
      `<label>Display name<input name="name" maxlength="32" value="${esc(storage.getItem("kalpi-visitor-name") || "Visitor " + identity().slice(-4))}" required></label>`,
      async (f) => {
        storage.setItem("kalpi-visitor-name", f.get("name"));
        await call("releaseProduct", { roomId });
        roomJoined = false;
        renderStore();
      },
    ),
  );
  bind("#walk", () => view.enterWalk());
  bind("#return-product", () => call("releaseProduct", { roomId }));
  bind("#share-room", async () => {
    const link = `${location.origin}/store/${pub.id}?room=${roomId}`;
    await navigator.clipboard.writeText(link);
    toast("Shared-room link copied.");
  });
  bind("#product-list", () => {
    productInspection?.dispose();productInspection=null;
    const sheet = $("#product-sheet");
    sheet.classList.remove("spatial-inspection");
    sheet.hidden = false;
    sheet.innerHTML = `<button class="close" id="close-sheet">×</button><h2>Explore the collection</h2>${snapshot.versions.map((v) => `<div class="divider"><h3>${esc(v.name)}</h3><p>${price(v.document)}</p><button data-inspect="${v.id}">Inspect</button></div>`).join("")}`;
    bind("#close-sheet", () => (sheet.hidden = true));
    all("[data-inspect]").forEach(
      (b) =>
        (b.onclick = () => {
          const v = snapshot.versions.find((v) => v.id === b.dataset.inspect),
            p = snapshot.layout.placements.filter(p=>p.versionId===v.id).sort((a,b)=>Math.hypot(a.x-latestPosition.x,a.z-latestPosition.z)-Math.hypot(b.x-latestPosition.x,b.z-latestPosition.z))[0];
          inspectProduct(pub, v, p?.id);
        }),
    );
  });
  all("[data-move]").forEach((b) => {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      view.moveKey(b.dataset.move, true);
    };
    b.onpointerup = () => view.moveKey(b.dataset.move, false);
    b.onpointercancel = b.onpointerup;
  });
  if (!roomJoined) act(ensureJoined);
  else update();
}
function arrangeInspection(sheet){
  sheet.classList.add('spatial-inspection');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Product inspection');
  const preview=sheet.querySelector('#product-closeup'),side=document.createElement('section');side.className='spatial-sidebar';
  for(const child of [...sheet.children])if(child!==preview)side.append(child);
  const stage=document.createElement('section');stage.className='spatial-stage';stage.append(preview);
  const hint=document.createElement('p');hint.textContent='Drag to rotate · Scroll to zoom';hint.className='spatial-hint';stage.append(hint);sheet.replaceChildren(stage,side);
  const directions=document.createElement('div');directions.className='inspection-directions';directions.setAttribute('aria-label','Viewing directions');
  directions.innerHTML=['front','side','top','bottom'].map(n=>`<button type="button" data-direction="${n}">${n==='bottom'?'Underneath':n[0].toUpperCase()+n.slice(1)}</button>`).join('')+'<button type="button" id="spin-model" aria-pressed="true">Rotate slowly</button>';
  side.querySelector('.inspection-heading').after(directions);
  directions.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>{productInspection?.view(b.dataset.direction);directions.querySelector('#spin-model').setAttribute('aria-pressed','false');});
  directions.querySelector('#spin-model').onclick=e=>{const on=e.target.getAttribute('aria-pressed')!=='true';productInspection?.setAutoRotate(on);e.target.setAttribute('aria-pressed',String(on));};
}
function bindRecommendation(host,getProduct,capture,input){
 host.innerHTML='<button type="button" class="recommend-button">Suggest an improvement</button><p class="recommendation-text" role="status" hidden></p><button type="button" class="use-recommendation" hidden>Use this suggestion</button>';
 const button=host.querySelector('.recommend-button'),text=host.querySelector('p'),use=host.querySelector('.use-recommendation');
 let suggestion='',reviewed='';
 button.onclick=async()=>{
  button.disabled=true;button.textContent='Reviewing this product…';text.hidden=false;text.textContent='Looking at the form, finish and visual hierarchy…';use.hidden=true;
  const currentProduct=clone(getProduct());
  try{const result=await api('/api/ai/recommend',{projectId:project().id,document:currentProduct,view:capture()});
   suggestion=result.explanation||result.clarification||'No supported improvement was identified.';reviewed=JSON.stringify(currentProduct);text.textContent=suggestion;use.hidden=!result.changes;
  }catch(err){text.textContent=err.message;}finally{button.disabled=false;button.textContent='Review this product';}
 };
 use.onclick=()=>{if(JSON.stringify(getProduct())!==reviewed){text.textContent='The product has changed. Review it again for an up-to-date suggestion.';use.hidden=true;return;}input.value=suggestion;input.focus();};
}
function inspectDraftProduct(v){
  if(document.pointerLockElement)document.exitPointerLock();
  document.querySelector('#draft-inspection')?.remove();productInspection?.dispose();
  let doc=clone(v.document),draftId=null,revision=0;
  const editHistory=[];
  const sheet=document.createElement('aside');sheet.id='draft-inspection';sheet.className='product-sheet';document.body.append(sheet);busy=true;
  sheet.innerHTML=`<header class="inspection-heading"><div><h2>${esc(v.name.replace(/ · Sample price$/,''))}</h2><p>${dims(doc)}</p></div><button class="circle-control" id="close-draft" aria-label="Close product">${icon('close')}</button></header><div id="product-closeup" class="inspection-preview"></div><div id="shop-recommendation"></div><form id="shop-edit-form"><label for="shop-edit-prompt">What would you change?</label><textarea id="shop-edit-prompt" required maxlength="4000" placeholder="Describe what you’d like to change"></textarea><button class="primary" type="submit">Apply change</button></form><p id="shop-edit-status" role="status">Edits create a working copy. The saved shelf version stays unchanged.</p><button id="undo-shop-edit" type="button" disabled>↶ Undo last edit</button><button id="open-edited-design" hidden>Open edited design</button>`;
  const redraw=()=>{productInspection?.dispose();productInspection=studioViewer(sheet.querySelector('#product-closeup'),[doc],{reveal:true,autoRotate:true,artworkUrls:assetURLs});};
  redraw();arrangeInspection(sheet);openInspection(sheet);
  bindRecommendation(sheet.querySelector("#shop-recommendation"),()=>doc,()=>productInspection.capture(),sheet.querySelector("#shop-edit-prompt"));
  sheet.querySelector('#close-draft').onclick=async()=>{await closeInspection(sheet);sheet.remove();busy=false;render();};
  sheet.querySelector('#shop-edit-form').onsubmit=async e=>{
    e.preventDefault();const button=e.target.querySelector('button'),status=sheet.querySelector('#shop-edit-status');button.disabled=true;sheet.querySelector('#close-draft').disabled=true;status.textContent='Applying your change…';sheet.querySelector('#undo-shop-edit').disabled=true;
    try{
      if(!draftId){draftId=uuid();await call('createDesign',{id:draftId,projectId:project().id,kind:doc.kind,document:JSON.stringify(doc)});}
      const result=await api('/api/ai/edit',{projectId:project().id,designId:draftId,baseRevision:revision,prompt:sheet.querySelector('#shop-edit-prompt').value.trim(),selectedPart:'Body',view:productInspection.capture(),operationId:uuid()});
      if(result.changes){editHistory.push({document:clone(doc),revision});doc=applyChanges(doc,result.changes);revision++;redraw();status.textContent=result.explanation||'Updated your working copy.';}else status.textContent=result.clarification||'Please describe the change in more detail.';
      sheet.querySelector('#open-edited-design').hidden=false;
    }catch(err){status.textContent=err.message;}finally{button.disabled=false;sheet.querySelector('#close-draft').disabled=false;sheet.querySelector('#undo-shop-edit').disabled=!editHistory.length;}
  };
  sheet.querySelector('#undo-shop-edit').onclick=async()=>{
    const previous=editHistory.at(-1);if(!previous||!draftId)return;
    const undo=sheet.querySelector('#undo-shop-edit'),apply=sheet.querySelector('#shop-edit-form button'),close=sheet.querySelector('#close-draft'),status=sheet.querySelector('#shop-edit-status');
    undo.disabled=apply.disabled=close.disabled=true;status.textContent='Undoing…';
    try{await call('undoDesign',{id:draftId,baseRevision:revision,targetRevision:previous.revision,operationId:uuid()});doc=clone(previous.document);revision++;editHistory.pop();redraw();status.textContent='Last edit undone. Your shelf is unchanged.';}
    catch(err){status.textContent=err.message;}
    finally{undo.disabled=!editHistory.length;apply.disabled=close.disabled=false;}
  };
  sheet.querySelector('#open-edited-design').onclick=()=>{sheet.remove();productInspection?.dispose();productInspection=null;busy=false;designId=draftId;tab='design';render();};
}
function openInspection(sheet) {
  view?.setInspecting?.(true);
  sheet.getAnimations().forEach(a=>a.cancel());
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  sheet.animate([{opacity:0,transform:sheet.classList.contains('spatial-inspection')?'translate(calc(-50% + 28px),calc(-50% + 18px)) scale(.94)':'translate3d(28px,18px,0) scale(.94)'},{opacity:1,transform:sheet.classList.contains('spatial-inspection')?'translate(-50%,-50%) scale(1)':'translate3d(0,0,0) scale(1)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
}
async function closeInspection(sheet) {
  sheet.getAnimations().forEach(a=>a.cancel());
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    try{await sheet.animate([{opacity:1,transform:sheet.classList.contains('spatial-inspection')?'translate(-50%,-50%) scale(1)':'translateY(0) scale(1)'},{opacity:0,transform:sheet.classList.contains('spatial-inspection')?'translate(-50%,calc(-50% + 12px)) scale(.97)':'translateY(12px) scale(.97)'}],{duration:180,easing:'ease-in',fill:'forwards'}).finished;}catch{return;}
  }
  view?.setInspecting?.(false);
  sheet.hidden=true;sheet.getAnimations().forEach(a=>a.cancel());
  productInspection?.dispose();productInspection=null;
}
function inspectProduct(pub, v, instanceId) {
  if (document.pointerLockElement) document.exitPointerLock();
  const p = v.document,
    sheet = $("#product-sheet");
  productInspection?.dispose();productInspection=null;
  sheet.hidden = false;
  const prior = rows("myVotes").find(
    (x) =>
      x.publicationId === pub.id &&
      x.versionId === v.id &&
      x.identity.toHexString() === identity(),
  );
  const holding=rows('roomHolds').some(h=>h.instanceId===instanceId&&h.holder.toHexString()===identity());
  const name=v.name.replace(/\s*·\s*Sample price$/i,'');
  sheet.scrollTop=0;
  sheet.innerHTML = `<header class="inspection-heading"><div><h2>${esc(name)}</h2><p>${price(p)}${/Sample price/i.test(v.name)?'<span class="sample-label">Sample price</span>':''}</p></div><button class="circle-control" id="close-sheet" aria-label="Close product" title="Close">${icon('close')}</button></header>
  <div id="product-closeup" class="inspection-preview"></div>
  <p class="product-dimensions">${dims(p)}</p>
  <div class="inspection-tools" role="group" aria-label="Product actions">${isHandheld(p)&&instanceId?`<button class="circle-control" id="pickup" ${holding?'hidden':''} aria-label="Pick up product" title="Pick up">${icon('hand')}</button><button class="circle-control" id="ask-shopkeeper" ${holding?'hidden':''} aria-label="Ask shopkeeper to bring product" title="Ask shopkeeper to bring it">${icon('bell')}</button>`:''}<a class="circle-control" href="/ar/${pub.id}/${v.id}" target="_blank" aria-label="View in your space" title="View in your space">${icon('cube')}</a></div>
  <label id="hand-rotation" ${holding?'':'hidden'}>Rotate in hand<input id="turn-product" type="range" min="-3.14" max="3.14" step=".02" value="0"></label>
  <section class="purchase-question" aria-label="Purchase intent"><p>Would you consider buying this?</p><div class="vote-options"><button type="button" data-intent="yes" aria-pressed="${prior?.intent==='yes'}">Yes, I would</button><button type="button" data-intent="no" aria-pressed="${prior?.intent==='no'}">No, I wouldn’t</button></div><small id="quick-vote-status" role="status">${prior?'Response saved. You can change it.':'At the listed price. No purchase is made.'}</small></section>`;
  productInspection=studioViewer($("#product-closeup"),[p],{reveal:true,autoRotate:true,artworkUrls:p.label.assetId?{[p.label.assetId]:`/api/assets/${p.label.assetId}?publication=${pub.id}`}:{}});
  arrangeInspection(sheet);
  openInspection(sheet);
  bind("#close-sheet", () => closeInspection(sheet));
  bind("#pickup", () => call("pickUp", { roomId, instanceId }));
  bind("#ask-shopkeeper", async () => {
    const button=$("#ask-shopkeeper");button.disabled=true;
    try{
      await call("requestAssistance",{roomId,instanceId});
      sheet.hidden=true;view?.setInspecting?.(false);
      toast("The shopkeeper is bringing your product…");
      await view.deliverProduct(instanceId);
      if(rows("roomHolds").some(h=>h.instanceId===instanceId&&h.holder.toHexString()===identity()))inspectProduct(pub,v,instanceId);
    }catch(e){button.disabled=false;throw e;}
  });
  $("#turn-product")?.addEventListener("input", (e) =>
    view.rotateHeld(Number(e.target.value)),
  );
  for(const button of sheet.querySelectorAll('[data-intent]'))button.onclick=async()=>{
    const buttons=[...sheet.querySelectorAll('[data-intent]')],status=sheet.querySelector('#quick-vote-status');
    buttons.forEach(b=>b.disabled=true);status.textContent='Saving…';
    try{
      const current=rows('myVotes').find(x=>x.publicationId===pub.id&&x.versionId===v.id&&x.identity.toHexString()===identity());
      await call('castVote',{publicationId:pub.id,versionId:v.id,intent:button.dataset.intent,preferred:current?.preferred||false,comment:current?.comment||''});
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));

      status.textContent='Response saved. You can change your answer.';
    }catch(e){status.textContent='Could not save. Please try again.';console.error(e);}
    finally{buttons.forEach(b=>b.disabled=false);}
  };
}

window.addEventListener("keydown",e=>{if(e.key==='Escape'){const button=$("#close-draft")||$("#product-sheet:not([hidden]) #close-sheet");if(button&&!button.disabled)button.click();}});
window.addEventListener("pagehide", () => {
  if (roomJoined) call("leaveRoom", { roomId }).catch(() => {});
});
(async () => {
  try {
    config = await getConfig();
    if (location.pathname === "/auth/start") {
      await redirectCreatorSignIn(config);
      return;
    }
    await connect((name) => {
      status = name === "offline" ? "Reconnecting…" : "Live · SpacetimeDB";
      if (name === "offline" && publicationId) {
        roomJoined = false;
        view?.moveKey?.("KeyW", false);
        return;
      }
      if (name === "reconnected" && publicationId) {
        roomJoined = false;
        renderStore();
        return;
      }
      if (["roomVisitors", "roomHolds"].includes(name) && publicationId) {
        update();
        return;
      }
      if (
        name === "publishedStores" &&
        publicationId &&
        !rows("publishedStores").some((p) => p.id === publicationId)
      ) {
        roomJoined = false;
        renderStore();
        return;
      }
      update();
    }, publicationId ? {tokenKey:"kalpi-visitor-token"} : {});
    creator = await creatorUser();
    render();
  } catch (e) {
    app.innerHTML = `<main class="page"><a class="brand" href="/">kalpi<span>✳</span></a><section class="intro"><div><div class="eyebrow">Your next chapter</div><h1>A connected studio<br>for what comes next.</h1><p>Figma, 3D design, shared stores, and customer insight—in one place.</p></div><div class="panel"><h2>Connection needed</h2><p>${esc(e.message)}</p><button class="primary" onclick="location.reload()">Retry connection</button>${publicationId?'':'<button id="reconnect-creator">Reconnect sign-in</button>'}</div></section></main>`;
    bind('#reconnect-creator',()=>signIn());
  }
})();
