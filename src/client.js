import {storage, appURL} from "./runtime.js";
import { recordDiagnostic } from "./telemetry.js";
import { DbConnection } from "./module_bindings/index.ts";
import {
  initializeCreatorAuth,
  openCreatorSignIn,
  creatorUser,
  creatorHttpToken,
} from "./auth.js";
let config,
  connection,
  tokenKey = "kalpi-spacetime-token";
export async function getConfig() {
  return (config ||= await fetch(appURL("/api/config"), { signal: AbortSignal.timeout(10000) }).then((r) => r.json()));
}
export const signIn = openCreatorSignIn;
export async function connect(onUpdate = () => {}, options = {}) {
  tokenKey = options.tokenKey || "kalpi-spacetime-token";
  const c = await getConfig();
  if (!c.spacetimeUri || !c.database)
    throw Error(
      "SpacetimeDB is not configured. Run npm run setup:local or configure the hosted database.",
    );
  let token = options.token || storage.getItem(tokenKey);
  if (c.authClientId && !options.tokenKey) {
    const user = await initializeCreatorAuth(c);
    token = user?.id_token || storage.getItem(tokenKey) || undefined;
  }
  connection = await new Promise((resolve, reject) => {
    let hasConnected = false;
    let timeout = setTimeout(
      () =>
        reject(
          Error(
            "Could not connect to SpacetimeDB. Check the connection and retry.",
          ),
        ),
      15000,
    );
    const b = DbConnection.builder()
      .withUri(c.spacetimeUri)
      .withDatabaseName(c.database)
      .withAutomaticReconnect()
      .onConnect((conn, identity, t) => {
        clearTimeout(timeout);
        storage.setItem(tokenKey, t);
        options.onToken?.(t);
        if (hasConnected) onUpdate("reconnected");
        hasConnected = true;
        resolve(conn);
      })
      .onConnectError((_, e) => {
        clearTimeout(timeout);
        reject(e);
      })
      .onDisconnect(() => {
        recordDiagnostic("sync.offline");
        onUpdate("offline");
      });
    if (token) b.withToken(token);
    b.build();
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { connection.disconnect(); reject(Error("Your workspace took too long to load. Retry your saved connection.")); }, 15000);
    connection
      .subscriptionBuilder()
      .onApplied(() => { clearTimeout(timeout); resolve(); })
      .onError((ctx) => { clearTimeout(timeout); reject(ctx.event); })
      .subscribe([
        "SELECT * FROM my_projects",
        "SELECT * FROM my_designs",
        "SELECT * FROM my_revisions",
        "SELECT * FROM my_versions",
        "SELECT * FROM my_layouts",
        "SELECT * FROM my_publications",
        "SELECT * FROM my_votes",
        "SELECT * FROM my_assets",
        "SELECT * FROM my_conversations",
        "SELECT * FROM published_stores",
        "SELECT * FROM room_visitors",
        "SELECT * FROM room_holds",
      ]);
  });
  for (const name of [
    "myProjects",
    "myDesigns",
    "myRevisions",
    "myVersions",
    "myLayouts",
    "myPublications",
    "myVotes",
    "myAssets",
    "myConversations",
    "publishedStores",
    "roomVisitors",
    "roomHolds",
  ]) {
    const table = connection.db[name];
    for (const event of ["onInsert", "onUpdate", "onDelete"])
      table[event](() => onUpdate(name));
  }
  onUpdate("connected");
  return connection;
}
export const rows = (name) =>
  connection ? Array.from(connection.db[name].iter()) : [];
export const credential = () => token();
export { uuid } from "./ids.js";
export const identity = () => connection?.identity?.toHexString();
export const token = () => storage.getItem(tokenKey) || "";
export async function call(name, args) {
  if (!connection?.isActive)
    throw Error("You are offline. Reconnect before saving changes.");
  return connection.reducers[name](args);
}
export async function requestToken() {
  if(tokenKey !== "kalpi-spacetime-token") return token();
  const fresh=await creatorHttpToken(token());
  if(fresh)storage.setItem(tokenKey,fresh);
  return fresh;
}
export async function api(path, body) {
  const started = performance.now();
  const r = await fetch(appURL(path), {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + await requestToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (path.startsWith("/api/ai"))
    recordDiagnostic(r.ok ? "ai.complete" : "ai.failed", {
      status: r.status,
      durationMs: performance.now() - started,
    });
  if (!r.ok) throw Error(data.error || "Request failed.");
  return data;
}

export async function creatorSignedIn() {
  return !!(await creatorUser());
}
