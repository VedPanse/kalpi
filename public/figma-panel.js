import { viewer } from './viewer.js';

const $ = selector => document.querySelector(selector);
let token = sessionStorage.getItem('kalpi-token');
let state, png, sourceReference, dispose, previewUrl;
let color = '#87916b', roughness = .3;
let revision = 0, lastSavedSignature = '', requestKey = '', requestSignature = '';
let busy = false, connected = false, pendingLabel = null, uploadedAsset = null, artworkFingerprint = '', incoming = 0;
const selected = new Set();
const tellFigma = message => { if (window.parent !== window) window.parent.postMessage(message, '*'); };
function status(message, error = false) {
  $('#plugin-status').textContent = message;
  $('#sync-dot').style.background = error ? '#b88a55' : '#728561';
}
async function api(path, body) {
  const response = await fetch('/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(!(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Request failed.');
  return result;
}
function projectId() { return $('#projects').value; }
function signature() { return JSON.stringify([revision, projectId(), $('#direction-name').value, color, roughness]); }
function updateButtons() {
  $('#save-direction').disabled = busy || !png || !projectId() || signature() === lastSavedSignature;
  $('#publish-shelf').disabled = busy || !selected.size;
  $('#publish-shelf').textContent = `Publish ${selected.size || 'selected'} direction${selected.size === 1 ? '' : 's'} ↗`;
}
function preview() {
  dispose?.();
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = png ? URL.createObjectURL(png) : null;
  $('#plugin-viewer').innerHTML = '';
  dispose = viewer($('#plugin-viewer'), [{ source: 'sample', color, roughness, metalness: .1, label: 'S O L A', labelUrl: previewUrl }]);
}
async function loadState() {
  const oldProject = projectId();
  state = await api('seller/state');
  $('#projects').replaceChildren(...state.projects.map(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    return option;
  }));
  if (state.projects.some(project => project.id === oldProject)) $('#projects').value = oldProject;
  $('#plugin-project-form').hidden = state.projects.length > 0;
  await directions();
}
let listRevision = 0;
async function directions() {
  const current = ++listRevision;
  const versions = state.versions.filter(version => version.projectId === projectId()).reverse();
  for (const id of selected) if (!versions.some(version => version.id === id)) selected.delete(id);
  $('#direction-count').textContent = versions.length + ' direction' + (versions.length === 1 ? '' : 's');
  const list = $('#direction-list');
  list.replaceChildren();
  if (!versions.length) { const p = document.createElement('p'); p.className = 'micro'; p.textContent = 'Save your first direction above. No designs are published automatically.'; list.append(p); }
  for (const version of versions) {
    const row = document.createElement('label'); row.className = 'plugin-direction';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(version.id);
    checkbox.setAttribute('aria-label', 'Include ' + version.name);
    checkbox.onchange = () => { checkbox.checked ? selected.add(version.id) : selected.delete(version.id); updateButtons(); };
    const swatch = document.createElement('span'); swatch.className = 'result-swatch'; swatch.style.background = version.color;
    const info = document.createElement('span'); const title = document.createElement('strong'); title.textContent = version.name;
    const detail = document.createElement('small'); detail.textContent = version.sourceReference?.provider === 'figma' ? 'Figma artwork · saved snapshot' : 'Saved concept';
    info.append(title, detail); row.append(checkbox, swatch, info); list.append(row);
  }
  if (current === listRevision) updateButtons();
}
async function init() {
  try {
    if (!token) {
      const response = await fetch('/api/local-session');
      if (!response.ok) throw Error('Sign in to the seller workspace in this panel’s browser session first.');
      token = (await response.json()).token;
    }
    await loadState(); preview();
    status(window.parent === window ? 'Open this panel through the Figma development plugin to connect a label.' : 'Select a label frame in Figma. It will appear here automatically.');
    tellFigma({ type: 'ready' });
  } catch (error) { $('#setup-error').hidden = false; $('#setup-error').textContent = error.message; status('Workspace connection unavailable.', true); }
}
async function receive(event) {
  if (window.parent === window || event.source !== window.parent) return;
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'results-inserted') { status('Actual customer results inserted into your Figma file.'); return; }
  if (message.type === 'results-error') { status(message.message, true); return; }
  if (message.type === 'sync-status') {
    const messages = { pending: 'Artwork changed · updating after a short pause…', exporting: 'Updating ' + (message.name || 'your frame') + '…', waiting: 'Select a label frame in Figma to connect it.', paused: 'Live artwork paused. Refresh when ready.', error: message.message };
    status(messages[message.status] || 'Connected to Figma.', message.status === 'error');
    return;
  }
  if (message.type !== 'label' || !Array.isArray(message.bytes) || !message.bytes.length || message.bytes.length > 30 * 1024 * 1024  ) return;
  if(busy){pendingLabel=message;return;}
  const order=++incoming;
  const bytes=new Uint8Array(message.bytes);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
  if(order!==incoming)return;
  const fingerprint=String(message.sourceReference?.nodeId)+':'+digest;
  if(fingerprint===artworkFingerprint){status('Figma artwork is up to date.');return;}
  artworkFingerprint=fingerprint;
  revision++;
  png = new Blob([new Uint8Array(message.bytes)], { type: 'image/png' });
  sourceReference = message.sourceReference;
  const nameField = $('#direction-name');
  if (!connected || nameField.dataset.autoName === nameField.value) { nameField.value = message.name; nameField.dataset.autoName = message.name; }
  connected = true;
  $('#source-name').textContent = 'Figma / ' + message.name;
  preview(); updateButtons();
  status('Figma artwork synced · unsaved direction');
}
window.addEventListener('message', receive);
$('#refresh-label').onclick = () => { if (window.parent === window) { status('Run the Kalpi development plugin inside Figma first.', true); return; } tellFigma({ type: 'refresh' }); };
$('#live-sync').onchange = event => tellFigma({ type: 'set-live', enabled: event.target.checked });
$('#projects').onchange = () => { selected.clear(); $('#published-shelf').hidden = true; directions(); };
$('#direction-name').oninput = updateButtons;
function changeFinish(nextColor, nextRoughness) {
  color = nextColor; roughness = nextRoughness;
  if (dispose?.setFinish) dispose.setFinish({ color, roughness, metalness: .1 }); else preview();
  $('#finish-value').textContent = roughness > .6 ? 'Matte' : roughness < .2 ? 'Polished' : 'Satin';
  document.querySelectorAll('[data-finish]').forEach(button => button.classList.toggle('chosen', button.dataset.finish === color));
  $('#plugin-color').value = color;
  updateButtons();
}
document.querySelectorAll('[data-finish]').forEach(button => button.onclick = () => changeFinish(button.dataset.finish, roughness));
$('#plugin-color').oninput = event => changeFinish(event.target.value, roughness);
$('#plugin-roughness').oninput = event => changeFinish(color, Number(event.target.value));
$('#plugin-project-form').onsubmit = async event => {
  event.preventDefault();
  try { const project = await api('seller/projects', { name: event.target.elements.name.value }); await loadState(); $('#projects').value = project.id; await directions(); status('Project created. Select a Figma label frame.'); }
  catch (error) { status(error.message, true); }
};
$('#save-direction').onclick = async () => {
  if (!png || busy || !projectId()) return;
  busy = true; updateButtons();
  const savedSignature = signature();
  // Retain this operation key after an unknown network outcome; retries reuse it.
  if (requestSignature !== savedSignature) { requestSignature = savedSignature; requestKey = crypto.randomUUID(); uploadedAsset = null; }
  const payload = { projectId: projectId(), source: 'sample', name: $('#direction-name').value || 'Figma direction', color, roughness, metalness: .1, sourceReference, idempotencyKey: requestKey };
  try {
    status('Saving this exact direction…');
    if(!uploadedAsset){const form = new FormData(); form.append('file', png, 'figma-label.png'); uploadedAsset = await api('seller/assets', form);}
    const asset = uploadedAsset;
    const version = await api('seller/versions', { ...payload, labelAsset: asset.id });
    selected.add(version.id); lastSavedSignature = savedSignature;
    await loadState(); status('Direction saved and selected. Change the finish to explore another.');
  } catch (error) { status(error.message + ' Retry to save the same direction safely.', true); }
  finally { busy = false; updateButtons(); if(pendingLabel){const message=pendingLabel;pendingLabel=null;receive({source:window.parent,data:message});} }
};
let publishKey = '', publishSignature = '';
$('#publish-shelf').onclick = async () => {
  if (busy || !selected.size) return;
  const versionIds = [...selected]; const sig = JSON.stringify([projectId(), versionIds.slice().sort()]);
  if (sig !== publishSignature) { publishSignature = sig; publishKey = crypto.randomUUID(); }
  busy = true; updateButtons();
  try {
    const shelf = await api('seller/shelves', { projectId: projectId(), versionIds, idempotencyKey: publishKey });
    const url = location.origin + '/shelf/' + shelf.id;
    $('#open-shelf').href = url;
    $('#copy-embed').onclick = async () => { try { await navigator.clipboard.writeText(`<script async src="${location.origin}/embed.js" data-shelf="${shelf.id}"></script>`); status('One-line embed copied. Paste it where the shelf should appear.'); } catch { status('Clipboard unavailable. Copy the embed from the seller’s Customer shelf page.', true); } };
    $('#published-shelf').hidden = false; status('Selected directions published. Customers will review these saved snapshots.');
  } catch (error) { status(error.message + ' Retry to resume the same publication.', true); }
  finally { busy = false; updateButtons(); }
};
$('#insert-results').onclick = async () => {
  try {
    if (window.parent === window) throw Error('Open the Kalpi plugin inside Figma to insert a results frame.');
    state = await api('seller/state');
    const id = projectId(), project = state.projects.find(project => project.id === id);
    if (!project) throw Error('Choose a project first.');
    const shelves = state.shelves.filter(shelf => shelf.projectId === id), responses = state.responses.filter(response => response.projectId === id);
    const views = state.views.filter(view => shelves.some(shelf => shelf.id === view.shelfId));
    const lines = ['KALPI / CUSTOMER RESULTS', project.name, new Date().toISOString(), '', 'Shelf views: ' + views.length, 'Explicit preferences: ' + responses.filter(response => response.choice !== 'none').length, 'None of these: ' + responses.filter(response => response.choice === 'none').length, 'Waitlist signups: ' + responses.filter(response => response.waitlist).length, '', 'Preferences are not sales; signups are not validated demand.', ''];
    for (const shelf of shelves) { lines.push('Shelf ' + shelf.id); for (const version of shelf.versions) lines.push(version.name + ': ' + responses.filter(response => response.shelfId === shelf.id && response.choice === version.id).length + ' preferences'); }
    lines.push('', 'ACTUAL COMMENTS');
    for (const response of responses.filter(response => response.comment).slice(0, 15)) lines.push(response.id.slice(0, 8) + ': ' + response.comment);
    tellFigma({ type: 'insert-results', text: lines.join('\n') }); status('Sending actual results to Figma…');
  } catch (error) { status(error.message, true); }
};
window.addEventListener('pagehide', () => { dispose?.(); if (previewUrl) URL.revokeObjectURL(previewUrl); });
init();
