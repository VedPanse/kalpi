import { DbConnection } from "../.local/bindings.mjs";
export async function openConnection(token, queries) {
  const conn = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("SpacetimeDB connection timed out.")),
      10000,
    );
    const b = DbConnection.builder()
      .withUri(process.env.SPACETIME_URI)
      .withDatabaseName(process.env.SPACETIME_DATABASE)
      .onConnect((c, identity, credential) => {
        clearTimeout(timer);
        c.serviceCredential = credential;
        resolve(c);
      })
      .onConnectError((_, e) => {
        clearTimeout(timer);
        reject(e);
      });
    if (token) b.withToken(token);
    b.build();
  });
  try {
    await new Promise((resolve, reject) => {
      conn
        .subscriptionBuilder()
        .onApplied(resolve)
        .onError((ctx) => reject(Error(String(ctx.event))))
        .subscribe(queries);
    });
    return conn;
  } catch (e) {
    conn.disconnect();
    throw e;
  }
}
export async function withService(fn) {
  if (!process.env.SPACETIME_SERVICE_TOKEN)
    throw Error("Spacetime service credentials are not configured.");
  const c = await openConnection(process.env.SPACETIME_SERVICE_TOKEN, [
    "SELECT * FROM service_records",
    "SELECT * FROM my_projects",
    "SELECT * FROM my_designs",
    "SELECT * FROM my_assets",
    "SELECT * FROM my_publications",
    "SELECT * FROM my_conversations",
  ]);
  try {
    return await fn(c);
  } finally {
    c.disconnect();
  }
}
export async function authorize(token, projectId) {
  if (!token)
    throw Object.assign(Error("Sign in to your creator workspace."), {
      status: 401,
    });
  const c = await openConnection(token, [
    "SELECT * FROM my_projects",
    "SELECT * FROM my_designs",
  ]);
  try {
    if (![...c.db.myProjects.iter()].some((p) => p.id === projectId))
      throw Object.assign(Error("Workspace access required."), { status: 403 });
    return {
      identity: c.identity.toHexString(),
      designs: [...c.db.myDesigns.iter()],
    };
  } finally {
    c.disconnect();
  }
}
export const recordStore = (c) => {
  const records = new Map(
    [...c.db.serviceRecords.iter()].map((r) => [r.id, r]),
  );
  const writes = new Map(),
    expected = new Map();
  const get = (id) => {
    const r = records.get(id);
    if (!expected.has(id)) expected.set(id, { id, body: r?.body ?? null });
    return r ? JSON.parse(r.body) : null;
  };
  return {
    get,
    all: (kind) =>
      [...records.values()]
        .filter((r) => r.kind === kind)
        .map((r) => get(r.id)),
    put(kind, o) {
      get(o.id);
      const r = { id: o.id, kind, body: JSON.stringify(o) };
      records.set(o.id, r);
      writes.set(o.id, r);
      return o;
    },
    remove(id) {
      get(id);
      records.delete(id);
      writes.set(id, { id, remove: true });
    },
    async commit() {
      if (writes.size)
        await c.reducers.serviceCommit({
          writes: JSON.stringify([...writes.values()]),
          expected: JSON.stringify([...expected.values()]),
        });
    },
  };
};
