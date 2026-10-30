import {libraryProduct} from '../../shared/library-product.js';
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { unzipSync, strFromU8 } from "three/addons/libs/fflate.module.js";
import { testDatabase } from "../helpers/database.js";
import { openConnection } from "../../providers/spacetime.js";
import { defaultLayout, defaultProduct } from "../../shared/product.js";
let database, server, hostedIdentity, hostedOwner, hostedProject;
const baseURL = process.env.KALPI_HOSTED_URL || "http://127.0.0.1:3100";
test.beforeAll(async () => {
  if (process.env.KALPI_HOSTED_URL) {
    hostedOwner = await openConnection(process.env.SPACETIME_SERVICE_TOKEN, [
      "SELECT * FROM my_projects",
      "SELECT * FROM my_designs",
      "SELECT * FROM my_publications",
    ]);
    hostedIdentity = await openConnection(null, ["SELECT * FROM my_projects"]);
    hostedProject = crypto.randomUUID();
    await hostedOwner.reducers.createProject({
      id: hostedProject,
      name: "Staging automated verification",
    });
    const code = crypto.randomUUID();
    await hostedOwner.reducers.createPairing({
      projectId: hostedProject,
      code,
    });
    await hostedIdentity.reducers.redeemPairing({ code });
    return;
  }
  database = await testDatabase();
  server = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: "3100",
      HOST: "127.0.0.1",
      SELLER_TOKEN: "test-legacy-token",
    },
    stdio: "pipe",
  });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Kalpi:")) resolve();
    });
    server.on("error", reject);
    server.on("exit", (c) => reject(Error("Test server stopped " + c)));
  });
});
test.afterAll(async () => {
  if (hostedOwner && hostedProject)
    for (const publication of hostedOwner.db.myPublications.iter())
      if (publication.projectId === hostedProject && publication.published)
        await hostedOwner.reducers.unpublishStore({ id: publication.id });
  hostedIdentity?.disconnect();
  hostedOwner?.disconnect();
  server?.kill();
  await database?.close();
});
test("creator → five versions → shelf → two browsers → purchase intent → GLB/USDZ → unpublish", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (hostedIdentity)
    await page.addInitScript(
      ({ credential, project }) => {
        localStorage.setItem("kalpi-spacetime-token", credential);
        localStorage.setItem("kalpi-project", project);
      },
      { credential: hostedIdentity.serviceCredential, project: hostedProject },
    );
  await page.goto("/");
  if (!hostedIdentity) {
    await page.getByRole("button", { name: "Start a project" }).click();
    await page.getByLabel("Project name").fill("Browser acceptance study");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: "Open Figma" })).toBeVisible();
  await page.getByRole("button", { name: "Bottle template" }).click();
  await page.getByText("Edit manually", { exact: false }).click();
  await page.getByLabel("Brand", { exact: true }).fill("Sola");
  await page.getByText("Price & product information", { exact: true }).click();
  await page.getByLabel("Price", { exact: true }).fill("65");
  await page.getByLabel("Capacity · ml").fill("50");
  await page.getByLabel("I confirm these product dimensions").check();
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.getByText("REVISION 1", { exact: true })).toBeVisible();
  await page.getByText("Material & artwork", { exact: true }).click();
  await page.getByText("Shape", { exact: true }).click();
  for (let i = 1; i <= 5; i++) {
    if (i > 1) {
      await page
        .locator('[name="material.color"]')
        .fill(["#87916b", "#b07b59", "#a8a0af", "#879cab", "#af9b6a"][i - 1]);
      if (i === 2) {
        await page
          .locator('[name="shape.crossSection"]')
          .selectOption("rectangle");
        await page.locator('[name="material.type"]').selectOption("glass");
      }
      await page
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await expect(page.locator('[name="material.color"]')).toHaveValue(
        ["#87916b", "#b07b59", "#a8a0af", "#879cab", "#af9b6a"][i - 1],
      );
    }
    await page
      .getByRole("button", { name: "Save direction", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: true })
      .fill("Direction " + i);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Continue" })
      .click();
    await expect(page.locator("#toast")).toHaveText(
      "Direction and AR files saved.",
      { timeout: 30000 },
    );
  }
  if (hostedIdentity) {
    await page
      .getByRole("button", { name: "Design", exact: true })
      .click();
    await page.locator('[name="shape.crossSection"]').selectOption("circle");
    await page
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    await expect(page.locator("#toast")).toContainText("Product updated.");
    await page
      .getByLabel("Describe a product change")
      .fill(
        "Make this bottle chiseled glass with eight facets. Keep its current dimensions.",
      );
    await page.locator("#chat-form button").click();
    await expect(page.locator('[name="shape.crossSection"]')).toHaveValue(
      "faceted",
      { timeout: 90000 },
    );
    await expect(page.locator('[name="material.type"]')).toHaveValue("glass");
  }
  console.log(
    hostedIdentity
      ? "Five variants and hosted AI edit verified."
      : "Five variants verified.",
  );
  await expect(page.locator("[data-version]")).toHaveCount(5);
  await page
    .getByRole("checkbox", { name: "Select Direction 1", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Select Direction 2", exact: true })
    .check();
  await page.getByRole("button", { name: "Put it on the shelf" }).click();
  await expect(
    page.getByText("2 selected · actual relative dimensions"),
  ).toBeVisible();
  await page.locator("#lighting").selectOption("warm");
  await page.screenshot({ path: "test-results/shelf-study.png" });
  await page
    .getByRole("button", { name: "Publish selected directions" })
    .click();
  const link = page
    .getByRole("dialog")
    .getByRole("link", { name: "Visit your store" });
  await expect(link).toBeVisible();
  const path = await link.getAttribute("href");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  const one = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    }),
    two = await browser.newContext(),
    visitor = await one.newPage();
  await visitor.goto(baseURL + path);
  await expect(visitor.locator("#visitor-count")).toHaveText("1 in this store");
  await visitor.getByRole("button", { name: "Invite someone" }).click();
  const shared = await visitor.evaluate(() => navigator.clipboard.readText());
  const other = await two.newPage();
  await other.goto(shared);
  await expect(other.locator("#visitor-count")).toHaveText("2 in this store");
  await expect(visitor.locator("#visitor-count")).toHaveText("2 in this store");
  for (const p of [visitor, other]) {
    await p.locator("#store-view canvas").focus();
    await p.keyboard.down("KeyW");
    // Stop in the browser so software-renderer/tool latency cannot carry the
    // visitor past the shelf while the test runner delivers keyup.
    await p.waitForFunction(
      () => {
        const position = JSON.parse(
          document.querySelector("#store-view")?.dataset.position || '{"z":3}',
        );
        if (position.z >= -1.5) return false;
        window.dispatchEvent(
          new KeyboardEvent("keyup", { code: "KeyW", bubbles: true }),
        );
        return true;
      },
      undefined,
      { timeout: 45000 },
    );
    await p.keyboard.up("KeyW");
    await p.getByRole("button", { name: "Browse products" }).click();
    await p.getByRole("button", { name: "Details & feedback" }).first().click();
  }
  console.log("Two visitors joined and moved to the shelf.");
  await visitor.getByRole("button", { name: "Pick up", exact: true }).click();
  await expect(visitor.locator("#held-status")).toHaveText("Holding product");
  await other.getByRole("button", { name: "Pick up", exact: true }).click();
  await expect(other.locator("#toast")).toContainText("Another visitor");
  await visitor.getByLabel("Your answer").selectOption("yes");
  await visitor
    .getByLabel("What stands out?")
    .fill("Test-only response: the proportions work at this price.");
  await visitor.getByRole("button", { name: "Share your thoughts" }).click();
  await expect(visitor.locator("#toast")).toContainText(
    "Your response is saved",
  );
  const arPath = await visitor
      .getByRole("link", { name: "View in your space" })
      .getAttribute("href"),
    ar = await one.newPage();
  await ar.goto(baseURL + arPath);
  await expect(ar.locator("model-viewer")).toHaveAttribute("ar-scale", "fixed");
  const glb = await ar.locator("model-viewer").getAttribute("src"),
    usdz = await ar.locator("model-viewer").getAttribute("ios-src");
  const glbResponse = await ar.request.get(glb),
    usdzResponse = await ar.request.get(usdz);
  expect(glbResponse.status()).toBe(200);
  expect(usdzResponse.status()).toBe(200);
  const bytes = await glbResponse.body();
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  expect(gltf.asset.version).toBe("2.0");
  const zip = unzipSync(new Uint8Array(await usdzResponse.body())),
    stage = Object.entries(zip).find(([k]) => k.endsWith(".usda"));
  expect(strFromU8(stage[1])).toMatch(/metersPerUnit\s*=\s*1/);
  await page
    .getByRole("button", { name: "Results", exact: true })
    .click();
  await expect(
    page.getByText("Test-only response: the proportions work at this price."),
  ).toBeVisible();
  await visitor.screenshot({ path: "test-results/shared-store.png" });
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(
    visitor.getByRole("heading", { name: "This store is unavailable." }),
  ).toBeVisible();
  expect((await ar.request.get(glb)).status()).toBe(404);
  expect(errors).toEqual([]);
  await one.close();
  await two.close();
});

test("mobile sofa editing and accessible rendering failure", async ({
  page,
}) => {
  test.skip(
    !!process.env.KALPI_HOSTED_URL,
    "Local resilience check; hosted journey is covered above.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Start a project" }).click();
  await page.getByLabel("Project name").fill("Mobile sofa verification");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Sofa template" }).click();
  await page.getByLabel("Width", { exact: true }).fill("210");
  await page.getByLabel("Price", { exact: true }).fill("1299");
  await page.getByLabel("I confirm these product dimensions").check();
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("210");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(392);
  await page.screenshot({
    path: "test-results/mobile-sofa.png",
    fullPage: true,
  });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).startsWith("webgl")) return null;
      return get.call(this, type, ...args);
    };
  });
  await page.reload();
  await expect(
    page.getByText("The 3D view could not start on this browser.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("210");
  await page.getByLabel("Price", { exact: true }).fill("1399");
  await page
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await expect(page.getByLabel("Price", { exact: true })).toHaveValue("1399");
});

test("store presence survives paused rendering and recovers expired membership", async ({
  page,
}) => {
  test.skip(
    !!process.env.KALPI_HOSTED_URL,
    "Controlled local room recovery check.",
  );
  const owner = await database.connect(),
    visitor = await database.connect();
  const pid = crypto.randomUUID(),
    did = crypto.randomUUID(),
    vid = crypto.randomUUID(),
    pub = crypto.randomUUID(),
    room = crypto.randomUUID();
  await owner.reducers.createProject({
    id: pid,
    name: "Presence verification",
  });
  const product = defaultProduct();
  product.facts.price = 65;
  await owner.reducers.createDesign({
    id: did,
    projectId: pid,
    kind: "bottle",
    document: JSON.stringify(product),
  });
  await owner.reducers.saveVersion({
    id: vid,
    designId: did,
    baseRevision: 0,
    name: "Presence bottle",
  });
  const layout = defaultLayout();
  layout.placements = [
    { id: crypto.randomUUID(), versionId: vid, x: 0, y: 1, z: 0, rotation: 0 },
  ];
  await owner.reducers.saveLayout({
    projectId: pid,
    baseRevision: 0,
    document: JSON.stringify(layout),
    operationId: crypto.randomUUID(),
  });
  await owner.reducers.publishStore({
    id: pub,
    projectId: pid,
    versionIds: [vid],
    name: "Presence verification",
  });
  try {
    await page.addInitScript((token) => {
      localStorage.setItem("kalpi-spacetime-token", token);
      // A background/suspended renderer must not own the network heartbeat.
      window.requestAnimationFrame = () => 0;
    }, visitor.serviceCredential);
    await page.goto(`/store/${pub}?room=${room}`);
    await expect(page.locator("#visitor-count")).toHaveText("1 in this store");
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 32000)),
    );
    await expect(page.locator("#visitor-count")).toHaveText("1 in this store");
    let rejoined = false;
    visitor.db.roomVisitors.onInsert(() => {
      rejoined = true;
    });
    await visitor.reducers.leaveRoom({ roomId: room });
    await expect.poll(() => rejoined).toBe(true);
    await expect(page.locator("#visitor-count")).toHaveText("1 in this store");
  } finally {
    await owner.reducers.unpublishStore({ id: pub });
  }
});

test("Figma setup guides a new creator from file to plugin connection", async ({ page }) => {
  test.skip(!!process.env.KALPI_HOSTED_URL, "Uses an isolated local creator");
  await page.goto("/");
  await page.getByRole("button", { name: "Start a project" }).click();
  await page.getByLabel("Project name").fill("Guided setup verification");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Open Figma & continue" }).click();
  await expect(page.locator("#toast")).toContainText("Paste your Figma Design file link first");
  await page.getByLabel("Figma Design file URL").fill("https://www.figma.com/design/vWJV3nxicYnUcpuLQ7jGet/Sola");
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole("button", { name: "Open Figma & continue" }).click();
  await expect(page.getByRole("heading", { name: "2. Add Kalpi to Figma — just once" })).toBeVisible();
  await page.getByRole("button", { name: "The Kalpi panel is open" }).click();
  await page.getByRole("button", { name: "Create pairing link", exact: true }).click();
  await expect(page.locator("#pair-link")).toHaveValue(/\/plugin.html\?project=.+#.+/);
  const link = await page.locator("#pair-link").inputValue();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.getByRole("button", { name: "The Kalpi panel is open" }).click();
  await expect(page.locator("#pair-link")).toHaveValue(link);
  await page.getByRole("button", { name: "Bottle template", exact: true }).click();
  await expect(page.getByLabel("Capacity · ml")).toBeHidden();
  await page.getByText("Edit manually", { exact: false }).click();
  await page.getByLabel("Design name", { exact: true }).fill("Unsaved perfume name");
  await page.getByRole("button", { name: "Connect Figma", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#connection-link")).toHaveValue(link);
  await page.getByRole("button", { name: "Create a fresh link" }).click();
  await expect(page.locator("#connection-link")).not.toHaveValue(link);
  await page.getByRole("button", { name: "Close Figma connection" }).click();
  await expect(page.getByLabel("Design name", { exact: true })).toHaveValue("Unsaved perfume name");
  await page.getByText("Edit manually", { exact:false }).click();
  await page.setViewportSize({ width:390, height:844 });
  await expect(page.getByRole("button", { name:"Connect Figma", exact:true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { window.scrollTo(0,0); document.querySelector("#toast").classList.remove("show"); });
  await page.screenshot({path:"/tmp/kalpi-simple-mobile.png",fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({path:"/tmp/kalpi-simple-desktop.png",fullPage:true});
  await page.getByRole("button", { name:"Connect Figma", exact:true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByText("Edit manually", { exact:false }).click();
  await page.getByText("Price & product information", { exact: true }).click();
  await expect(page.getByLabel("Capacity · ml")).toBeVisible();
});

test('selected Figma artwork converts without choosing a product category', async ({ page, context }) => {
  test.skip(!!process.env.KALPI_HOSTED_URL, 'Uses an isolated local creator');
  await page.goto('/');
  await page.getByRole('button', {name:'Start a project'}).click();
  await page.getByLabel('Project name').fill('Selection import verification');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'3. Connect & design',exact:true}).click();
  await page.getByRole('button',{name:'Create pairing link',exact:true}).click();
  const pairing = await page.locator('#pair-link').inputValue();
  const plugin = await context.newPage();
  await plugin.addInitScript(() => {
    window.addEventListener('message', e => {
      const m = e.data;
      if (m.type === 'ready' || m.type === 'inspect-selection') window.postMessage({type:'selection-preview',selection:{nodeId:'10:20',name:'Asymmetric pendant',dimensions:{width:.08,height:.12,depth:.02},source:'Estimated',linked:false}},'*');
      if (m.type === 'export-selection') window.postMessage({type:'selection-export',snapshot:{...m,name:'Asymmetric pendant',svg:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><path fill="#556633" d="M0 0L80 0L50 120L10 90Z"/></svg>'},designId:null,baseRevision:0,fingerprint:'original-artwork'},'*');
      if (m.type === 'open-studio') window.__studioURL = m.url;
    });
  });
  await plugin.goto(pairing);
  await plugin.getByText('Vector extrusion & selected-layer conversion',{exact:true}).click();
  await expect(plugin.getByText('Asymmetric pendant',{exact:true})).toBeVisible();
  await expect(plugin.locator('#selection-width')).toHaveValue('8');
  await expect(plugin.getByRole('button',{name:'+ Bottle',exact:true})).not.toBeVisible();
  await plugin.locator('#selection-depth').fill('3');
  await plugin.setViewportSize({width:460,height:760});
  await plugin.screenshot({path:'/tmp/kalpi-selection-first.png'});
  await plugin.getByRole('button',{name:'Convert this design to 3D'}).click();
  await expect(plugin.locator('#plugin-viewport canvas')).toBeVisible();
  await plugin.getByText('Product details',{exact:true}).click();
  await expect(plugin.locator('#editor-details [name="name"]')).toHaveValue('Asymmetric pendant');
  await expect(plugin.locator('#editor-details [name="depth"]')).toHaveValue('3');
  expect(await plugin.evaluate(()=>window.__studioURL||'')).toBe('');
  await plugin.close();
});

test('whole-board product recognition creates a generic assembly without layer selection', async ({page,context}) => {
  test.skip(!!process.env.KALPI_HOSTED_URL,'Uses isolated local creator');
  await page.goto('/');await page.getByRole('button',{name:'Start a project'}).click();await page.getByLabel('Project name').fill('Bottle board verification');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'3. Connect & design',exact:true}).click();await page.getByRole('button',{name:'Create pairing link',exact:true}).click();
  const pairing=await page.locator('#pair-link').inputValue(),plugin=await context.newPage();
  const product=defaultProduct('assembly');product.facts.name='Recognized desk lamp';product.dimensions={width:.18,height:.35,depth:.18};
  await plugin.route('**/api/ai/product-from-design',route=>route.fulfill({json:{document:product,explanation:'Bottle identified',bottleNodeId:'10:3',labelNodeId:null}}));
  await plugin.addInitScript(()=>{
    window.addEventListener('message',e=>{
      const m=e.data;
      // Deliberately omit plugin-ready: conversion must not depend on this handshake.
      if(m.type==='read-product-board') {
        const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;
        const data=atob(canvas.toDataURL('image/png').split(',')[1]);
        window.postMessage({type:'bottle-board',boardId:'10:1',name:'Whole design board',layers:[],texts:'64 mm',fingerprint:'whole-board',bytes:Array.from(data,c=>c.charCodeAt(0))},'*');
      }
      if(m.type==='create-recognized-product') window.postMessage({type:'recognized-bottle-ready',designId:m.design.id},'*');
      if(m.type==='open-studio') window.__studioURL=m.url;
    });
  });
  await plugin.goto(pairing);
  await plugin.getByRole('button',{name:'Convert to 3D ↗',exact:true}).click();
  await expect(plugin.locator('#plugin-viewport canvas')).toBeVisible();
  await plugin.getByText('Product details',{exact:true}).click();
  await expect(plugin.locator('#editor-details [name="name"]')).toHaveValue('Recognized desk lamp');
  await expect(plugin.locator('#editor-details [name="width"]')).toHaveValue('18');
  expect(await plugin.evaluate(()=>window.__studioURL||'')).toBe('');
  await plugin.close();
});

test('Figma reopens with its saved credential after browser storage is cleared', async ({page,browser}) => {
 test.skip(!!process.env.KALPI_HOSTED_URL,'Uses isolated local creator');
 await page.goto('/');await page.getByRole('button',{name:'Start a project'}).click();
 await page.getByLabel('Project name').fill('Persistent Figma connection');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'3. Connect & design',exact:true}).click();
 await page.getByRole('button',{name:'Create pairing link',exact:true}).click();
 const link=await page.locator('#pair-link').inputValue();
 const first=await browser.newContext(), panel=await first.newPage();
 await panel.addInitScript(()=>window.addEventListener('message',e=>{
  if(e.data.type==='save-studio-session')window.__savedSession={url:e.data.url,token:e.data.token};
  if(e.data.type==='restore-studio-session')window.postMessage({type:'studio-session',token:null},'*');
 }));
 await panel.goto(link);
 await expect.poll(()=>panel.evaluate(()=>!!window.__savedSession?.token)).toBe(true);
 const saved=await panel.evaluate(()=>window.__savedSession);
 await first.close();
 const second=await browser.newContext(), reopened=await second.newPage();
 await reopened.addInitScript(saved=>window.addEventListener('message',e=>{
  if(e.data.type==='restore-studio-session')window.postMessage({type:'studio-session',token:saved.token},'*');
 }),saved);
 await reopened.goto(saved.url);
 await expect(reopened.locator('#sync')).toContainText('Connected to Persistent Figma connection');
 await expect(reopened.getByText('Connection needs attention')).toHaveCount(0);
 await second.close();
});


test('Figma native editor → send to shelf → embedded walkable store → vote', async ({page,browser}) => {
 let pairing;
 if(hostedIdentity){
  await page.addInitScript(({token,id})=>{localStorage.setItem('kalpi-spacetime-token',token);localStorage.setItem('kalpi-project',id);},{token:hostedIdentity.serviceCredential,id:hostedProject});
  const code=crypto.randomUUID();await hostedOwner.reducers.createPairing({projectId:hostedProject,code});
  pairing=baseURL+'/plugin.html?project='+hostedProject+'#'+code;
 }else{
  await page.goto('/');await page.getByRole('button',{name:'Start a project'}).click();
  await page.getByLabel('Project name').fill('Direct Figma bridge');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'3. Connect & design',exact:true}).click();
  await page.getByRole('button',{name:'Create pairing link',exact:true}).click();
  pairing=await page.locator('#pair-link').inputValue();
 }
 const ui=readFileSync('figma-plugin/ui.html','utf8').replaceAll('__KALPI_LAUNCH_NONCE__','bridge-fixture').replace('__KALPI_PLUGIN_ID__','kalpi-local-development');
 async function host(saved={}) {
  const context=await browser.newContext({permissions:["local-network-access"]}), host=await context.newPage();
  await context.route('https://www.figma.com/kalpi-bridge-test',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
  host.on('console',m=>{if(m.type()==='error')console.log('Bridge browser error:',m.text().split('#')[0]);});
  host.on('requestfailed',r=>console.log('Bridge request failed:',new URL(r.url()).origin+new URL(r.url()).pathname,r.failure()?.errorText));
  await host.goto('https://www.figma.com/kalpi-bridge-test');
  await host.evaluate(({ui,saved})=>{
   window.saved=saved;window.received=[];
   window.addEventListener('message',e=>{
    if(e.source!==document.querySelector('iframe')?.contentWindow)return;
    const m=e.data.pluginMessage;if(!m)return;
    if(e.origin.startsWith('http://127.0.0.1') && e.data.pluginId!=='kalpi-local-development')return;
    window.received.push(m.type);if(m.type==='remote-design')window.lastRemote=m.design;
    const reply=m=>e.source.postMessage({pluginMessage:{...m,bridgeId:'bridge-fixture'}},'*');
    if(m.type==='bootstrap-ready'&&window.saved.url)reply({type:'saved-panel',url:window.saved.url});
    if(m.type==='restore-studio-session')reply({type:'studio-session',token:window.saved.token||null});
    if(m.type==='save-studio-session')window.saved={url:m.url,token:m.token};
    if(m.type==='ready')reply({type:'plugin-ready',protocol:8});
    if(m.type==='read-product-board'){
     const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;
     reply({type:'bottle-board',boardId:'car-board',name:'Car concept',layers:[],texts:'Length 4400 mm',fingerprint:'car-fixture',bytes:Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0))});
    }
    if(m.type==='create-recognized-product')reply({type:'recognized-bottle-ready',designId:m.design.id});
    if(m.type==='open-studio')window.studioURL=m.url;
   });
   const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.style='width:500px;height:900px';frame.srcdoc=ui;document.body.append(frame);
  },{ui,saved});
  return {context,host};
 }
 const first=await host({url:pairing});
 await expect(first.host.frameLocator('iframe').locator('#sync')).toContainText(hostedIdentity?'Connected to Staging automated verification':'Connected to Direct Figma bridge');
 await expect.poll(()=>first.host.evaluate(()=>!!window.saved.token)).toBe(true);
 const saved=await first.host.evaluate(()=>window.saved);
 await first.context.close();
 const second=await host(saved);
 await expect(second.host.frameLocator('iframe').locator('#sync')).toContainText(hostedIdentity?'Connected to Staging automated verification':'Connected to Direct Figma bridge');
 const product=defaultProduct('bottle');product.facts.name='Figma perfume';product.facts.price=35;
 await second.context.route('**/api/ai/product-from-design',route=>route.fulfill({json:{document:product,explanation:'Car concept',labelNodeId:null}}));
 await second.host.frameLocator('iframe').getByRole('button',{name:'Convert to 3D ↗',exact:true}).click();
 const panel=second.host.frameLocator('iframe');
 await expect(panel.locator('#plugin-viewport canvas')).toBeVisible();
 expect(await second.host.evaluate(()=>window.studioURL||'')).toBe('');
 if(!hostedIdentity)await second.context.route('**/api/ai/edit',async route=>{
  const a=route.request().postDataJSON(),c=await openConnection(saved.token,['SELECT * FROM my_designs']);
  const changes=[{field:'material.color',value:'#774499'}];
  try{await c.reducers.editDesign({id:a.designId,baseRevision:a.baseRevision,changes:JSON.stringify(changes),origin:'agent',operationId:a.operationId});}finally{c.disconnect();}
  await route.fulfill({json:{changes,explanation:'Changed to violet.'}});
 });
 await panel.getByLabel('Describe a 3D change').fill('Set material.color exactly to #774499. Keep every other field unchanged.');
 await panel.locator('#editor-chat button').click();
 await expect(panel.locator('#editor-status')).toContainText('Applied.',{timeout:120000});
 await expect.poll(()=>second.host.evaluate(()=>window.lastRemote&&JSON.parse(window.lastRemote.document).material.color)).toBe('#774499');
 await panel.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(panel.locator('#editor-status')).toContainText('undone');
 await panel.getByRole('button',{name:'Send to shelf',exact:false}).click();
 await expect.poll(()=>second.host.evaluate(()=>window.studioURL||''),{timeout:90000}).toContain('tab=shelf');
 const shelfURL=await second.host.evaluate(()=>window.studioURL);
 await second.host.screenshot({path:'test-results/figma-native-editor.png'});
 await page.goto(shelfURL);await expect(page.getByText('1 selected · actual relative dimensions')).toBeVisible();
 await page.getByRole('button',{name:'Publish selected directions'}).click();
 await expect(page.locator('#store-embed-code')).toBeVisible();
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.getByRole('button',{name:'Copy embed code'}).click();
 const embed=await page.evaluate(()=>navigator.clipboard.readText());expect(embed).toContain('data-store=');
 await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();
 const customer=await browser.newContext({permissions:['local-network-access']}),merchant=await customer.newPage();
 await merchant.route('https://seller.example/catalog',route=>route.fulfill({contentType:'text/html',body:`<html><body><h1>Seller website</h1>${embed}</body></html>`}));
 await merchant.goto('https://seller.example/catalog');
 const store=merchant.frameLocator('iframe');await expect(store.locator('#store-view canvas')).toBeVisible();
 await expect(store.locator('#visitor-count')).toHaveText('1 in this store');
 await store.locator('#store-view canvas').focus();await merchant.keyboard.down('KeyW');
 await expect.poll(async()=>JSON.parse(await store.locator('#store-view').getAttribute('data-position')||'{"z":3}').z).toBeLessThan(2.9);
 await merchant.keyboard.up('KeyW');
 await store.getByRole('button',{name:'Browse products'}).click();
 await store.getByRole('button',{name:'Details & feedback'}).first().click();
 await store.getByLabel('Your answer').selectOption('yes');
 await store.getByLabel('What stands out?').fill('Embedded store verification response');
 await store.getByRole('button',{name:'Share your thoughts'}).click();
 await expect(store.locator('#toast')).toContainText('Your response is saved');
 await merchant.screenshot({path:'test-results/merchant-store-embed.png'});
 await page.getByRole('button',{name:'Results',exact:true}).click();
 await expect(page.getByText('Embedded store verification response')).toBeVisible();
 await page.getByRole('button',{name:'Unpublish',exact:true}).click();
 await expect(store.getByRole('heading',{name:'This store is unavailable.'})).toBeVisible();
 await customer.close();await second.context.close();
});

test('Ioanna detailed model → native editor → exports → embedded store → vote', async ({page,browser}) => {
 let pairing;
 if(hostedIdentity){
  await page.addInitScript(({token,id})=>{localStorage.setItem('kalpi-spacetime-token',token);localStorage.setItem('kalpi-project',id);},{token:hostedIdentity.serviceCredential,id:hostedProject});
  const code=crypto.randomUUID();await hostedOwner.reducers.createPairing({projectId:hostedProject,code});
  pairing=baseURL+'/plugin.html?project='+hostedProject+'#'+code;
 }else{
  await page.goto('/');await page.getByRole('button',{name:'Start a project'}).click();
  await page.getByLabel('Project name').fill('Direct Figma bridge');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'3. Connect & design',exact:true}).click();
  await page.getByRole('button',{name:'Create pairing link',exact:true}).click();
  pairing=await page.locator('#pair-link').inputValue();
 }
 const ui=readFileSync('figma-plugin/ui.html','utf8').replaceAll('__KALPI_LAUNCH_NONCE__','bridge-fixture').replace('__KALPI_PLUGIN_ID__','kalpi-local-development');
 async function host(saved={}) {
  const context=await browser.newContext({permissions:["local-network-access"]}), host=await context.newPage();
  await context.route('https://www.figma.com/kalpi-bridge-test',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
  host.on('console',m=>{if(m.type()==='error')console.log('Bridge browser error:',m.text().split('#')[0]);});
  host.on('requestfailed',r=>console.log('Bridge request failed:',new URL(r.url()).origin+new URL(r.url()).pathname,r.failure()?.errorText));
  await host.goto('https://www.figma.com/kalpi-bridge-test');
  await host.evaluate(({ui,saved})=>{
   window.saved=saved;window.received=[];
   window.addEventListener('message',e=>{
    if(e.source!==document.querySelector('iframe')?.contentWindow)return;
    const m=e.data.pluginMessage;if(!m)return;
    if(e.origin.startsWith('http://127.0.0.1') && e.data.pluginId!=='kalpi-local-development')return;
    window.received.push(m.type);if(m.type==='remote-design')window.lastRemote=m.design;
    const reply=m=>e.source.postMessage({pluginMessage:{...m,bridgeId:'bridge-fixture'}},'*');
    if(m.type==='bootstrap-ready'&&window.saved.url)reply({type:'saved-panel',url:window.saved.url});
    if(m.type==='restore-studio-session')reply({type:'studio-session',token:window.saved.token||null});
    if(m.type==='save-studio-session')window.saved={url:m.url,token:m.token};
    if(m.type==='ready')reply({type:'plugin-ready',protocol:8});
    if(m.type==='read-product-board'){
     const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;
     reply({type:'bottle-board',boardId:'car-board',name:'Car concept',layers:[],texts:'Length 4400 mm',fingerprint:'car-fixture',bytes:Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0))});
    }
    if(m.type==='create-recognized-product')reply({type:'recognized-bottle-ready',designId:m.design.id});
    if(m.type==='open-studio')window.studioURL=m.url;
   });
   const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.style='width:500px;height:900px';frame.srcdoc=ui;document.body.append(frame);
  },{ui,saved});
  return {context,host};
 }
 const first=await host({url:pairing});
 await expect(first.host.frameLocator('iframe').locator('#sync')).toContainText(hostedIdentity?'Connected to Staging automated verification':'Connected to Direct Figma bridge');
 await expect.poll(()=>first.host.evaluate(()=>!!window.saved.token)).toBe(true);
 const saved=await first.host.evaluate(()=>window.saved);
 await first.context.close();
 const second=await host(saved);
 await expect(second.host.frameLocator('iframe').locator('#sync')).toContainText(hostedIdentity?'Connected to Staging automated verification':'Connected to Direct Figma bridge');
 await second.host.frameLocator('iframe').getByText('Choose a detailed product',{exact:true}).click();
 await second.host.frameLocator('iframe').getByRole('button',{name:'Crystal perfume',exact:true}).click();
 const panel=second.host.frameLocator('iframe');
 await expect(panel.locator('#plugin-viewport canvas')).toBeVisible();
 await panel.getByText('Product details',{exact:true}).click();
 await panel.locator('#editor-details [name="price"]').fill('35');
 await panel.getByRole('button',{name:'Apply details',exact:true}).click();
 await expect(panel.locator('#editor-status')).toContainText('Details saved.');
 await panel.getByText('Product details',{exact:true}).click();

 await expect(panel.locator('#plugin-viewport')).toHaveAttribute('data-model-loaded','true',{timeout:30000});
 expect(await second.host.evaluate(()=>window.studioURL||'')).toBe('');
 if(!hostedIdentity)await second.context.route('**/api/ai/edit',async route=>{
  const a=route.request().postDataJSON(),c=await openConnection(saved.token,['SELECT * FROM my_designs']);
  const changes=[{field:'material.color',value:'#774499'}];
  try{await c.reducers.editDesign({id:a.designId,baseRevision:a.baseRevision,changes:JSON.stringify(changes),origin:'agent',operationId:a.operationId});}finally{c.disconnect();}
  await route.fulfill({json:{changes,explanation:'Changed to violet.'}});
 });
 await panel.getByLabel('Describe a 3D change').fill('Set material.color exactly to #774499. Keep every other field unchanged.');
 await panel.locator('#editor-chat button').click();
 await expect(panel.locator('#editor-status')).toContainText('Applied.',{timeout:120000});
 await expect.poll(()=>second.host.evaluate(()=>window.lastRemote&&JSON.parse(window.lastRemote.document).material.color)).toBe('#774499');
 await panel.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(panel.locator('#editor-status')).toContainText('undone');
 await panel.getByRole('button',{name:'Send to shelf',exact:false}).click();
 await expect.poll(()=>second.host.evaluate(()=>window.studioURL||''),{timeout:240000}).toContain('tab=shelf');
 const shelfURL=await second.host.evaluate(()=>window.studioURL);
 await second.host.screenshot({path:'test-results/ioanna-native-editor.png'});
 await page.goto(shelfURL);await expect(page.getByText('1 selected · actual relative dimensions')).toBeVisible();
 await page.getByRole('button',{name:'Publish selected directions'}).click();
 await expect(page.locator('#store-embed-code')).toBeVisible();
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.getByRole('button',{name:'Copy embed code'}).click();
 const embed=await page.evaluate(()=>navigator.clipboard.readText());expect(embed).toContain('data-store=');
 await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();
 const customer=await browser.newContext({permissions:['local-network-access']}),merchant=await customer.newPage();
 await merchant.route('https://seller.example/catalog',route=>route.fulfill({contentType:'text/html',body:`<html><body><h1>Seller website</h1>${embed}</body></html>`}));
 await merchant.goto('https://seller.example/catalog');
 const store=merchant.frameLocator('iframe');await expect(store.locator('#store-view canvas')).toBeVisible();
 await expect(store.locator('#visitor-count')).toHaveText('1 in this store');
 await store.locator('#store-view canvas').focus();await merchant.keyboard.down('KeyW');
 await expect.poll(async()=>JSON.parse(await store.locator('#store-view').getAttribute('data-position')||'{"z":3}').z).toBeLessThan(2.9);
 await merchant.keyboard.up('KeyW');
 await store.getByRole('button',{name:'Browse products'}).click();
 await store.getByRole('button',{name:'Details & feedback'}).first().click();
 await store.getByLabel('Your answer').selectOption('yes');
 await store.getByLabel('What stands out?').fill('Embedded store verification response');
 await store.getByRole('button',{name:'Share your thoughts'}).click();
 await expect(store.locator('#toast')).toContainText('Your response is saved');
 await merchant.screenshot({path:'test-results/ioanna-store-embed.png'});
 await page.getByRole('button',{name:'Results',exact:true}).click();
 await expect(page.getByText('Embedded store verification response')).toBeVisible();
 await page.getByRole('button',{name:'Unpublish',exact:true}).click();
 await expect(store.getByRole('heading',{name:'This store is unavailable.'})).toBeVisible();
 await customer.close();await second.context.close();
});
