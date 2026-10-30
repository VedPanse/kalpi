import { ScheduleAt } from "spacetimedb";
import { schema, table, t, SenderError } from "spacetimedb/server";
import {
  defaultProduct,
  validateProduct,
  applyChanges,
  defaultLayout,
  validateLayout,
  publicProduct,
  isHandheld,
} from "../../shared/product.js";

const admin = table({ name: "admin" }, { identity: t.identity().primaryKey() });
const member = table(
  { name: "member" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    identity: t.identity(),
    role: t.string(),
  },
);
const project = table(
  { name: "project" },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    figmaUrl: t.string(),
    owner: t.identity(),
    createdAt: t.u64(),
  },
);
const design = table(
  { name: "design" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    revision: t.u32(),
    document: t.string(),
    origin: t.string(),
    updatedAt: t.u64(),
  },
);
const revision = table(
  { name: "revision" },
  {
    id: t.string().primaryKey(),
    designId: t.string().index("btree"),
    projectId: t.string(),
    revision: t.u32(),
    document: t.string(),
    origin: t.string(),
    createdAt: t.u64(),
  },
);
const version = table(
  { name: "version" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    designId: t.string(),
    name: t.string(),
    document: t.string(),
    revision: t.u32(),
    createdAt: t.u64(),
  },
);
const layout = table(
  { name: "layout" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    revision: t.u32(),
    document: t.string(),
  },
);
const publication = table(
  { name: "publication" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    name: t.string(),
    snapshot: t.string(),
    published: t.bool(),
    createdAt: t.u64(),
  },
);
const room = table(
  { name: "room" },
  { id: t.string().primaryKey(), publicationId: t.string().index("btree") },
);
const visitor = table(
  { name: "visitor" },
  {
    id: t.string().primaryKey(),
    roomId: t.string().index("btree"),
    identity: t.identity(),
    connection: t.connectionId(),
    name: t.string(),
    x: t.f64(),
    z: t.f64(),
    yaw: t.f64(),
    sequence: t.u32(),
    lastSeen: t.u64(),
  },
);
const hold = table(
  { name: "hold" },
  {
    id: t.string().primaryKey(),
    roomId: t.string().index("btree"),
    instanceId: t.string(),
    holder: t.identity(),
    expiresAt: t.u64(),
  },
);
const vote = table(
  { name: "vote" },
  {
    id: t.string().primaryKey(),
    publicationId: t.string().index("btree"),
    projectId: t.string(),
    versionId: t.string(),
    identity: t.identity(),
    intent: t.string(),
    price: t.f64(),
    currency: t.string(),
    preferred: t.bool(),
    comment: t.string(),
    updatedAt: t.u64(),
  },
);
const pairing = table(
  { name: "pairing" },
  {
    code: t.string().primaryKey(),
    projectId: t.string(),
    expiresAt: t.u64(),
    used: t.bool(),
  },
);
const operation = table(
  { name: "operation" },
  { id: t.string().primaryKey(), digest: t.string() },
);
const conversation = table(
  { name: "conversation" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    designId: t.string(),
    prompt: t.string(),
    response: t.string(),
    status: t.string(),
    createdAt: t.u64(),
  },
);
const legacy = table(
  { name: "legacy" },
  { id: t.string().primaryKey(), kind: t.string(), body: t.string() },
);
const asset = table(
  { name: "asset" },
  {
    id: t.string().primaryKey(),
    projectId: t.string().index("btree"),
    path: t.string(),
    mime: t.string(),
    size: t.u64(),
    status: t.string(),
  },
);
const cleanup = table(
  { name: "cleanup" },
  { scheduledId: t.u64().primaryKey(), scheduledAt: t.scheduleAt() },
);
const db = schema(
  {
    cleanup,
    admin,
    member,
    project,
    design,
    revision,
    version,
    layout,
    publication,
    room,
    visitor,
    hold,
    vote,
    pairing,
    operation,
    conversation,
    legacy,
    asset,
  },
  {
    env: {
      ALLOW_LOCAL_CREATORS: t.string().optional(),
      AUTH_ISSUER: t.string().optional(),
      AUTH_AUDIENCE: t.string().optional(),
    },
  },
);
export default db;
const now = (ctx: any) => ctx.timestamp.microsSinceUnixEpoch / 1000n;
const uid = (ctx: any) => ctx.sender.toHexString();
const all = (ctx: any, name: string) =>
  Array.from(ctx.db[name].iter()) as any[];
const isAdmin = (ctx: any) => !!ctx.db.admin.identity.find(ctx.sender);
function canEdit(ctx: any, pid: string) {
  return isAdmin(ctx) || !!ctx.db.member.id.find(pid + ":" + uid(ctx));
}
function requireEdit(ctx: any, pid: string) {
  if (!canEdit(ctx, pid)) throw new SenderError("Workspace access required.");
}
function requireCreator(ctx: any) {
  if (isAdmin(ctx) || ctx.env.ALLOW_LOCAL_CREATORS === "true") return;
  const jwt = ctx.senderAuth.jwt;
  if (
    !ctx.env.AUTH_AUDIENCE ||
    !jwt ||
    jwt.issuer !==
      (ctx.env.AUTH_ISSUER || "https://auth.spacetimedb.com/oidc") ||
    !jwt.audience.includes(ctx.env.AUTH_AUDIENCE)
  )
    throw new SenderError("Sign in with your creator account first.");
}
function checkArtwork(ctx: any, pid: string, doc: any) {
  if (doc.shape?.modelId?.startsWith("asset:")) {
    const a = ctx.db.asset.id.find(doc.shape.modelId.slice(6));
    if (a?.projectId !== pid || a?.mime !== "model/gltf-binary") throw new SenderError("Model must belong to this workspace.");
  }
  if (doc.label.assetId) {
    const a = ctx.db.asset.id.find(doc.label.assetId);
    if (a?.projectId !== pid || !["image/png", "image/jpeg"].includes(a.mime))
      throw new SenderError(
        "Artwork must be an image uploaded to this workspace.",
      );
  }
}
function requireAdmin(ctx: any) {
  if (!isAdmin(ctx)) throw new SenderError("Service access required.");
}
function parsed(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    throw new SenderError("Invalid document.");
  }
}
function checked<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e: any) {
    throw new SenderError(e.message);
  }
}
function idCheck(s: string) {
  if (!/^[a-zA-Z0-9:_-]{8,150}$/.test(s))
    throw new SenderError("Invalid identifier.");
}
function once(ctx: any, id: string, payload: any) {
  idCheck(id);
  const key = uid(ctx) + ":" + id,
    digest = JSON.stringify(payload),
    prior = ctx.db.operation.id.find(key);
  if (prior) {
    if (prior.digest !== digest)
      throw new SenderError("Retry key belongs to different content.");
    return false;
  }
  ctx.db.operation.insert({ id: key, digest });
  return true;
}
function published(ctx: any, id: string) {
  const p = ctx.db.publication.id.find(id);
  if (!p?.published) throw new SenderError("This publication is unavailable.");
  return p;
}
function roomFor(ctx: any, id: string) {
  const r = ctx.db.room.id.find(id);
  if (!r) throw new SenderError("Room unavailable.");
  return { room: r, publication: published(ctx, r.publicationId) };
}
function saveRevision(ctx: any, d: any, document: any, origin: string) {
  const rev = d.revision + 1;
  const json = JSON.stringify(document);
  ctx.db.design.id.update({
    ...d,
    revision: rev,
    document: json,
    origin,
    updatedAt: now(ctx),
  });
  ctx.db.revision.insert({
    id: d.id + ":" + rev,
    designId: d.id,
    projectId: d.projectId,
    revision: rev,
    document: json,
    origin,
    createdAt: now(ctx),
  });
}
function visibleProjects(ctx: any) {
  return new Set(
    all(ctx, "member")
      .filter((m) => m.identity.isEqual(ctx.sender))
      .map((m) => m.projectId),
  );
}
export const init = db.init((ctx) => {
  ctx.db.admin.insert({ identity: ctx.sender });
});
export const grantService = db.reducer(
  { identity: t.identity() },
  (ctx, { identity }) => {
    requireAdmin(ctx);
    if (!ctx.db.admin.identity.find(identity))
      ctx.db.admin.insert({ identity });
  },
);
export const myProjects = db.view(
  { name: "my_projects", public: true },
  t.array(project.rowType),
  (ctx) => {
    const ids = visibleProjects(ctx);
    return all(ctx, "project").filter((p) => isAdmin(ctx) || ids.has(p.id));
  },
);
export const myDesigns = db.view(
  { name: "my_designs", public: true },
  t.array(design.rowType),
  (ctx) => all(ctx, "design").filter((d) => canEdit(ctx, d.projectId)),
);
export const myRevisions = db.view(
  { name: "my_revisions", public: true },
  t.array(revision.rowType),
  (ctx) => all(ctx, "revision").filter((d) => canEdit(ctx, d.projectId)),
);
export const myVersions = db.view(
  { name: "my_versions", public: true },
  t.array(version.rowType),
  (ctx) => all(ctx, "version").filter((d) => canEdit(ctx, d.projectId)),
);
export const myLayouts = db.view(
  { name: "my_layouts", public: true },
  t.array(layout.rowType),
  (ctx) => all(ctx, "layout").filter((d) => canEdit(ctx, d.projectId)),
);
export const myPublications = db.view(
  { name: "my_publications", public: true },
  t.array(publication.rowType),
  (ctx) => all(ctx, "publication").filter((d) => canEdit(ctx, d.projectId)),
);
export const myVotes = db.view(
  { name: "my_votes", public: true },
  t.array(vote.rowType),
  (ctx) =>
    all(ctx, "vote").filter(
      (d) => canEdit(ctx, d.projectId) || d.identity.isEqual(ctx.sender),
    ),
);
export const myAssets = db.view(
  { name: "my_assets", public: true },
  t.array(asset.rowType),
  (ctx) => all(ctx, "asset").filter((d) => canEdit(ctx, d.projectId)),
);
export const myConversations = db.view(
  { name: "my_conversations", public: true },
  t.array(conversation.rowType),
  (ctx) => all(ctx, "conversation").filter((d) => canEdit(ctx, d.projectId)),
);
export const publishedStores = db.anonymousView(
  { name: "published_stores", public: true },
  t.array(publication.rowType),
  (ctx) => all(ctx, "publication").filter((p) => p.published),
);
export const roomVisitors = db.view(
  { name: "room_visitors", public: true },
  t.array(visitor.rowType),
  (ctx) => {
    const rooms = new Set(
      all(ctx, "visitor")
        .filter((v) => v.identity.isEqual(ctx.sender))
        .map((v) => v.roomId),
    );
    return all(ctx, "visitor").filter((v) => rooms.has(v.roomId));
  },
);
export const roomHolds = db.view(
  { name: "room_holds", public: true },
  t.array(hold.rowType),
  (ctx) => {
    const rooms = new Set(
      all(ctx, "visitor")
        .filter((v) => v.identity.isEqual(ctx.sender))
        .map((v) => v.roomId),
    );
    return all(ctx, "hold").filter((v) => rooms.has(v.roomId));
  },
);
export const serviceRecords = db.view(
  { name: "service_records", public: true },
  t.array(legacy.rowType),
  (ctx) => (isAdmin(ctx) ? all(ctx, "legacy") : []),
);
export const createProject = db.reducer(
  { id: t.string(), name: t.string() },
  (ctx, { id, name }) => {
    requireCreator(ctx);
    idCheck(id);
    if (!name.trim() || name.length > 100)
      throw new SenderError("Give the project a name.");
    if (!once(ctx, id, { name })) return;
    ctx.db.project.insert({
      id,
      name,
      figmaUrl: "",
      owner: ctx.sender,
      createdAt: now(ctx),
    });
    ctx.db.member.insert({
      id: id + ":" + uid(ctx),
      projectId: id,
      identity: ctx.sender,
      role: "owner",
    });
    ctx.db.layout.insert({
      id: id + ":layout",
      projectId: id,
      revision: 0,
      document: JSON.stringify(defaultLayout()),
    });
  },
);
export const setFigmaLink = db.reducer(
  { projectId: t.string(), url: t.string() },
  (ctx, { projectId, url }) => {
    requireEdit(ctx, projectId);
    if (!/^https:\/\/(www\.)?figma\.com\/(design|file)\/[a-zA-Z0-9]+/.test(url))
      throw new SenderError("Use a Figma Design file URL.");
    const p = ctx.db.project.id.find(projectId);
    if (!p) throw new SenderError("Project missing.");
    ctx.db.project.id.update({ ...p, figmaUrl: url.slice(0, 500) });
  },
);
export const createDesign = db.reducer(
  {
    id: t.string(),
    projectId: t.string(),
    kind: t.string(),
    document: t.string(),
  },
  (ctx, args) => {
    requireEdit(ctx, args.projectId);
    if (!once(ctx, args.id, args)) return;
    const doc = checked(() =>
      validateProduct(
        args.document ? parsed(args.document) : defaultProduct(args.kind),
      ),
    );
    checkArtwork(ctx, args.projectId, doc);
    const d = {
      id: args.id,
      projectId: args.projectId,
      revision: 0,
      document: JSON.stringify(doc),
      origin: "create",
      updatedAt: now(ctx),
    };
    ctx.db.design.insert(d);
    ctx.db.revision.insert({
      id: d.id + ":0",
      designId: d.id,
      projectId: d.projectId,
      revision: 0,
      document: d.document,
      origin: "create",
      createdAt: now(ctx),
    });
  },
);
export const editDesign = db.reducer(
  {
    id: t.string(),
    baseRevision: t.u32(),
    changes: t.string(),
    origin: t.string(),
    operationId: t.string(),
  },
  (ctx, args) => {
    const d = ctx.db.design.id.find(args.id);
    if (!d) throw new SenderError("Design not found.");
    requireEdit(ctx, d.projectId);
    if (!once(ctx, args.operationId, args)) return;
    if (d.revision !== args.baseRevision)
      throw new SenderError(
        "CONFLICT: This design changed elsewhere. Reload or duplicate your draft.",
      );
    const doc = checked(() =>
      applyChanges(parsed(d.document), parsed(args.changes)),
    );
    checkArtwork(ctx, d.projectId, doc);
    saveRevision(ctx, d, doc, args.origin.slice(0, 80));
  },
);
export const undoDesign = db.reducer(
  {
    id: t.string(),
    baseRevision: t.u32(),
    targetRevision: t.u32(),
    operationId: t.string(),
  },
  (ctx, args) => {
    const d = ctx.db.design.id.find(args.id);
    if (!d) throw new SenderError("Design missing.");
    requireEdit(ctx, d.projectId);
    if (!once(ctx, args.operationId, args)) return;
    if (d.revision !== args.baseRevision)
      throw new SenderError("CONFLICT: Reload before undoing.");
    const r = ctx.db.revision.id.find(args.id + ":" + args.targetRevision);
    if (!r) throw new SenderError("Revision missing.");
    saveRevision(ctx, d, parsed(r.document), "undo");
  },
);
// Remove workspace entries while retaining published snapshots and their assets.
export const deleteDesign = db.reducer({id:t.string()},(ctx,{id})=>{
 const d=ctx.db.design.id.find(id);if(!d)throw new SenderError('Design missing.');requireEdit(ctx,d.projectId);
 const versions=all(ctx,'version').filter(v=>v.designId===id),ids=new Set(versions.map(v=>v.id));
 const backupId='deleted-design:'+id;
 ctx.db.legacy.insert({id:backupId,kind:'deleted-design',body:JSON.stringify({design:d,versions},(_,v)=>typeof v==='bigint'?v.toString():v)});
 for(const l of all(ctx,'layout').filter(l=>l.projectId===d.projectId)){const doc=parsed(l.document);doc.placements=doc.placements.filter((p:any)=>!ids.has(p.versionId));ctx.db.layout.id.update({...l,revision:l.revision+1,document:JSON.stringify(doc)});}
 for(const v of versions)ctx.db.version.id.delete(v.id);
 for(const r of all(ctx,'revision').filter(r=>r.designId===id))ctx.db.revision.id.delete(r.id);
 for(const c of all(ctx,'conversation').filter(c=>c.designId===id))ctx.db.conversation.id.delete(c.id);
 ctx.db.design.id.delete(id);
});
export const saveVersion = db.reducer(
  {
    id: t.string(),
    designId: t.string(),
    baseRevision: t.u32(),
    name: t.string(),
  },
  (ctx, args) => {
    const d = ctx.db.design.id.find(args.designId);
    if (!d) throw new SenderError("Design missing.");
    requireEdit(ctx, d.projectId);
    if (!once(ctx, args.id, args)) return;
    if (d.revision !== args.baseRevision)
      throw new SenderError("CONFLICT: Reload before saving.");
    ctx.db.version.insert({
      id: args.id,
      projectId: d.projectId,
      designId: d.id,
      name: args.name.trim().slice(0, 100) || "Untitled",
      document: d.document,
      revision: d.revision,
      createdAt: now(ctx),
    });
  },
);
export const saveLayout = db.reducer(
  {
    projectId: t.string(),
    baseRevision: t.u32(),
    document: t.string(),
    operationId: t.string(),
  },
  (ctx, args) => {
    requireEdit(ctx, args.projectId);
    if (!once(ctx, args.operationId, args)) return;
    const l = ctx.db.layout.id.find(args.projectId + ":layout");
    if (!l || l.revision !== args.baseRevision)
      throw new SenderError("CONFLICT: Store layout changed. Reload first.");
    const doc = checked(() => validateLayout(parsed(args.document)));
    for (const p of doc.placements) {
      const v = ctx.db.version.id.find(p.versionId);
      if (v?.projectId !== args.projectId)
        throw new SenderError("Every product must belong to this workspace.");
    }
    ctx.db.layout.id.update({
      ...l,
      revision: l.revision + 1,
      document: JSON.stringify(doc),
    });
  },
);
export const publishStore = db.reducer(
  {
    id: t.string(),
    projectId: t.string(),
    versionIds: t.array(t.string()),
    name: t.string(),
  },
  (ctx, args) => {
    requireEdit(ctx, args.projectId);
    if (!once(ctx, args.id, args)) return;
    if (
      !args.versionIds.length ||
      args.versionIds.length > 8 ||
      new Set(args.versionIds).size !== args.versionIds.length
    )
      throw new SenderError("Select 1–8 versions.");
    const versions = args.versionIds.map((id) => {
      const v = ctx.db.version.id.find(id);
      if (v?.projectId !== args.projectId)
        throw new SenderError("Version not found.");
      const document = publicProduct(parsed(v.document));
      checkArtwork(ctx, args.projectId, document);
      if (document.facts.price === null)
        throw new SenderError("Set a price before publishing.");
      return { id: v.id, name: v.name, document };
    });
    const l = ctx.db.layout.id.find(args.projectId + ":layout")!;
    const layout = parsed(l.document);
    layout.placements = layout.placements.filter((p: any) =>
      args.versionIds.includes(p.versionId),
    );
    for (const [i, v] of versions.entries())
      if (!layout.placements.some((p: any) => p.versionId === v.id)) {
        const fixture = layout.fixtures[0];
        layout.placements.push({
          id: v.id + ":placement",
          versionId: v.id,
          x:
            v.document.kind === "sofa"
              ? ((i % 2 === 0 ? -1 : 1) * layout.width) / 4
              : (fixture?.x || 0) + (i - (versions.length - 1) / 2) * 0.15,
          y: v.document.kind === "sofa" ? 0 : fixture?.height || 0,
          z: v.document.kind === "sofa" ? -2 : fixture?.z || -2,
          rotation: 0,
        });
      }
    checked(() => validateLayout(layout));
    const snapshot = { versions, layout };
    ctx.db.publication.insert({
      id: args.id,
      projectId: args.projectId,
      name: args.name.slice(0, 100),
      snapshot: JSON.stringify(snapshot),
      published: true,
      createdAt: now(ctx),
    });
  },
);
export const unpublishStore = db.reducer({ id: t.string() }, (ctx, { id }) => {
  const p = ctx.db.publication.id.find(id);
  if (!p) throw new SenderError("Publication missing.");
  requireEdit(ctx, p.projectId);
  ctx.db.publication.id.update({ ...p, published: false });
  for (const r of all(ctx, "room").filter((r) => r.publicationId === id)) {
    for (const v of all(ctx, "visitor").filter((v) => v.roomId === r.id))
      ctx.db.visitor.id.delete(v.id);
    for (const h of all(ctx, "hold").filter((h) => h.roomId === r.id))
      ctx.db.hold.id.delete(h.id);
  }
});
export const createPairing = db.reducer(
  { projectId: t.string(), code: t.string() },
  (ctx, { projectId, code }) => {
    requireEdit(ctx, projectId);
    if (!/^[a-zA-Z0-9-]{32,64}$/.test(code))
      throw new SenderError("Invalid pairing code.");
    ctx.db.pairing.insert({
      code,
      projectId,
      expiresAt: now(ctx) + 300000n,
      used: false,
    });
  },
);
export const redeemPairing = db.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const p = ctx.db.pairing.code.find(code);
    if (!p || p.used || p.expiresAt < now(ctx))
      throw new SenderError(
        "Pairing link expired or used. Create another in Kalpi.",
      );
    ctx.db.pairing.code.update({ ...p, used: true });
    const id = p.projectId + ":" + uid(ctx);
    if (!ctx.db.member.id.find(id))
      ctx.db.member.insert({
        id,
        projectId: p.projectId,
        identity: ctx.sender,
        role: "editor",
      });
  },
);
export const joinRoom = db.reducer(
  { roomId: t.string(), publicationId: t.string(), name: t.string() },
  (ctx, args) => {
    if (!ctx.db.cleanup.scheduledId.find(1n))
      ctx.db.cleanup.insert({
        scheduledId: 1n,
        scheduledAt: ScheduleAt.interval(2_000_000n),
      });
    idCheck(args.roomId);
    published(ctx, args.publicationId);
    const r = ctx.db.room.id.find(args.roomId);
    if (r && r.publicationId !== args.publicationId)
      throw new SenderError("Room belongs to another store.");
    if (!r)
      ctx.db.room.insert({
        id: args.roomId,
        publicationId: args.publicationId,
      });
    const visitors = all(ctx, "visitor").filter(
      (v) => v.roomId === args.roomId,
    );
    for (const stale of visitors.filter((v) => v.lastSeen + 30000n < now(ctx)))
      ctx.db.visitor.id.delete(stale.id);
    const id = args.roomId + ":" + uid(ctx);
    const old = ctx.db.visitor.id.find(id);
    if (
      !old &&
      all(ctx, "visitor").filter((v) => v.roomId === args.roomId).length >= 10
    )
      throw new SenderError("This room has ten visitors. Open another room.");
    const v = {
      id,
      roomId: args.roomId,
      identity: ctx.sender,
      connection: ctx.connectionId!,
      name: args.name.trim().slice(0, 32) || "Visitor",
      x: 0,
      z: Math.min(
        3,
        parsed(published(ctx, args.publicationId).snapshot).layout.depth / 2 -
          0.6,
      ),
      yaw: 0,
      sequence: 0,
      lastSeen: now(ctx),
    };
    if (old) ctx.db.visitor.id.update(v);
    else ctx.db.visitor.insert(v);
  },
);
export const moveVisitor = db.reducer(
  {
    roomId: t.string(),
    x: t.f64(),
    z: t.f64(),
    yaw: t.f64(),
    sequence: t.u32(),
  },
  (ctx, args) => {
    const { publication } = roomFor(ctx, args.roomId);
    const id = args.roomId + ":" + uid(ctx),
      v = ctx.db.visitor.id.find(id);
    if (!v) throw new SenderError("Join the room first.");
    if (args.sequence <= v.sequence || now(ctx) - v.lastSeen < 50n) return;
    const l = parsed(publication.snapshot).layout;
    if (
      ![args.x, args.z, args.yaw].every(Number.isFinite) ||
      Math.abs(args.x) > l.width / 2 - 0.2 ||
      Math.abs(args.z) > l.depth / 2 - 0.2
    )
      throw new SenderError("Stay inside the store.");
    const elapsed = Number(now(ctx) - v.lastSeen) / 1000;
    if (Math.hypot(args.x - v.x, args.z - v.z) > Math.max(0.5, elapsed * 4))
      throw new SenderError("Movement too fast.");
    ctx.db.visitor.id.update({
      ...v,
      x: args.x,
      z: args.z,
      yaw: args.yaw,
      sequence: args.sequence,
      lastSeen: now(ctx),
    });
    for (const h of all(ctx, "hold").filter(
      (h) => h.roomId === args.roomId && h.holder.isEqual(ctx.sender),
    ))
      ctx.db.hold.id.update({ ...h, expiresAt: now(ctx) + 10000n });
  },
);
export const pickUp = db.reducer(
  { roomId: t.string(), instanceId: t.string() },
  (ctx, args) => {
    const { publication } = roomFor(ctx, args.roomId);
    const v = ctx.db.visitor.id.find(args.roomId + ":" + uid(ctx));
    if (!v) throw new SenderError("Join the room first.");
    const s = parsed(publication.snapshot),
      p = s.layout.placements.find((p: any) => p.id === args.instanceId),
      item = s.versions.find((x: any) => x.id === p?.versionId);
    if (!p || !isHandheld(item?.document))
      throw new SenderError(
        "This product supports inspection and AR, not pickup.",
      );
    if (Math.hypot(v.x - p.x, v.z - p.z) > 2)
      throw new SenderError("Move closer to the product.");
    for (const held of all(ctx, "hold").filter(
      (h) => h.roomId === args.roomId && h.holder.isEqual(ctx.sender),
    ))
      ctx.db.hold.id.delete(held.id);
    const id = args.roomId + ":" + args.instanceId,
      h = ctx.db.hold.id.find(id);
    if (h && h.expiresAt > now(ctx) && !h.holder.isEqual(ctx.sender))
      throw new SenderError("Another visitor is holding this product.");
    if (h) ctx.db.hold.id.delete(id);
    ctx.db.hold.insert({
      id,
      roomId: args.roomId,
      instanceId: args.instanceId,
      holder: ctx.sender,
      expiresAt: now(ctx) + 10000n,
    });
  },
);
export const requestAssistance = db.reducer(
  { roomId: t.string(), instanceId: t.string() },
  (ctx, args) => {
    const { publication } = roomFor(ctx, args.roomId);
    const v = ctx.db.visitor.id.find(args.roomId + ":" + uid(ctx));
    if (!v) throw new SenderError("Join the room first.");
    const s = parsed(publication.snapshot),
      p = s.layout.placements.find((p: any) => p.id === args.instanceId),
      item = s.versions.find((x: any) => x.id === p?.versionId);
    if (!p || !isHandheld(item?.document))
      throw new SenderError(
        "This product supports inspection and AR, not pickup.",
      );
    for (const held of all(ctx, "hold").filter(
      (h) => h.roomId === args.roomId && h.holder.isEqual(ctx.sender),
    ))
      ctx.db.hold.id.delete(held.id);
    const id = args.roomId + ":" + args.instanceId,
      h = ctx.db.hold.id.find(id);
    if (h && h.expiresAt > now(ctx) && !h.holder.isEqual(ctx.sender))
      throw new SenderError("Another visitor is holding this product.");
    if (h) ctx.db.hold.id.delete(id);
    ctx.db.hold.insert({
      id,
      roomId: args.roomId,
      instanceId: args.instanceId,
      holder: ctx.sender,
      expiresAt: now(ctx) + 10000n,
    });
  },
);
export const releaseProduct = db.reducer(
  { roomId: t.string() },
  (ctx, { roomId }) => {
    for (const h of all(ctx, "hold").filter(
      (h) => h.roomId === roomId && h.holder.isEqual(ctx.sender),
    ))
      ctx.db.hold.id.delete(h.id);
  },
);
export const leaveRoom = db.reducer(
  { roomId: t.string() },
  (ctx, { roomId }) => {
    ctx.db.visitor.id.delete(roomId + ":" + uid(ctx));
    for (const h of all(ctx, "hold").filter(
      (h) => h.roomId === roomId && h.holder.isEqual(ctx.sender),
    ))
      ctx.db.hold.id.delete(h.id);
  },
);
export const disconnected = db.clientDisconnected((ctx) => {
  for (const v of all(ctx, "visitor").filter((v) =>
    v.connection?.isEqual(ctx.connectionId!),
  )) {
    ctx.db.visitor.id.delete(v.id);
    for (const h of all(ctx, "hold").filter(
      (h) => h.roomId === v.roomId && h.holder.isEqual(ctx.sender),
    ))
      ctx.db.hold.id.delete(h.id);
  }
});
export const castVote = db.reducer(
  {
    publicationId: t.string(),
    versionId: t.string(),
    intent: t.string(),
    preferred: t.bool(),
    comment: t.string(),
  },
  (ctx, args) => {
    const p = published(ctx, args.publicationId),
      s = parsed(p.snapshot),
      v = s.versions.find((v: any) => v.id === args.versionId);
    if (!v || !["yes", "no", "unsure"].includes(args.intent))
      throw new SenderError("Choose a product and purchase intent.");
    const id = args.publicationId + ":" + args.versionId + ":" + uid(ctx);
    if (args.preferred)
      for (const vote of all(ctx, "vote").filter(
        (v) =>
          v.publicationId === p.id &&
          v.identity.isEqual(ctx.sender) &&
          v.preferred,
      ))
        ctx.db.vote.id.update({ ...vote, preferred: false });
    const row = {
      id,
      publicationId: p.id,
      projectId: p.projectId,
      versionId: v.id,
      identity: ctx.sender,
      intent: args.intent,
      price: v.document.facts.price,
      currency: v.document.facts.currency,
      preferred: args.preferred,
      comment: args.comment.slice(0, 2000),
      updatedAt: now(ctx),
    };
    if (ctx.db.vote.id.find(id)) ctx.db.vote.id.update(row);
    else ctx.db.vote.insert(row);
  },
);
export const serviceWrite = db.reducer(
  { id: t.string(), kind: t.string(), body: t.string(), remove: t.bool() },
  (ctx, args) => {
    requireAdmin(ctx);
    if (args.remove) {
      ctx.db.legacy.id.delete(args.id);
      return;
    }
    const row = { id: args.id, kind: args.kind, body: args.body };
    if (ctx.db.legacy.id.find(args.id)) ctx.db.legacy.id.update(row);
    else ctx.db.legacy.insert(row);
  },
);
export const registerAsset = db.reducer(
  {
    id: t.string(),
    projectId: t.string(),
    path: t.string(),
    mime: t.string(),
    size: t.u64(),
  },
  (ctx, args) => {
    requireAdmin(ctx);
    if (!ctx.db.project.id.find(args.projectId))
      throw new SenderError("Project missing.");
    idCheck(args.id);
    if (
      ![
        "image/png",
        "image/jpeg",
        "model/gltf-binary",
        "model/vnd.usdz+zip",
      ].includes(args.mime) ||
      args.size > 31457280n
    )
      throw new SenderError("Unsupported asset.");
    const old = ctx.db.asset.id.find(args.id);
    if (old) {
      if (
        old.path === args.path &&
        old.projectId === args.projectId &&
        old.mime === args.mime &&
        old.size === args.size
      )
        return;
      throw new SenderError(
        "Assets are immutable. Upload with a new identifier.",
      );
    }
    ctx.db.asset.insert({ ...args, status: "ready" });
  },
);
export const recordConversation = db.reducer(
  {
    id: t.string(),
    projectId: t.string(),
    designId: t.string(),
    prompt: t.string(),
    response: t.string(),
    status: t.string(),
  },
  (ctx, args) => {
    requireAdmin(ctx);
    const row = { ...args, createdAt: now(ctx) };
    if (ctx.db.conversation.id.find(args.id))
      ctx.db.conversation.id.update(row);
    else ctx.db.conversation.insert(row);
  },
);
export const serviceCommit = db.reducer(
  { writes: t.string(), expected: t.string() },
  (ctx, args) => {
    requireAdmin(ctx);
    const writes = parsed(args.writes),
      expected = parsed(args.expected);
    for (const e of expected) {
      const r = ctx.db.legacy.id.find(e.id);
      if ((r?.body ?? null) !== e.body)
        throw new SenderError("CONFLICT: Record changed; retry the request.");
    }
    for (const w of writes) {
      if (w.remove) {
        ctx.db.legacy.id.delete(w.id);
        continue;
      }
      const r = { id: w.id, kind: w.kind, body: w.body };
      if (ctx.db.legacy.id.find(w.id)) ctx.db.legacy.id.update(r);
      else ctx.db.legacy.insert(r);
    }
  },
);

export const inviteCollaborator = db.reducer(
  { projectId: t.string(), identity: t.identity() },
  (ctx, args) => {
    const p = ctx.db.project.id.find(args.projectId);
    if (!p || !p.owner.isEqual(ctx.sender))
      throw new SenderError(
        "Only the workspace owner can invite collaborators.",
      );
    const id = args.projectId + ":" + args.identity.toHexString();
    if (!ctx.db.member.id.find(id))
      ctx.db.member.insert({ ...args, id, role: "editor" });
  },
);
export const removeCollaborator = db.reducer(
  { projectId: t.string(), identity: t.identity() },
  (ctx, args) => {
    const p = ctx.db.project.id.find(args.projectId);
    if (!p || !p.owner.isEqual(ctx.sender) || p.owner.isEqual(args.identity))
      throw new SenderError("Only the owner can remove a collaborator.");
    ctx.db.member.id.delete(args.projectId + ":" + args.identity.toHexString());
  },
);

export const expireSessions = db.reducer(
  { onSchedule: cleanup },
  { arg: cleanup.rowType },
  (ctx) => {
    if (!ctx.sender.isEqual(ctx.identity))
      throw new SenderError("Scheduler access required.");
    for (const h of all(ctx, "hold"))
      if (h.expiresAt <= now(ctx)) ctx.db.hold.id.delete(h.id);
    for (const v of all(ctx, "visitor"))
      if (v.lastSeen + 30000n < now(ctx)) {
        ctx.db.visitor.id.delete(v.id);
        for (const h of all(ctx, "hold").filter(
          (h) => h.roomId === v.roomId && h.holder.isEqual(v.identity),
        ))
          ctx.db.hold.id.delete(h.id);
      }
    for (const p of all(ctx, "pairing"))
      if (p.expiresAt + 3600000n < now(ctx)) ctx.db.pairing.code.delete(p.code);
  },
);
