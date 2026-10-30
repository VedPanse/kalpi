import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { defaultProduct, applyChanges } from "../shared/product.js";
import {plugin} from "./helpers/figma-runtime.js";
test("five structured templates round-trip Figma canonical closed paths without phantom edits", async () => {
  const p = await plugin();
  for (const kind of ["bottle", "bottle", "bottle", "bottle", "sofa"]) {
    await p.insert(kind);
    await p.figma.ui.onmessage({ type: "convert" });
    const msg = p.messages.at(-1);
    assert.equal(msg.type, "figma-change");
    assert.equal(msg.changes.length, 0);
    assert.equal(msg.convert, true);
  }
  assert.equal(p.page.children.length, 5);
});
test("native artwork survives remote geometry updates and updates do not echo", async () => {
  const p = await plugin(),
    { row, frame } = await p.insert("bottle");
  const art = frame.children.find(
    (n) => n.getPluginData("kalpiPart") === "artwork",
  );
  const next = {
    ...row,
    revision: 1,
    document: JSON.stringify(
      applyChanges(JSON.parse(row.document), [
        { field: "dimensions.width", value: 0.08 },
        { field: "shape.crossSection", value: "rectangle" },
      ]),
    ),
  };
  await p.figma.ui.onmessage({ type: "remote-design", design: next });
  assert.equal(
    frame.children.find((n) => n.getPluginData("kalpiPart") === "artwork"),
    art,
  );
  assert.equal(frame.getPluginData("kalpiRevision"), "1");
  const count = p.messages.length;
  p.handlers.nodechange({
    nodeChanges: [{ type: "PROPERTY_CHANGE", node: frame }],
  });
  await p.flush();
  assert.equal(p.messages.length, count);
});
test("unsupported paths and pending edits block overwrite; explicit reload recovers", async () => {
  const p = await plugin(),
    { row, frame } = await p.insert("bottle"),
    body = frame.children.find((n) => n.getPluginData("kalpiPart") === "front")
      .children[0];
  body.vectorPaths = [
    { windingRule: "NONZERO", data: "M 0 0 C 1 2 3 4 5 6 Z" },
  ];
  p.handlers.nodechange({
    nodeChanges: [{ type: "PROPERTY_CHANGE", node: body }],
  });
  await p.flush();
  assert.equal(p.messages.at(-1).type, "sync-error");
  assert.match(p.messages.at(-1).message, /straight/);
  assert.equal(frame.getPluginData("kalpiDocument"), row.document);
  await p.figma.ui.onmessage({
    type: "remote-design",
    design: { ...row, revision: 1 },
  });
  assert.equal(frame.getPluginData("kalpiRevision"), "0");
  assert.equal(p.messages.at(-1).type, "sync-error");
  await p.figma.ui.onmessage({ type: "restore-template", design: row });
  assert.equal(frame.getPluginData("kalpiPending"), "");
  await p.figma.ui.onmessage({ type: "convert" });
  assert.equal(p.messages.at(-1).type, "figma-change");
});

test('selection sizes prefer explicit units and otherwise expose estimates', async () => {
  const { selectionDimensions } = await import('../shared/figma-selection.js');
  const measured = selectionDimensions(640,1180,'64 × 38 × 118 mm');
  assert.deepEqual(measured.dimensions, {width:.064, depth:.038, height:.11800000000000001});
  const estimated = selectionDimensions(100,200,'product');
  assert.deepEqual(estimated.dimensions, {width:.1,height:.2,depth:.02});
  assert.match(estimated.source, /Estimated/);
});

test('untagged selection exports without adding or replacing native artwork', async () => {
  const p = await plugin(), node = p.figma.createRectangle();
  node.name = 'Pendant'; node.resize(80,120); p.page.appendChild(node); p.page.selection = [node];
  await p.figma.ui.onmessage({type:'ready'});
  assert.equal(p.messages.find(m=>m.type==='selection-preview').selection.name,'Pendant');
  await p.figma.ui.onmessage({type:'export-selection',nodeId:node.id,dimensions:{width:.08,height:.12,depth:.02},source:'estimate'});
  const exported = p.messages.at(-1);
  assert.equal(exported.type,'selection-export');
  assert.equal(exported.designId,null);
  const document = defaultProduct('freeform'); document.dimensions={width:.08,height:.12,depth:.02};
  await p.figma.ui.onmessage({type:'import-linked',nodeId:node.id,design:{id:'new',projectId:'project',revision:0,document:JSON.stringify(document)},fingerprint:exported.fingerprint});
  assert.equal(p.page.children.length,1);
  assert.equal(node.width,80); assert.equal(node.height,120);
  assert.equal(node.getPluginData('kalpiDesignId'),'new');
  p.page.selection=[];
  await p.figma.ui.onmessage({type:'ready'});
  await p.figma.ui.onmessage({type:'convert'});
  assert.equal(p.messages.at(-1).type,'selection-export');
});

test('bottle recognition reads the whole board from nested or multiple selections', async () => {
  const p=await plugin(),board=p.figma.createFrame();board.name='Presentation';board.resize(1800,1380);p.page.appendChild(board);
  const hero=p.figma.createFrame(),spec=p.figma.createFrame();board.appendChild(hero);board.appendChild(spec);
  const label=p.figma.createText();label.characters='64 × 38 × 118 mm';spec.appendChild(label);
  p.page.selection=[hero,spec];
  await p.figma.ui.onmessage({type:'read-bottle-board'});
  const result=p.messages.at(-1);assert.equal(result.type,'bottle-board');assert.equal(result.boardId,board.id);assert.match(result.texts,/118 mm/);
  assert.equal(p.page.children.length,1);
  await p.figma.ui.onmessage({type:'create-recognized-bottle',boardId:board.id,design:{id:'recognized',projectId:'test',revision:0,document:JSON.stringify(defaultProduct('bottle'))}});
  assert.equal(p.messages.at(-1).type,'recognized-bottle-ready');assert.equal(p.page.children.length,2);
  assert.equal(board.children.length,2);assert.equal(p.page.children[1].x,1880);
});

test('assembly front schematic retains named native parts and round-trips size and colors',async()=>{
 const p=await plugin(),{row,frame}=await p.insert('assembly');
 const front=frame.children.find(n=>n.getPluginData('kalpiPart')==='front');
 assert.match(front.name,/schematic/);assert.equal(front.children[0].name,'Body');
 front.children[0].fills=[{type:'SOLID',color:{r:1,g:0,b:0}}];
 await p.figma.ui.onmessage({type:'convert'});
 const m=p.messages.at(-1);assert.equal(m.type,'figma-change');assert.equal(m.document.shape.components[0].color,'#ff0000');
 assert.equal(m.document.kind,'assembly');
});

test('plugin session credentials persist separately from the shared document and are scoped to the workspace', async () => {
 const p=await plugin(), url='https://kalpi-roan.vercel.app/plugin.html?project=test-project';
 await p.figma.ui.onmessage({type:'save-studio-session',url,token:'test-session-credential'});
 await p.figma.ui.onmessage({type:'restore-studio-session',url});
 assert.equal(p.messages.at(-1).token,'test-session-credential');
 await p.figma.ui.onmessage({type:'restore-studio-session',url:url+'-other'});
 assert.equal(p.messages.at(-1).token,null);
 await p.figma.ui.onmessage({type:'bootstrap-ready'});
 assert.equal(p.messages.at(-1).url,url);
 assert.equal(JSON.stringify(p.page.data).includes('test-session-credential'),false);
 await p.figma.ui.onmessage({type:'restore-studio-session',url:'https://evil.example/plugin.html?project=test-project'});
 assert.equal(p.messages.at(-1).type,'sync-error');
});

test('selected artwork export stays explicit and preview placement creates an image layer',async()=>{
 const p=await plugin();
 await p.figma.ui.onmessage({type:'read-selected-label',designId:'library'});
 assert.match(p.messages.at(-1).error,/Select one/);
 const frame=p.figma.createFrame();p.page.appendChild(frame);p.page.selection=[frame];
 await p.figma.ui.onmessage({type:'read-selected-label',designId:'library'});
 assert.equal(p.messages.at(-1).type,'selected-label');assert.equal(p.messages.at(-1).designId,'library');assert.equal(p.messages.at(-1).bytes[0],137);
 p.figma.base64Decode=s=>new Uint8Array(Buffer.from(s,'base64'));
 p.figma.createImage=bytes=>({hash:'preview-image'});p.figma.notify=()=>{};
 await p.figma.ui.onmessage({type:'place-product-preview',name:'Crystal preview',data:'data:image/jpeg;base64,/9j/'});
 assert.equal(p.page.selection[0].name,'Crystal preview');assert.equal(p.page.selection[0].fills[0].imageHash,'preview-image');assert.equal(p.page.selection[0].fills[0].scaleMode,'FIT');
});

test('packaging AI geometry and effective body color reach editable vectors, undo restores them',async()=>{
 const p=await plugin(),{row,frame}=await p.insert('bottle');
 const original=JSON.parse(row.document);original.parts.Body={...original.material,color:'#123456'};
 await p.figma.ui.onmessage({type:'restore-template',design:{...row,document:JSON.stringify(original)}});
 const edited=applyChanges(original,[{field:'shape.crossSection',value:'rectangle'},{field:'shape.profile',value:[[0,1],[.88,.14],[1,.14]]},{field:'parts.Body',value:{...original.material,color:'#b26b26',type:'glass'}}]);
 const body=()=>frame.children.find(n=>n.getPluginData('kalpiPart')==='front').children.find(n=>n.getPluginData('kalpiPart')==='profile');
 const before=body().vectorPaths[0].data;
 await p.figma.ui.onmessage({type:'remote-design',design:{...row,revision:1,document:JSON.stringify(edited)}});
 assert.notEqual(body().vectorPaths[0].data,before);assert.equal(body().type,'VECTOR');assert.ok(Math.abs(body().fills[0].color.r-178/255)<1e-6);
 await p.figma.ui.onmessage({type:'remote-design',design:{...row,revision:2,document:JSON.stringify(original)}});
 assert.equal(body().vectorPaths[0].data,before);
 // A native recolor becomes an edit command; it is not just a screenshot.
 body().fills=[{type:'SOLID',color:{r:1,g:0,b:0}}];await p.figma.ui.onmessage({type:'convert'});
 const change=p.messages.at(-1);assert.equal(change.type,'figma-change');assert.ok(change.changes.some(c=>c.field==='parts.Body'&&c.value.color==='#ff0000'));
});
test('linking editable views twice does not create duplicate frames',async()=>{
 const p=await plugin(),row={id:'linked',projectId:'test',revision:0,document:JSON.stringify(defaultProduct('bottle'))};
 await p.figma.ui.onmessage({type:'ensure-template',design:row});await p.figma.ui.onmessage({type:'ensure-template',design:row});assert.equal(p.page.children.length,1);
});

test('native cap recoloring updates its independent 3D finish',async()=>{
 const p=await plugin(),{frame}=await p.insert('bottle');
 const cap=frame.children.find(n=>n.getPluginData('kalpiPart')==='front').children.find(n=>n.getPluginData('kalpiPart')==='cap');
 cap.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}];await p.figma.ui.onmessage({type:'convert'});
 const c=p.messages.at(-1).changes.find(c=>c.field==='parts.Cap');assert.equal(c.value.color,'#ffffff');assert.equal(c.value.roughness,.25);
});


test('plugin proactively announces startup with a matching per-launch UI identifier', async () => {
 const p=await plugin();
 assert.equal(p.uiLaunches[0].handlerReady,true);
 const boot=p.messages.find(m=>m.type==='saved-panel');
 assert.equal(boot.url,'https://kalpi-roan.vercel.app/plugin.html');
 assert.ok(boot.bridgeId.length>16);
 assert.ok(p.uiLaunches[0].html.includes("window.__KALPI_BRIDGE_ID__='"+boot.bridgeId+"'"));
 assert.ok(!p.uiLaunches[0].html.includes('__KALPI_LAUNCH_NONCE__'));
 const other=await plugin();assert.notEqual(other.messages[0].bridgeId,boot.bridgeId);
});

test('structured conversion emits a local preview before artwork export and skips board recognition',async()=>{
 const p=await plugin(),{frame}=await p.insert('bottle');p.page.selection=[frame];
 const art=frame.children.find(n=>n.getPluginData('kalpiPart')==='artwork');let release;
 art.exportAsync=()=>new Promise(resolve=>release=resolve);
 const work=p.figma.ui.onmessage({type:'read-product-board'});await new Promise(resolve=>setImmediate(resolve));
 assert.ok(p.messages.some(m=>m.type==='structured-preview'));
 assert.ok(!p.messages.some(m=>m.type==='bottle-board'));
 release(new Uint8Array());await work;
 assert.equal(p.messages.at(-1).type,'figma-change');
});
