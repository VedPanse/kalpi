import {createFalPanel} from './fal-plugin.js';
import {studioViewer} from './render.js';
import {validateProduct} from '../shared/product.js';
import {MODEL_CATALOG} from '../shared/model-catalog.js';
import {libraryProduct} from '../shared/library-product.js';
import {mountPluginStudio} from "./plugin-studio.js";
import {storage, appURL} from "./runtime.js";
const nativeFigma = !!globalThis.__KALPI_NATIVE_URL__;
const panelLocation = new URL(globalThis.__KALPI_NATIVE_URL__ || location.href);
import { importFigmaSelection } from "./figma-import.js";
import { connect, rows, call, uuid, api, credential } from "./client.js";
import { uploadAsset } from "./assets.js";
let pluginEditor=null, renderedDesignIds="";
function showEditor(id){selected=rows("myDesigns").find(d=>d.id===id)||selected;render();}
const falPanel=createFalPanel({api,project:()=>activeProject,onComplete:async job=>{
 const design=await waitForDesign(job.designId);
 send({type:'link-generated-model',boardId:job.boardId,designId:job.designId});
 selected=design;showEditor(design.id);
}});
let boardReadTimer = null, recognitionMessage = "";
let conversionStarted = 0, conversionReport = null;
let selectionKey = null, viewCreationTimer = null, pendingViews = null;
let inspected = null, converting = false, recognizing = false, bottleJob = null, pluginProtocol = 0;
let selected = null,
  lastRevision = "",
  connected = false,
  work = Promise.resolve(),
  dirty = false,
  pendingChange = null;
const root = document.querySelector("#plugin"),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const directFigma = new URLSearchParams(panelLocation.search).get("host") === "figma";
const pluginId = new URLSearchParams(panelLocation.search).get("pluginId") || "kalpi-local-development";
const sessionURL = () => panelLocation.origin + "/plugin.html?project=" + encodeURIComponent(activeProject);
const send = (m) => parent.postMessage(nativeFigma ? {pluginMessage:m} : directFigma ? {pluginMessage:m, pluginId} : m, !nativeFigma && directFigma ? "https://www.figma.com" : "*");
function pluginMessage(event) {
  if (nativeFigma && globalThis.__KALPI_BRIDGE_ID__) {
    const m = event.data?.pluginMessage;
    return m?.bridgeId === globalThis.__KALPI_BRIDGE_ID__ ? m : null;
  }
  if (event.source !== parent && !((directFigma || nativeFigma) && event.source === null && ["https://www.figma.com", "null", ""].includes(event.origin))) return null;
  return directFigma || nativeFigma ? event.data?.pluginMessage : event.data;
}
let activeProject =
  new URLSearchParams(panelLocation.search).get("project") ||
  storage.getItem("kalpi-plugin-project");
const current = () => rows("myDesigns").find((d) => d.id === selected?.id);
function status(s) {
  const n = document.querySelector("#sync");
  if (n) n.textContent = s;
}
function render() {
  pluginEditor?.dispose();pluginEditor=null;
  const memberships = rows("myProjects");
  const projects = memberships.filter((p) => p.id === activeProject);
  if (!projects.length && memberships[0]) projects.push(memberships[0]);
  activeProject = projects[0]?.id;
  if (activeProject)
    storage.setItem("kalpi-plugin-project", activeProject);
  const designs = rows("myDesigns").filter(
    (d) => d.projectId === activeProject,
  );
  renderedDesignIds = designs.map(d=>d.id).sort().join(",");
  selected = designs.find((d) => d.id === selected?.id) || null;
  root.innerHTML = `<a class="brand" href="#">kalpi<span>✳</span></a><button id="change-workspace" class="ghost">Connect another workspace</button><p id="sync">${dirty ? "Local edits need synchronization" : "Connected to " + esc(projects[0]?.name || "your workspace")}</p><div id="plugin-update"></div><section><h2>Turn your design into 3D</h2><p id="selected-board" role="status"></p><p>Turn the main product on your board into a textured 3D model with fal. Review the price before generating.</p><button id="recognize-bottle" class="primary full-width">Convert to 3D ↗</button><p id="recognition-status" role="status"></p><div id="fal-controls"></div><p id="fal-status" role="status"></p><small>Generated geometry and PBR textures · dimensions are estimates you can edit.</small></section><details class="divider"><summary>Vector extrusion & selected-layer conversion</summary><section><h2>Your current Figma design</h2><div id="selection-summary"></div><button id="inspect-selection" class="ghost">Refresh selection</button><div id="selection-size"></div><button id="convert-selection" class="primary full-width">Convert this design to 3D ↗</button><p><small>Vector artwork becomes an extruded 3D preview. Unseen surfaces are not reconstructed. Physical size and depth are estimates unless provided in the design.</small></p></section></details><details class="divider"><summary>Saved products, starter templates & sync tools</summary><label>Product<select id="design-select"><option value="">Choose a saved design</option>${designs.map((d) => `<option value="${d.id}" ${d.id === selected?.id ? "selected" : ""}>${esc(JSON.parse(d.document).facts.name)} · r${d.revision}</option>`).join("")}</select></label><div class="actions" style="margin:15px 0"><button id="bottle">+ Bottle</button><button id="sofa">+ Sofa</button></div><button id="template" class="full-width">Insert editable template</button><button id="convert" class="primary full-width" style="margin:12px 0">Convert to 3D ↗</button><div class="actions"><button id="retry">Retry sync</button><button id="duplicate">Duplicate local edits</button></div><button id="restore" class="full-width ghost">Reload saved design into Figma</button><p class="divider">Supported: symmetric straight bottle outlines, front-frame dimensions, the body/back color, and artwork. Set depth and other parts below or in the studio. Unsupported paths preserve the last saved 3D model.</p>${["width", "height", "depth"].map((k) => `<label>${k} · cm<input id="${k}" type="number" step=".1" value="${selected ? JSON.parse(selected.document).dimensions[k] * 100 : ""}"></label>`).join("")}<button id="dimensions" style="margin:12px 0">Update dimensions</button><p><small>Keep this plugin open for synchronization. Unsent Figma edits remain in the file when you close it.</small></p></details>`;
  const library=document.createElement('details');library.style.marginTop='20px';library.innerHTML=`<summary>Choose a detailed product</summary><p>Ioanna’s models · Add your Figma label, edit the finish, then send to shelf.</p><div class="actions">${MODEL_CATALOG.filter(m=>!m.source).map(m=>`<button data-library="${m.id}">${esc(m.name)}</button>`).join('')}</div><label>Graza photo models<select id="graza-model">${MODEL_CATALOG.filter(m=>m.source==='graza-photo').map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label><button id="open-graza" data-library="graza-drizzle">Open in 3D</button>`;root.append(library);
  library.querySelector('#graza-model').onchange=e=>{library.querySelector('#open-graza').dataset.library=e.target.value;};
  library.querySelectorAll('[data-library]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const p=libraryProduct(b.dataset.library),id=uuid();await call('createDesign',{id,projectId:activeProject,kind:p.kind,document:JSON.stringify(p)});showEditor(id);}catch(e){status(e.message);b.disabled=false;}});
  const create=document.createElement('details');create.className='divider';create.innerHTML=`<summary>Create packaging with AI</summary><p>Make a new editable concept. Shape and color edits sync to native Figma layers.</p><label>Packaging<select id="packaging-family"><option value="bottle">Bottle / jar</option><option value="carton">Carton / box</option></select></label><label>Describe your packaging<textarea id="packaging-brief" placeholder="A square-based amber glass perfume bottle, with soft shoulders and a black cap"></textarea></label>${selected?'<label><input type="checkbox" id="packaging-source"> Use this design’s dimensions, product details and label</label>':''}<button id="create-packaging" class="primary">Create editable packaging</button><p id="packaging-status" role="status"></p>`;
  root.append(create);
  create.querySelector('#create-packaging').onclick=async()=>{
    const button=create.querySelector('button'),note=create.querySelector('#packaging-status'),prompt=create.querySelector('textarea').value.trim();
    if(!prompt){note.textContent='Describe the shape and finish you want.';return;}
    button.disabled=true;note.textContent='Creating your editable 3D packaging…';
    try{
      const result=await api('/api/ai/packaging',{projectId:activeProject,family:create.querySelector('select').value,prompt,sourceDesignId:create.querySelector('#packaging-source')?.checked?selected?.id:undefined,operationId:uuid()});
      if(!result.designId){note.textContent=result.clarification;return;}
      const design=await waitForDesign(result.designId);showEditor(design.id);send({type:'create-template',design});
    }catch(e){note.textContent=e.message;}finally{button.disabled=false;}
  };
  renderSelection();
  falPanel.mount();
  recognitionStatus(recognitionMessage);
  document.querySelector("#recognize-bottle").disabled=recognizing;
  document.querySelector("#recognize-bottle").onclick=()=>{
    if(recognizing) return;
    recognizing=true;conversionStarted=performance.now();
    document.querySelector("#recognize-bottle").disabled=true;
    recognitionStatus("Reading your whole design board…");
    clearTimeout(boardReadTimer);
    boardReadTimer = setTimeout(() => {
      recognitionStatus("Figma did not respond. Close and reopen Kalpi, then try Convert to 3D again. If this repeats, update the installed plugin using the download below.");
      const notice=document.querySelector("#plugin-update");
      if(notice) notice.innerHTML=`<p><a href="${appURL("/kalpi-figma-plugin.zip?version=native-8")}" target="_blank">Download updated plugin</a></p>`;
      finishRecognition();
    }, 20000);
    send({type:"read-product-board",forceImage:true});
  };
  document.querySelector("#inspect-selection").onclick = () => send({ type: "inspect-selection" });
  document.querySelector("#convert-selection").onclick = () => {
    if (converting) return;
    if (!inspected) return status("Select the product object or frame in Figma first.");
    const dimensions = Object.fromEntries(["width", "height", "depth"].map(k => [k, Number(document.querySelector("#selection-" + k).value)/100]));
    if (Object.values(dimensions).some(n => !Number.isFinite(n) || n < .005 || n > 10)) return status("Dimensions must be between 0.5 and 1,000 cm.");
    if (inspected.linked && selected && JSON.parse(selected.document).kind !== "freeform") {
      queue(async () => {
        if (dirty) throw Error("Sync your pending Figma edits before changing dimensions.");
        const d = current(), p = JSON.parse(d.document);
        const changes = Object.entries(dimensions).filter(([k,v]) => v !== p.dimensions[k]).map(([k,value]) => ({ field: "dimensions."+k, value }));
        if (p.kind === "sofa" && dimensions.height !== p.dimensions.height) changes.push({field:"shape.backHeight",value:dimensions.height-p.shape.seatHeight});
        if (changes.length) {
          await call("editDesign", {id:d.id,baseRevision:d.revision,changes:JSON.stringify(changes),origin:"figma-panel",operationId:uuid()});
          send({type:"prepare-convert",design:current()});
        } else send({type:"convert"});
      }); return;
    }
    converting = true;
    document.querySelector("#convert-selection").disabled = true;
    status("Reading selected Figma artwork…");
    send({ type: "export-selection", nodeId: inspected.nodeId, dimensions, source: inspected.source });
  };
  document.querySelector("#change-workspace").onclick = () =>
    send({ type: "reset-panel" });
  document.querySelector("#design-select").onchange = (e) => {
    selected = designs.find((d) => d.id === e.target.value);
    lastRevision = "";
    render();
    sync();
  };
  for (const kind of ["bottle", "sofa"])
    document.querySelector("#" + kind).onclick = () =>
      queue(async () => {
        if (!projects.length) throw Error("Pair with a project first.");
        const id = uuid();
        await call("createDesign", {
          id,
          projectId: projects[0].id,
          kind,
          document: "",
        });
        selected = rows("myDesigns").find((d) => d.id === id);
        dirty = false;
        render();
        send({ type: "create-template", design: selected });
      });
  document.querySelector("#template").onclick = () =>
    selected && send({ type: "create-template", design: selected });
  document.querySelector("#restore").onclick = () => {
    dirty = false;
    pendingChange = null;
    lastRevision = "";
    if (current()) send({ type: "restore-template", design: current() });
  };
  document.querySelector("#convert").onclick = () => send({ type: "convert" });
  document.querySelector("#retry").onclick = () => send({ type: "retry" });
  document.querySelector("#duplicate").onclick = () =>
    queue(async () => {
      if (!pendingChange)
        throw Error("Retry sync first to read the local edits.");
      const d = current(),
        p = pendingChange.document;
      const id = uuid();
      await call("createDesign", {
        id,
        projectId: d.projectId,
        kind: p.kind,
        document: JSON.stringify(p),
      });
      selected = rows("myDesigns").find((d) => d.id === id);
      dirty = false;
      send({ type: "duplicate-template", design: selected });
      render();
    });
  document.querySelector("#dimensions").onclick = () =>
    queue(async () => {
      if (!current()) return;
      if (dirty) throw Error("Sync or duplicate the local edits first.");
      const d = current(),
        changes = ["width", "height", "depth"].map((k) => ({
          field: "dimensions." + k,
          value: Number(document.querySelector("#" + k).value) / 100,
        })),
        p = JSON.parse(d.document);
      if (p.kind === "sofa")
        changes.push({
          field: "shape.backHeight",
          value: changes[1].value - p.shape.seatHeight,
        });
      await call("editDesign", {
        id: d.id,
        baseRevision: d.revision,
        changes: JSON.stringify(changes),
        origin: "figma-panel",
        operationId: uuid(),
      });
    });
  if(selected){
    const tools=document.createElement('details');tools.style.marginTop='20px';
    const summary=document.createElement('summary');summary.textContent='Convert another design · Connection & sync';tools.append(summary);
    while(root.firstChild)tools.append(root.firstChild);
    const editor=document.createElement('section');root.append(editor,create,library,tools);
    pluginEditor=mountPluginStudio(editor,{design:current()||selected,send,origin:panelLocation.origin,isPending:()=>dirty||recognizing,select:id=>showEditor(id)});
    if(conversionReport?.id===selected.id){const report=document.createElement('p');report.className='muted';report.textContent=conversionReport.text;editor.prepend(report);}
  }

}
async function waitForDesign(id){
 for(let i=0;i<100;i++){const d=rows('myDesigns').find(d=>d.id===id);if(d)return d;await new Promise(r=>setTimeout(r,100));}
 throw Error('Your design was saved. Reopen the panel to load it.');
}
function recognitionStatus(message) {
  recognitionMessage = message;
  const node=document.querySelector("#recognition-status");
  if(node) node.textContent=message;
}
function finishRecognition() {
  clearTimeout(boardReadTimer);
  recognizing=false;
  const button=document.querySelector("#recognize-bottle");
  if(button) button.disabled=false;
}
async function boardImage(bytes) {
  const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:"image/png"}));
  const canvas=document.createElement("canvas");
  canvas.width=bitmap.width; canvas.height=bitmap.height;
  const ctx=canvas.getContext("2d"); ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);bitmap.close();
  const view=canvas.toDataURL("image/jpeg",.82);
  if(view.length>1400000) throw Error("This board image is too large. Zoom into a smaller design board.");
  return view;
}
async function saveRecognizedBottle(bytes) {
  const job=bottleJob;
  if(!job?.response?.document) throw Error("Read the board again first.");
  const p=job.response.document;
  if(bytes && !job.assetId) job.assetId=await uploadAsset(activeProject,new Uint8Array(bytes),"image/png");
  if(job.assetId) p.label.assetId=job.assetId;
  p.figma={fileUrl:rows("myProjects").find(p=>p.id===activeProject)?.figmaUrl||"",nodeId:job.response.productNodeId||job.response.bottleNodeId||job.boardId};
  await call("createDesign",{id:job.id,projectId:activeProject,kind:p.kind,document:JSON.stringify(p)});
  selected=await waitForDesign(job.id);
  dirty=false; lastRevision=selected.id+":"+selected.revision;
  const design = selected;
  conversionReport={id:design.id,text:job.response.cacheHit ? 'Reused an unchanged board’s previous concept. No new AI generation.' : 'Approximate concept'+(Number.isFinite(job.response.generation?.durationMs)?' · AI processing: '+(job.response.generation.durationMs/1000).toFixed(1)+' seconds.':'.')+' Not photorealistic reconstruction.'};
  finishRecognition();
  showEditor(design.id);
  pendingViews = design.id;
  const notice = () => document.querySelector('#figma-sync-status');
  if (notice()) notice().textContent = '3D saved. Adding editable Figma views…';
  clearTimeout(viewCreationTimer);
  viewCreationTimer = setTimeout(() => {
    if (pendingViews !== design.id) return;
    if (notice()) notice().textContent = 'Your 3D model is saved and ready to edit. Figma has not finished the 2D views. Use Create editable Figma views to retry; no new conversion is needed.';
  }, 15000);
  send({type:"create-recognized-product",boardId:job.boardId,labelNodeId:job.response.labelNodeId,design});
}
async function handleBottleBoard(m) {
  clearTimeout(boardReadTimer);
  if (!recognizing) return;
  recognitionStatus('');
  try { await falPanel.quote(m,await boardImage(m.bytes)); }
  finally { finishRecognition(); }
}
function renderSelection() {
  const board = document.querySelector('#selected-board');
  if (board) board.textContent = inspected ? 'Selected: ' + inspected.name : 'Select a product board in Figma to begin.';
  const summary = document.querySelector("#selection-summary");
  if (!summary) return;
  summary.innerHTML = inspected ? `<strong>${esc(inspected.name)}</strong><p>${esc(inspected.source)}</p>` : '<p>Select the product object or frame on your Figma canvas. If the page contains just one object, Kalpi uses it automatically.</p>';
  document.querySelector("#selection-size").innerHTML = inspected ? ["width", "height", "depth"].map(k => `<label>${k[0].toUpperCase()+k.slice(1)} · cm<input id="selection-${k}" type="number" min="0.5" max="1000" step="0.01" value="${+(inspected.dimensions[k]*100).toFixed(2)}"></label>`).join("") : "";
  document.querySelector("#convert-selection").disabled = !inspected || converting;
}
function sync() {
  if (!connected) return;
  const designIds = rows("myDesigns").filter(d=>d.projectId===activeProject).map(d=>d.id).sort().join(",");
  if (designIds !== renderedDesignIds && !dirty) render();
  const d = current();
  if (d) {
    selected = d;
    pluginEditor?.update?.(d);
    if (lastRevision !== d.id + ":" + d.revision && !dirty) {
      lastRevision = d.id + ":" + d.revision;
      send({ type: "remote-design", design: d });
      status("Synced · revision " + d.revision);
    }
  }
}
function queue(fn) {
  work = work.then(fn).catch((e) => {
    dirty = true;
    status(e.message + " Use Retry, Reload, or Duplicate.");
  });
  return work;
}
window.addEventListener("message", (e) => {
  const m = pluginMessage(e);
  if (!m) return;
  if (m.type === "plugin-ready") {
    pluginProtocol=m.protocol||0;
    const button=document.querySelector("#recognize-bottle");
    if(button) button.disabled=recognizing;
  }
  if (m.type === "plugin-ready" && m.protocol !== 8) {
    const notice = document.querySelector("#plugin-update");
    if (notice) notice.innerHTML = `<p>This installed plugin has an update available for remembering your connection between sessions. <a href="${appURL("/kalpi-figma-plugin.zip?version=native-8")}" target="_blank">Download the updated plugin</a>, unzip it, and import its manifest.json in Figma. Then reopen Kalpi.</p>`;
  }
  if (m.type === 'structured-preview') {
    try {
      const p=validateProduct(m.document);
      finishRecognition();pluginEditor?.dispose();pluginEditor=null;
      root.innerHTML='<h2>Live 3D preview</h2><p id="sync" role="status">Rendering your structured Figma layers…</p><div id="local-preview" style="height:460px"></div><button id="preview-back">Back to saved design</button>';
      const view=studioViewer(document.querySelector('#local-preview'),[p]);pluginEditor={dispose:()=>view.dispose()};
      document.querySelector('#preview-back').onclick=()=>showEditor(m.designId);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const ms=Math.round(performance.now()-(conversionStarted||performance.now()));
        const el=document.querySelector('#local-preview');if(el){el.dataset.previewMs=String(Math.max(0,ms));status('Local preview · saving your edits. No AI generation was used.');}
      }));
    } catch(error){finishRecognition();recognitionStatus(error.message);}
  }
  if (m.type === "bottle-board") handleBottleBoard(m).catch(e=>{recognitionStatus(e.message);finishRecognition();});
  if (m.type === "bottle-label") saveRecognizedBottle(m.bytes).catch(e=>{recognitionStatus(e.message);finishRecognition();});
  if (m.type === "recognized-bottle-ready" && bottleJob?.id===m.designId) {
    finishRecognition();
    clearTimeout(viewCreationTimer); pendingViews = null;
    if (selected?.id !== m.designId) showEditor(m.designId);
    const note = document.querySelector('#figma-sync-status');
    if (note) note.textContent = 'Editable Figma views are ready.';
  }
  if (m.type === "selection-preview") {
    inspected = m.selection;
    const nextKey = inspected ? inspected.nodeId + ':' + (inspected.designId || '') : '';
    if (nextKey !== selectionKey && !recognizing && !converting) {
      selectionKey = nextKey;
      selected = inspected ? rows('myDesigns').find(d => d.id === inspected.designId || (d.projectId === activeProject && JSON.parse(d.document).figma?.nodeId === inspected.nodeId)) || null : null;
      if (selected) activeProject = selected.projectId;
      lastRevision = '';
      dirty = false;
      if (connected) { render(); sync(); }
    } else renderSelection();
  }
  if (m.type === "selection-export") queue(async () => {
    if (!activeProject) throw Error("Connect a workspace first.");
    const p = importFigmaSelection(m.snapshot, m.snapshot.dimensions);
    const old = m.designId ? rows("myDesigns").find(d => d.id === m.designId) : null;
    if (m.designId && !old) throw Error("This layer belongs to another workspace. Connect that workspace first.");
    let id = old?.id || uuid();
    if (old) {
      if (old.revision !== m.baseRevision) throw Error("The website changed this design. Review it before replacing its outlines.");
      const changes = [ { field: "shape.outlines", value: p.shape.outlines }, ...["width", "height", "depth"].map(k => ({ field: "dimensions."+k, value: p.dimensions[k] })) ];
      await call("editDesign", { id, baseRevision: old.revision, changes: JSON.stringify(changes), origin: "figma", operationId: uuid() });
    } else {
      p.figma.fileUrl = rows("myProjects").find(p => p.id === activeProject)?.figmaUrl || "";
      await call("createDesign", { id, projectId: activeProject, kind: p.kind, document: JSON.stringify(p) });
    }
    selected = rows("myDesigns").find(d => d.id === id);
    dirty = false; lastRevision = id + ":" + selected.revision;
    send({ type: "import-linked", design: selected, nodeId: m.snapshot.nodeId, fingerprint: m.fingerprint });
    showEditor(id);
    render(); status("Converted from your selected artwork. Review estimated size in the studio.");
  }).finally(() => { converting = false; renderSelection(); });
  if (m.type === "sync-error" && m.operation === 'create-recognized-product') {
    clearTimeout(viewCreationTimer); pendingViews = null;
    const note = document.querySelector('#figma-sync-status');
    if (note) note.textContent = 'Your 3D model is saved. Figma views could not finish: ' + m.message + ' Use Create editable Figma views to retry.';
    return;
  }
  if (m.type === "sync-error") {
    converting = false; renderSelection();
    if(recognizing) { recognitionStatus(m.message); finishRecognition(); }
    dirty = true;
    status(m.message);
  }
  if (m.type === "sync-pending") {
    dirty = true;
    status("Figma changes pending…");
  }
  if (m.type === "selected-design") {
    selected = rows("myDesigns").find((d) => d.id === m.designId) || null;
    if (selected) activeProject = selected.projectId;
    dirty = m.pending === true;
    render();
    sync();
  }
  if (m.type === "template-applied") {
    dirty = false;
    status("Figma updated · revision " + m.revision);
  }
  if (m.type === "figma-change") {
    dirty = true;
    pendingChange = m;
    queue(async () => {
      const d = rows("myDesigns").find((d) => d.id === m.designId);
      if (!d) throw Error("Select a connected product template.");
      const retryKey = "kalpi-pending-edit:" + d.id,
        prior = JSON.parse(storage.getItem(retryKey) || "null");
      if (prior?.fingerprint === m.fingerprint) {
        await call("editDesign", prior.args);
        const latest = rows("myDesigns").find((x) => x.id === d.id);
        dirty = false;
        pendingChange = null;
        storage.removeItem(retryKey);
        send({ type: "sync-ack", design: latest, fingerprint: m.fingerprint });
        if (latest.revision > prior.args.baseRevision + 1)
          send({ type: "remote-design", design: latest });
        status("Synced · revision " + latest.revision);
        if (m.convert)
          showEditor(d.id);
        return;
      }
      if (d.revision !== m.baseRevision)
        throw Error(
          "CONFLICT: The website changed this design. Reload it or duplicate your local edits.",
        );
      let changes = [...m.changes];
      if (m.bytes) {
        const bytes = new Uint8Array(m.bytes),
          digest = globalThis.crypto?.subtle ? Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          )
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("") : null,
          key = "kalpi-artwork:" + d.id;
        const cached = JSON.parse(storage.getItem(key) || "null");
        let assetId =
          digest && cached?.digest === digest &&
          rows("myAssets").some((a) => a.id === cached.id)
            ? cached.id
            : null;
        if (!assetId) {
          assetId = await uploadAsset(d.projectId, bytes, "image/png");
          storage.setItem(key, JSON.stringify({ digest, id: assetId }));
        }
        if (JSON.parse(d.document).label.assetId !== assetId)
          changes.push({ field: "label.assetId", value: assetId });
      }
      if (changes.length) {
        m.operationId ??= uuid();
        const args = {
          id: d.id,
          baseRevision: d.revision,
          changes: JSON.stringify(changes),
          origin: "figma",
          operationId: m.operationId,
        };
        storage.setItem(
          retryKey,
          JSON.stringify({ fingerprint: m.fingerprint, args }),
        );
        await call("editDesign", args);
        storage.removeItem(retryKey);
      }
      const latest = rows("myDesigns").find((x) => x.id === d.id);
      dirty = false;
      pendingChange = null;
      lastRevision = d.id + ":" + latest.revision;
      send({ type: "sync-ack", design: latest, fingerprint: m.fingerprint });
      status("Synced · revision " + latest.revision);
      if (m.convert)
        showEditor(d.id);
    });
  }
});
(async () => {
  try {
    root.innerHTML = `<h2>Opening Kalpi…</h2><p role="status">Restoring your saved connection…</p>`;
    const restoredToken = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { window.removeEventListener("message", receive); if(nativeFigma) reject(Error("Figma did not return your saved connection. Retry to restore it; no new pairing link is needed.")); else resolve(null); }, nativeFigma ? 8000 : 1200);
      function receive(event) {
        const message = pluginMessage(event);
        if (message?.type !== "studio-session") return;
        clearTimeout(timer); window.removeEventListener("message", receive);
        resolve(message.token || null);
      }
      window.addEventListener("message", receive);
      send({type:"restore-studio-session", url:sessionURL()});
    });
    root.innerHTML = `<h2>Opening Kalpi…</h2><p role="status">Connecting to your workspace…</p>`;
    await connect(
      (name) => {
        if (name === "offline") {
          status("Disconnected. Your Figma edits remain pending.");
          return;
        }
        sync();
      },
      { tokenKey: "kalpi-plugin-token", token:restoredToken, onToken:token=>{if(connected)send({type:"save-studio-session",url:sessionURL(),token});} },
    );
    const code = panelLocation.hash.slice(1);
    if (code) {
      await call("redeemPairing", { code });
      if (!nativeFigma) history.replaceState({}, "", panelLocation.pathname + panelLocation.search);
    }
    activeProject ||= rows("myProjects")[0]?.id;
    if (!rows("myProjects").some(p => p.id === activeProject))
      throw Error("This workspace is no longer connected. Use Connect Figma in Kalpi to pair it again.");
    send({type:"save-studio-session", url:sessionURL(), token:credential()});
    connected = true;
    render();
    send({ type: "ready" });
    sync();
  } catch (e) {
    root.innerHTML = `<h2>Connect your Kalpi studio</h2><p>${esc(e.message)}</p><button id="reconnect">Retry saved connection</button><details><summary>Connect using a pairing link</summary><p>In Kalpi, choose Connect Figma → Create pairing link. This device will remember the connection.</p><label>Pairing link<input id="new-pairing-link" type="url"></label><button id="pair-workspace">Connect workspace</button><p id="pairing-error" role="status"></p></details>`;
    document.querySelector("#reconnect").onclick=()=>nativeFigma ? send({type:"launch-native",url:sessionURL()}) : location.reload();
    document.querySelector("#pair-workspace").onclick=()=>{
      try {
        const u=new URL(document.querySelector("#new-pairing-link").value);
        if(u.origin!==panelLocation.origin || u.pathname!=="/plugin.html" || !u.searchParams.get("project") || !u.hash)throw Error("Use the full pairing link from this Kalpi studio.");
        if(directFigma){u.searchParams.set("host","figma");u.searchParams.set("pluginId",pluginId);}
        if(nativeFigma) send({type:"launch-native",url:u.href}); else location.replace(u.href);
      }catch(error){document.querySelector("#pairing-error").textContent=error.message;}
    };
  }
})();
