import {falWorkflow} from './providers/fal-workflow.js';
import {prepareFalImage} from './providers/fal-prepare.js';
import {importFalModel} from './providers/fal-import.js';
import {falAvailable,submitHunyuan,hunyuanStatus,hunyuanResult} from './providers/fal-model.js';
import {applyChanges,validateProduct} from './shared/product.js';
import {packagingBase} from './shared/packaging.js';
import { identifyProduct } from "./providers/product-from-design.js";
import { identifyBottle } from "./providers/bottle-from-design.js";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import multer from "multer";
import { Readable } from "node:stream";
import { get, put, del, issueSignedToken } from "@vercel/blob";
import {
  assetMetadata,
  validateAsset,
  localAssetPath,
} from "./providers/assets.js";
import { handleUploadPresigned } from "@vercel/blob/client";
import {
  withService,
  openConnection,
  authorize,
  recordStore,
} from "./providers/spacetime.js";
import { proposeEdit, aiAvailable, aiProvider } from "./providers/design-ai.js";
import { ai } from "./providers/ai.js";
const app = express();
app.disable("x-powered-by");
app.use("/models",(req,res,next)=>{res.setHeader("Access-Control-Allow-Origin","*");next();});
// Opaque-origin native Figma UI uses explicit bearer tokens, never cookies.
app.use("/api", (req,res,next)=>{
  if(req.headers.origin === "null") {
    res.setHeader("Access-Control-Allow-Origin","null");
    res.vary("Origin");
    res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
    if(req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
const bearer = (req) =>
  req.headers.authorization?.replace(/^Bearer /, "") || "";
const text = (x, n = 300) =>
  typeof x === "string" ? x.trim().slice(0, n) : "";
const hash = (x) => createHash("sha256").update(x).digest("hex");
const error = (message, status = 400) =>
  Object.assign(Error(message), { status });
const local = (req) =>
  !process.env.VERCEL &&
  ["localhost", "127.0.0.1", "[::1]"].includes(req.hostname) &&
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
const sellerSecret =
  process.env.SELLER_TOKEN ||
  (!process.env.VERCEL && fs.existsSync("data/seller.key")
    ? fs.readFileSync("data/seller.key", "utf8")
    : "");
const equal = (a, b) =>
  a.length === b.length &&
  a.length > 0 &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
app.get("/api/seller/reference/:name", (req, res) => {
  if (!equal(bearer(req), sellerSecret))
    throw error("Seller access required.", 401);
  if (!["perfume-parts.glb", "sage-bottle.glb"].includes(req.params.name))
    throw error("Reference unavailable.", 404);
  res
    .type("model/gltf-binary")
    .sendFile(path.resolve("assets/reference", req.params.name));
});
app.get("/api/config", (req, res) =>
  res.json({
    spacetimeUri: process.env.SPACETIME_URI || "",
    database: process.env.SPACETIME_DATABASE || "",
    authClientId: process.env.SPACETIME_AUTH_CLIENT_ID || "",
    authAuthority:
      process.env.SPACETIME_AUTH_AUTHORITY ||
      "https://auth.spacetimedb.com/oidc",
    ai: aiAvailable(),
    aiProvider: aiProvider(),
    blob: !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
    local: local(req),
  }),
);
app.get("/api/health", (_, res) =>
  res.json({ ok: true, state: "spacetimedb" }),
);
app.get("/api/local-session", (req, res) => {
  if (!local(req) || process.env.SELLER_TOKEN)
    throw error("Use your seller access token.", 403);
  res.json({ token: sellerSecret });
});

const falJobs=falWorkflow({transaction:fn=>withService(async c=>{const s=recordStore(c),value=await fn(s);await s.commit();return value;}),prepare:prepareFalImage,submit:submitHunyuan,status:hunyuanStatus,result:hunyuanResult,importModel:importFalModel,available:()=>falAvailable()&&!!process.env.OPENAI_API_KEY});
const falUser=async req=>{const projectId=req.body?.projectId||req.query.projectId;return {...await authorize(bearer(req),projectId),projectId};};
app.post('/api/fal/quote',async(req,res)=>res.json(await falJobs.quote(await falUser(req),req.body)));
app.get('/api/fal/jobs',async(req,res)=>res.json(await falJobs.list(await falUser(req))));
app.get('/api/fal/jobs/:id',async(req,res)=>res.json(await falJobs.get(await falUser(req),req.params.id)));
app.post('/api/fal/jobs/:id/start',async(req,res)=>res.json(await falJobs.start(await falUser(req),req.params.id,req.body)));
app.post('/api/fal/jobs/:id/opened',async(req,res)=>res.json(await falJobs.acknowledge(await falUser(req),req.params.id)));
app.post('/api/fal/jobs/:id/import',async(req,res)=>res.json(await falJobs.import(await falUser(req),req.params.id)));

app.post(["/api/ai/bottle-from-design", "/api/ai/product-from-design"], async (req, res) => {
  const {projectId, operationId, view} = req.body;
  if (!/^[-a-zA-Z0-9]{8,100}$/.test(operationId || "")) throw error("Provide a request ID.");
  const user = await authorize(bearer(req), projectId);
  const layers = (Array.isArray(req.body.layers) ? req.body.layers : []).slice(0,300).map(n=>({id:text(n.id,80),name:text(n.name,150),type:text(n.type,30),bounds:Array.isArray(n.bounds)&&n.bounds.length===4&&n.bounds.every(v=>Number.isFinite(v)&&Math.abs(v)<=10)?n.bounds:null}));
  const texts = text(req.body.texts,20000);
  if (typeof view !== "string" || view.length > 1400000) throw error("Use a smaller board image.");
  const recognitionType=req.path.endsWith("/product-from-design") ? "product-recognition" : "bottle-recognition";
  const key = `${recognitionType}:${user.identity}:${operationId}`;
  const digest = hash(JSON.stringify({projectId,view,layers,texts}));
  const prior = await withService(async c => {
    const store = recordStore(c), old = store.get(key);
    if (old && old.digest !== digest) throw error("Request ID reused with different artwork.",409);
    if (old?.result) return {...old.result, cacheHit:true};
    const cached=store.all(recognitionType).find(r=>r.identity===user.identity && r.digest===digest && r.result && r.pipelineVersion===1);
    if(cached) return {...cached.result,cacheHit:true};
    if(store.all(recognitionType).some(r=>r.identity===user.identity && r.digest===digest && !r.result && r.startedAt>Date.now()-180000)) throw error('This board is already being converted. Wait for that request; another generation was not started.',409);
    if (old?.startedAt > Date.now()-180000) throw error("Recognition is still running.",409);
    if ([...store.all("bottle-recognition"),...store.all("product-recognition")].filter(r=>r.identity===user.identity && r.startedAt>Date.now()-3600000).length>=20) throw error("Recognition limit reached. Try again later.",429);
    store.put(recognitionType,{id:key,identity:user.identity,digest,pipelineVersion:1,startedAt:Date.now()});
    await store.commit(); return null;
  });
  if (prior) return res.json(prior);
  const generationStarted=Date.now();
  const result = await (recognitionType === "product-recognition" ? identifyProduct : identifyBottle)({view,layers,texts});
  result.generation={mode:'approximate-concept',durationMs:Date.now()-generationStarted};
  result.cacheHit=false;
  await withService(async c=>{
    const store=recordStore(c), row=store.get(key);
    store.put(recognitionType,{...row,result}); await store.commit();
  });
  res.json(result);
});
app.post('/api/ai/packaging', async (req,res)=>{
 const {projectId,sourceDesignId,family='bottle',prompt,operationId}=req.body;
 if(!text(prompt,4000)||!/^[-a-zA-Z0-9]{8,100}$/.test(operationId||''))throw error('Describe the packaging and provide a request ID.');
 const user=await authorize(bearer(req),projectId),key=`packaging:${user.identity}:${operationId}`;
 const source=sourceDesignId?user.designs.find(d=>d.id===sourceDesignId&&d.projectId===projectId):null;
 if(sourceDesignId&&!source)throw error('Source design not found.',404);
 const digest=hash(JSON.stringify({projectId,sourceDesignId,family,prompt}));
 let stored=await withService(async c=>{
   const store=recordStore(c),old=store.get(key);
   if(old&&old.digest!==digest)throw error('This retry ID belongs to another request.',409);
   if(old?.status==='complete'||old?.result)return old;
   if(old?.status==='pending'&&old.startedAt>Date.now()-90000)throw error('This design is still being created.',409);
   if(store.all('ai-request').filter(r=>r.identity===user.identity&&r.startedAt>Date.now()-3600000).length>=30)throw error('This account has reached 30 AI requests this hour.',429);
   const row={id:key,digest,identity:user.identity,status:'pending',startedAt:Date.now()};store.put('ai-request',row);await store.commit();return row;
 });
 if(stored.status==='complete')return res.json(stored.result);
 try{
   let result=stored.result;
   if(!result){
     const base=packagingBase(family,source?JSON.parse(source.document):null);
     const edit=await proposeEdit({prompt:'Create an editable packaging concept from this brief. Choose reasonable proportions and finishes, and apply the requested shape and color now. '+prompt,document:base,selectedPart:'Body'});
     result=edit.changes?{designId:operationId,document:applyChanges(base,edit.changes,{agent:true}),explanation:edit.explanation}:edit;
     await withService(async c=>{const store=recordStore(c);stored={...stored,result,status:'proposed'};store.put('ai-request',stored);await store.commit();});
   }
   if(result.designId){
     const c=await openConnection(bearer(req),['SELECT * FROM my_designs']);
     try{if(![...c.db.myDesigns.iter()].some(d=>d.id===operationId))await c.reducers.createDesign({id:operationId,projectId,kind:result.document.kind,document:JSON.stringify(result.document)});}finally{c.disconnect();}
   }
   await withService(async c=>{const store=recordStore(c);store.put('ai-request',{...stored,status:'complete',result});await store.commit();});
   res.json(result);
 }catch(e){
   if(stored.status==='pending')await withService(async c=>{const store=recordStore(c);store.put('ai-request',{...stored,status:'failed'});await store.commit();});
   throw e;
 }
});

// Read-only design critique: validated product context, scoped access and bounded requests.
app.post('/api/ai/recommend', async (req,res) => {
 const {projectId,document,view}=req.body;
 const user=await authorize(bearer(req),projectId);
 const product=validateProduct(document);
 const key=`recommend-v2:${user.identity}:${hash(JSON.stringify(product))}`;
 const cached=await withService(async c=>{
  const store=recordStore(c),old=store.get(key);
  if(old?.result)return old.result;
  if(old?.startedAt>Date.now()-90000)throw error('This review is still running. Please wait a moment.',429);
  if(store.all('ai-recommendation').filter(r=>r.identity===user.identity&&r.startedAt>Date.now()-3600000).length>=30)throw error('Recommendation limit reached. Please try later.',429);
  store.put('ai-recommendation',{id:key,identity:user.identity,startedAt:Date.now()});await store.commit();return null;
 });
 if(cached)return res.json(cached);
 const result=await proposeEdit({document:product,view,intent:'review',selectedPart:'Body',prompt:'Recommend the single most useful visual improvement for this specific product. Explain what you observe, the change, why it may help, and its tradeoff. Keep it concise and actionable.'});
 await withService(async c=>{const store=recordStore(c);store.put('ai-recommendation',{...store.get(key),result});await store.commit();});
 res.json(result);
});

app.post("/api/ai/edit", async (req, res) => {
  const {
    projectId,
    designId,
    baseRevision,
    prompt,
    selectedPart,
    view,
    operationId,
    intent = "edit",
    reviewOperationId,
  } = req.body;
  if (!text(prompt, 4000) || !/^[-a-zA-Z0-9]{8,100}$/.test(operationId || ""))
    throw error("Describe the change and provide a request ID.");
  if(!["edit","review"].includes(intent))throw error("Choose edit or review.");
  const user = await authorize(bearer(req), projectId),
    d = user.designs.find(
      (d) => d.id === designId && d.projectId === projectId,
    );
  if (!d) throw error("Design not found.", 404);
  const key = `ai:${user.identity}:${operationId}`,
    digest = hash(
      JSON.stringify({
        projectId,
        designId,
        baseRevision,
        prompt,
        selectedPart, intent, reviewOperationId,
      }),
    );
  let stored = await withService(async (c) => {
    const s = recordStore(c),
      old = s.get(key);
    if (old && old.digest !== digest)
      throw error("This retry ID belongs to another request.", 409);
    if (old?.status === "complete" || old?.status === "proposed") return old;
    if (old?.status === "pending" && old.startedAt > Date.now() - 90000)
      throw error("This edit is still running. Retry in a moment.", 409);
    if (d.revision !== baseRevision)
      throw error("CONFLICT: Reload the current design.", 409);
    const recent = s
      .all("ai-request")
      .filter(
        (r) =>
          r.identity === user.identity && r.startedAt > Date.now() - 3600000,
      );
    if (recent.length >= 30)
      throw error(
        "This account has reached 30 AI edits this hour. Try again later.",
        429,
      );
    const row = {
      id: key,
      digest,
      identity: user.identity,
      status: "pending", projectId, designId, baseRevision, intent,
      startedAt: Date.now(),
    };
    s.put("ai-request", row);
    await s.commit();
    return row;
  });
  if (stored.status === "complete") return res.json(stored.result);
  try {
    const history = await withService((c) =>
      [...c.db.myConversations.iter()]
        .filter((x) => x.projectId === projectId && x.designId === designId)
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
        .slice(-6)
        .map((x) => ({ request: x.prompt, response: x.response })),
    );
    let reviewed=null;
    if(reviewOperationId){
      reviewed=await withService(c=>recordStore(c).get(`ai:${user.identity}:${reviewOperationId}`));
      if(!reviewed||reviewed.intent!=='review'||reviewed.projectId!==projectId||reviewed.designId!==designId||reviewed.baseRevision!==baseRevision||!reviewed.result?.changes)throw error('This suggestion is stale. Review the current design again.',409);
    }
    const result =
      stored.result || reviewed?.result ||
      (await proposeEdit({
        prompt: text(prompt, 4000),
        document: JSON.parse(d.document),
        selectedPart: text(selectedPart),
        view,
        history, intent,
      }));
    if (!stored.result)
      await withService(async (c) => {
        const s = recordStore(c);
        stored = { ...stored, status: "proposed", result };
        s.put("ai-request", stored);
        await s.commit();
      });
    if (result.changes && intent!=="review") {
      const c = await openConnection(bearer(req), ["SELECT * FROM my_designs"]);
      try {
        await c.reducers.editDesign({
          id: designId,
          baseRevision,
          changes: JSON.stringify(result.changes),
          origin: "agent",
          operationId,
        });
      } finally {
        c.disconnect();
      }
    }
    await withService(async (c) => {
      await c.reducers.recordConversation({
        id: key,
        projectId,
        designId,
        prompt: text(prompt, 4000),
        response: result.explanation || result.clarification,
        status: intent==="review" ? "suggested" : result.changes ? "applied" : "clarification",
      });
      const s = recordStore(c);
      s.put("ai-request", { ...stored, status: "complete", result });
      await s.commit();
    });
    res.json(result);
  } catch (e) {
    if (stored.status === "pending")
      await withService(async (c) => {
        const s = recordStore(c);
        s.put("ai-request", { ...stored, status: "failed" });
        await s.commit();
      });
    throw e;
  }
});
async function availableAsset(p) {
  await withService((c) => {
    if ([...c.db.myAssets.iter()].some((a) => a.id === p.id))
      throw error(
        "This saved asset already exists. Use a new identifier.",
        409,
      );
  });
}
app.post("/api/uploads", async (req, res) => {
  const json = await handleUploadPresigned({
    body: req.body,
    request: req,
    getSignedToken: async (pathname, clientPayload) => {
      const p = assetMetadata(JSON.parse(clientPayload || "{}"));
      await authorize(bearer(req), p.projectId);
      await availableAsset(p);
      if (pathname !== `${p.projectId}/${p.id}.${p.extension}`)
        throw error("Invalid asset path.");
      const constraints = {
        pathname,
        operations: ["put"],
        allowedContentTypes: [p.mime],
        maximumSizeInBytes: 30 * 1024 * 1024,
        validUntil: Date.now() + 300000,
      };
      return {
        token: await issueSignedToken(constraints),
        urlOptions: {
          allowedContentTypes: [p.mime],
          maximumSizeInBytes: constraints.maximumSizeInBytes,
          validUntil: constraints.validUntil,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify(p),
        },
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const p = assetMetadata(JSON.parse(tokenPayload || "{}")),
        file = await get(blob.pathname, { access: "private" });
      if (!file || file.statusCode !== 200)
        throw error("Uploaded asset unavailable.");
      try {
        const bytes = validateAsset(
          await new Response(file.stream).arrayBuffer(),
          p.mime,
        );
        await withService((c) =>
          c.reducers.registerAsset({
            id: p.id,
            projectId: p.projectId,
            path: blob.pathname,
            mime: p.mime,
            size: BigInt(bytes.length),
          }),
        );
      } catch (e) {
        await del(blob.pathname);
        throw e;
      }
    },
  });
  res.json(json);
});
// Imported meshes use the same direct-upload path, without passing large files through a function.
app.post("/api/seller/uploads", async (req, res) => {
  const json = await handleUploadPresigned({
    body: req.body,
    request: req,
    getSignedToken: async (pathname, payload) => {
      if (!equal(bearer(req), sellerSecret))
        throw error("Seller access required.", 401);
      const p = JSON.parse(payload || "{}");
      if (
        !/^[-a-zA-Z0-9]{8,150}$/.test(p.id || "") ||
        !["model/gltf-binary", "image/png", "image/jpeg"].includes(p.mime)
      )
        throw error("Choose GLB, PNG or JPEG.");
      const ext =
        p.mime === "model/gltf-binary"
          ? "glb"
          : p.mime === "image/png"
            ? "png"
            : "jpg";
      if (pathname !== `legacy/${p.id}.${ext}`)
        throw error("Invalid asset path.");
      await withService((c) => {
        if (recordStore(c).get(p.id)) throw error("Asset already exists.", 409);
      });
      return {
        token: await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: [p.mime],
          maximumSizeInBytes: 30 * 1024 * 1024,
          validUntil: Date.now() + 300000,
        }),
        urlOptions: {
          allowedContentTypes: [p.mime],
          maximumSizeInBytes: 30 * 1024 * 1024,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({
            id: p.id,
            mime: p.mime,
            name: text(p.name, 150),
          }),
        },
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      const p = JSON.parse(tokenPayload),
        file = await get(blob.pathname, { access: "private" });
      if (!file || file.statusCode !== 200)
        throw error("Uploaded asset unavailable.");
      try {
        const bytes = validateAsset(
          await new Response(file.stream).arrayBuffer(),
          p.mime,
        );
        await withService(async (c) => {
          const store = recordStore(c),
            existing = store.get(p.id);
          if (existing) {
            if (existing.path === blob.pathname) return;
            throw error("Asset already exists.", 409);
          }
          store.put("asset", {
            id: p.id,
            type: p.mime === "model/gltf-binary" ? "model" : "image",
            path: blob.pathname,
            name: p.name,
            contentHash: hash(bytes),
            url: "/assets/" + p.id,
          });
          await store.commit();
        });
      } catch (e) {
        await del(blob.pathname);
        throw e;
      }
    },
  });
  res.json(json);
});
app.get("/api/seller/assets/:id", async (req, res) => {
  if (!equal(bearer(req), sellerSecret))
    throw error("Seller access required.", 401);
  const asset = await withService((c) => {
    const store = recordStore(c);
    return store.all("asset").find((a) => a.id === req.params.id);
  });
  if (!asset) throw error("Asset registration pending.", 404);
  res.json(asset);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});
app.post("/api/local-assets", upload.single("file"), async (req, res) => {
  if (!local(req)) throw error("Local uploads are disabled.", 403);
  const p = assetMetadata(req.body);
  await authorize(bearer(req), p.projectId);
  await availableAsset(p);
  if (!req.file) throw error("Choose a file.");
  const bytes = validateAsset(req.file.buffer, p.mime),
    filename = localAssetPath(p.extension);
  fs.mkdirSync("data/uploads", { recursive: true });
  fs.writeFileSync(filename, bytes, { flag: "wx" });
  try {
    await withService((c) =>
      c.reducers.registerAsset({
        id: p.id,
        projectId: p.projectId,
        path: filename,
        mime: p.mime,
        size: BigInt(bytes.length),
      }),
    );
  } catch (e) {
    fs.unlinkSync(filename);
    throw e;
  }
  res.json({ id: p.id });
});
app.get("/api/assets/:id", async (req, res) => {
  let a = await withService((c) =>
    [...c.db.myAssets.iter()].find((a) => a.id === req.params.id),
  );
  if (!a) throw error("Asset not found.", 404);
  if (req.query.publication) {
    await withService((c) => {
      const p = [...c.db.myPublications.iter()].find(
        (p) => p.id === req.query.publication && p.published,
      );
      if (!p || a.projectId !== p.projectId)
        throw error("Publication unavailable.", 404);
      const s = JSON.parse(p.snapshot);
      if (
        !s.versions.some(
          (v) =>
            v.document.label.assetId === a.id ||
            v.document.shape?.modelId === "asset:" + a.id ||
            a.id === `${v.id}-glb` ||
            a.id === `${v.id}-usdz`,
        )
      )
        throw error("Asset is not in this publication.", 404);
    });
  } else await authorize(bearer(req), a.projectId);
  res.set("Cache-Control", "private, no-store");
  res.type(a.mime);
  if (a.path.startsWith("data/") && !process.env.VERCEL)
    return res.sendFile(path.resolve(a.path));
  const blob = await get(a.path, { access: "private" });
  if (!blob || blob.statusCode !== 200) throw error("Asset unavailable.", 404);
  Readable.fromWeb(blob.stream).pipe(res);
});
// Existing shelves and embeds keep their original API and IDs. Their records now live in SpacetimeDB.
async function legacyRoute(req, res, fn) {
  if (req.path.startsWith("/api/seller") && !equal(bearer(req), sellerSecret))
    throw error("Seller access required.", 401);
  const result = await withService(async (c) => {
    const store = recordStore(c);
    const value = await fn(store);
    await store.commit();
    return value;
  });
  res.json(result);
}
const route = (method, url, fn) =>
  app[method](url, (req, res) => legacyRoute(req, res, (s) => fn(req, s)));
const owned = (s, id, kind) => {
  const x = s.get(id);
  return x && s.all(kind).some((r) => r.id === id) ? x : null;
};
const op = (s, req, kind, scope, payload) => {
  if (!req.body.idempotencyKey) return null;
  const key = req.body.idempotencyKey;
  if (!/^[\w-]{8,80}$/.test(key)) throw error("Invalid operation key.");
  const id = hash(`${scope}:${kind}:${key}`),
    digest = hash(JSON.stringify(payload)),
    old = s.get(id);
  if (old && old.digest !== digest)
    throw error("This retry key belongs to different content.", 409);
  return { id, digest, previous: old?.result };
};
const result = (s, kind, row, operation) => {
  s.put(kind, row);
  if (operation)
    s.put("operation", {
      id: operation.id,
      digest: operation.digest,
      result: row,
    });
  return row;
};
route("get", "/api/seller/state", (_, s) => ({
  projects: s.all("project"),
  versions: s.all("version"),
  shelves: s.all("shelf"),
  responses: s.all("response").map(({ email, ...r }) => r),
  views: s.all("view"),
  integrations: {
    ai: !!process.env.ANTHROPIC_API_KEY,
    shopify: false,
    figma: false,
  },
}));
route("post", "/api/seller/projects", (req, s) => {
  const name = text(req.body.name, 80);
  if (!name) throw error("Give your project a name.");
  return s.put("project", {
    id: randomUUID(),
    merchantId: "local-merchant",
    name,
    category: text(req.body.category) || "Perfume",
    createdAt: new Date().toISOString(),
    facts: {},
  });
});
app.post("/api/seller/assets", upload.single("file"), (req, res) =>
  legacyRoute(req, res, async (s) => {
    if (!req.file) throw error("Choose a GLB or PNG/JPEG artwork.");
    const b = req.file.buffer;
    const model = b.length >= 20 && b.readUInt32LE(0) === 0x46546c67;
    const image =
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      (b[0] === 255 && b[1] === 216);
    if (!model && !image) throw error("Use GLB or PNG/JPEG.");
    if (model) {
      try {
        const g = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
        if (
          b.readUInt32LE(4) !== 2 ||
          b.readUInt32LE(8) !== b.length ||
          [...(g.buffers || []), ...(g.images || [])].some(
            (x) => x.uri && !x.uri.startsWith("data:"),
          ) ||
          (g.extensionsRequired || []).some(
            (x) =>
              ![
                "KHR_mesh_quantization",
                "EXT_meshopt_compression",
                "EXT_texture_webp",
                "KHR_materials_transmission",
                "KHR_materials_volume",
                "KHR_materials_ior",
                "KHR_materials_clearcoat",
              ].includes(x),
          )
        )
          throw 0;
      } catch {
        throw error(
          "Use a self-contained glTF 2.0 model with supported extensions.",
        );
      }
    }
    const id = randomUUID(),
      ext = model ? "glb" : b[0] === 255 ? "jpg" : "png";
    let filename = `data/uploads/${id}.${ext}`;
    if (process.env.VERCEL) {
      filename = (await put(`legacy/${id}.${ext}`, b, { access: "private" }))
        .pathname;
    } else {
      fs.mkdirSync("data/uploads", { recursive: true });
      fs.writeFileSync(filename, b);
    }
    return s.put("asset", {
      id,
      type: model ? "model" : "image",
      path: filename,
      name: text(req.file.originalname),
      contentHash: hash(b),
      url: "/assets/" + id,
    });
  }),
);
route("post", "/api/seller/versions", (req, s) => {
  const b = req.body,
    p = owned(s, b.projectId, "project");
  if (!p) throw error("Project not found.", 404);
  const source =
    b.source === "sample"
      ? "sample"
      : owned(s, b.source, "asset")?.type === "model"
        ? b.source
        : null;
  if (!source) throw error("Import a GLB first.");
  const color = b.color || "#87916b";
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw error("Invalid color.");
  const image = b.labelAsset ? owned(s, b.labelAsset, "asset") : null;
  if (b.labelAsset && image?.type !== "image") throw error("Label not found.");
  const num = (v, d) =>
    v !== null && Number.isFinite(Number(v))
      ? Math.max(0, Math.min(1, Number(v)))
      : d;
  const sourceReference =
    b.sourceReference?.provider === "figma"
      ? {
          provider: "figma",
          fileKey: text(b.sourceReference.fileKey, 100) || null,
          nodeId: text(b.sourceReference.nodeId, 100),
          nodeName: text(b.sourceReference.nodeName, 200),
          exportedAt: text(b.sourceReference.exportedAt, 50),
        }
      : null;
  const details = {
    projectId: p.id,
    source,
    name: text(b.name, 80) || "Untitled version",
    color,
    roughness: num(b.roughness, 0.3),
    metalness: num(b.metalness, 0),
    label: text(b.label, 60) || "S O L A",
    sourceReference,
  };
  const o = op(s, req, "version", p.id, {
    ...details,
    labelHash: image?.contentHash || image?.id || null,
  });
  if (o?.previous) return o.previous;
  return result(
    s,
    "version",
    {
      id: randomUUID(),
      ...details,
      labelAsset: image?.id || null,
      createdAt: new Date().toISOString(),
    },
    o,
  );
});
route("delete", "/api/seller/versions/:id", (req, s) => {
  if (!owned(s, req.params.id, "version"))
    throw error("Version not found.", 404);
  s.remove(req.params.id);
  return { ok: true };
});
route("post", "/api/seller/projects/:id/facts", (req, s) => {
  const p = owned(s, req.params.id, "project");
  if (!p) throw error("Project not found.", 404);
  p.facts = Object.fromEntries(
    [
      "dimensions",
      "materials",
      "title",
      "description",
      "price",
      "currency",
      "stock",
    ].map((k) => [k, text(req.body[k], k === "description" ? 3000 : 300)]),
  );
  p.facts.available = req.body.available === true;
  return s.put("project", p);
});
route("post", "/api/seller/shelves", (req, s) => {
  const p = owned(s, req.body.projectId, "project");
  if (!p || !Array.isArray(req.body.versionIds))
    throw error("Select 1–8 versions.");
  const ids = [...new Set(req.body.versionIds)];
  if (!ids.length || ids.length > 8) throw error("Select 1–8 versions.");
  const o = op(s, req, "shelf", p.id, { versionIds: ids.slice().sort() });
  if (o?.previous) {
    const prior = s.get(o.previous.id);
    if (!prior?.published) throw error("This shelf was unpublished.", 409);
    return prior;
  }
  const versions = ids.map((id) => owned(s, id, "version"));
  if (versions.some((v) => v?.projectId !== p.id))
    throw error("Every version must belong to this project.");
  return result(
    s,
    "shelf",
    {
      id: randomUUID(),
      projectId: p.id,
      name: p.name,
      versions,
      facts: p.facts,
      published: true,
      createdAt: new Date().toISOString(),
    },
    o,
  );
});
route("post", "/api/seller/shelves/:id/unpublish", (req, s) => {
  const p = owned(s, req.params.id, "shelf");
  if (!p) throw error("Shelf missing.", 404);
  return s.put("shelf", { ...p, published: false });
});
route("post", "/api/seller/approve", (req, s) => {
  const p = owned(s, req.body.projectId, "project"),
    v =
      owned(s, req.body.versionId, "version") ||
      s
        .all("shelf")
        .filter((x) => x.projectId === p?.id)
        .flatMap((x) => x.versions)
        .find((v) => v.id === req.body.versionId);
  if (!p || v?.projectId !== p.id) throw error("Version missing.");
  p.approved = v;
  return s.put("project", p);
});
route("get", "/api/seller/export/:id", (req, s) => {
  const p = owned(s, req.params.id, "project");
  if (!p?.approved) throw error("Approve a version first.");
  return {
    status: "Concept review, not manufacturing CAD",
    project: p,
    unresolved: ["Verify dimensions and manufacturing specifications"],
  };
});
route("post", "/api/seller/summary/:id", async (req, s) => {
  if (!ai.available) throw error("AI summaries are not configured.", 503);
  const shelf = owned(s, req.params.id, "shelf");
  if (!shelf) throw error("Shelf missing.", 404);
  const responses = s
    .all("response")
    .filter((r) => r.shelfId === shelf.id)
    .map(({ session, email, ...r }) => r);
  return {
    summary: await ai.summarize({
      versions: shelf.versions,
      views: s.all("view").filter((v) => v.shelfId === shelf.id).length,
      responses,
    }),
    evidence: responses.map((r) => r.id),
  };
});
route("get", "/api/shelves/:id", (req, s) => {
  const p = owned(s, req.params.id, "shelf");
  if (!p?.published) throw error("Shelf unavailable.", 404);
  return {
    id: p.id,
    name: p.name,
    facts: p.facts,
    versions: p.versions.map(({ sourceReference, ...v }) => ({
      ...v,
      designOrigin: sourceReference?.provider || null,
      modelUrl: `/public-assets/${p.id}/${v.source}`,
      labelUrl: v.labelAsset ? `/public-assets/${p.id}/${v.labelAsset}` : null,
    })),
  };
});
const session = (req) =>
  /^[a-zA-Z0-9-]{16,80}$/.test(req.body.session || "")
    ? hash(req.body.session)
    : null;
route("post", "/api/shelves/:id/views", (req, s) => {
  const p = owned(s, req.params.id, "shelf"),
    ss = session(req);
  if (!p?.published || !ss) throw error("Shelf or session unavailable.");
  s.put("view", {
    id: hash(`${p.id}:${ss}:view`),
    shelfId: p.id,
    session: ss,
    createdAt: new Date().toISOString(),
  });
  return { ok: true };
});
route("post", "/api/shelves/:id/responses", (req, s) => {
  const p = owned(s, req.params.id, "shelf"),
    ss = session(req),
    b = req.body;
  if (!p?.published || !ss) throw error("Shelf or session unavailable.");
  if (b.choice !== "none" && !p.versions.some((v) => v.id === b.choice))
    throw error("Choose a version or none.");
  const email = text(b.email, 254);
  if (email && (!b.consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    throw error("A valid email and consent are required.");
  const id = hash(`${p.id}:${ss}:response`);
  s.put("response", {
    id,
    shelfId: p.id,
    projectId: p.projectId,
    choice: b.choice,
    comment: text(b.comment, 2000),
    session: ss,
    waitlist: !!email,
    createdAt: new Date().toISOString(),
  });
  if (email)
    s.put("signup", {
      id: id + "-signup",
      email,
      shelfId: p.id,
      consentAt: new Date().toISOString(),
    });
  else s.remove(id + "-signup");
  return { ok: true, id };
});
async function legacyAsset(req, res, publicAccess) {
  const a = await withService((c) => {
    const s = recordStore(c);
    if (publicAccess) {
      const p = owned(s, req.params.shelf, "shelf");
      if (
        !p?.published ||
        !p.versions.some(
          (v) => v.source === req.params.id || v.labelAsset === req.params.id,
        )
      )
        throw error("Asset unavailable.", 404);
    } else if (!equal(bearer(req), sellerSecret))
      throw error("Seller access required.", 401);
    return req.params.id === "sample"
      ? { path: "data/uploads/sample.glb" }
      : owned(s, req.params.id, "asset");
  });
  if (!a) throw error("Asset missing.", 404);
  res.set("Cache-Control", "private,no-store");
  if (a.path.startsWith("data/") && !process.env.VERCEL)
    return res.sendFile(path.resolve(a.path));
  if (a.path === "data/uploads/sample.glb")
    return res.sendFile(path.resolve(a.path));
  const blob = await get(a.path, { access: "private" });
  if (!blob || blob.statusCode !== 200) throw error("Asset missing.", 404);
  res.type(blob.blob.contentType);
  Readable.fromWeb(blob.stream).pipe(res);
}
app.get("/assets/:id", (req, res) => legacyAsset(req, res, false));
app.get("/public-assets/:shelf/:id", (req, res) => legacyAsset(req, res, true));
app.get("/sample.glb", (_, res) =>
  res.sendFile(path.resolve("data/uploads/sample.glb")),
);
app.use("/vendor", express.static("node_modules/three"));
app.use("/figma-plugin", express.static("figma-plugin"));
app.use(express.static("public"));
app.get(["/shelf/:id", "/merchant/:id", "/legacy"], (_, res) =>
  res.sendFile(path.resolve("public/legacy.html")),
);
app.get(
  ["/", "/studio", "/store/:id", "/auth/start", "/auth/callback"],
  (_, res) => {res.set("Cache-Control", "no-cache, must-revalidate");res.sendFile(path.resolve("public/studio.html"));},
);
app.get("/ar/:publication/:version", (_, res) =>
  res.sendFile(path.resolve("public/ar.html")),
);
app.use((e, req, res, next) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      path: req.path,
      message: e.message,
    }),
  );
  if (!res.headersSent)
    res
      .status(e.status || (String(e.message).includes("CONFLICT") ? 409 : 400))
      .json({ error: e.message || "Request failed." });
});
if (!process.env.VERCEL)
  app.listen(
    Number(process.env.PORT) || 3000,
    process.env.HOST || "127.0.0.1",
    () =>
      console.log(
        `Kalpi: http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3000}`,
      ),
  );
export default app;
