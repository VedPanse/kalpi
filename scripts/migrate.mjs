import { DatabaseSync, backup } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { withService, recordStore } from "../providers/spacetime.js";
const source = process.env.SQLITE_SOURCE || "data/kalpi.sqlite";
if (!fs.existsSync(source)) throw Error(`SQLite source not found: ${source}`);
const database = new DatabaseSync(source, { readOnly: true });
fs.mkdirSync(".local/backups", { recursive: true });
const backupPath = path.resolve(`.local/backups/kalpi-${Date.now()}.sqlite`);
await backup(database, backupPath);
fs.chmodSync(backupPath, 0o600);
const records = database
  .prepare("SELECT id,kind,body FROM records ORDER BY kind,id")
  .all();
database.close();
const target = process.env.SPACETIME_DATABASE;
if (!target) throw Error("Set a target Spacetime database.");
const manifest = {
  source,
  target,
  backup: backupPath,
  createdAt: new Date().toISOString(),
  count: records.length,
  records: [],
};
await withService(async (c) => {
  const existing = recordStore(c);
  for (const row of records) {
    const body = JSON.parse(row.body),
      prior = existing.get(row.id);
    if (prior) {
      if (
        JSON.stringify(prior) !== JSON.stringify(body) &&
        !(row.kind === "asset" && prior.migrationSource === body.path)
      )
        throw Error(
          `Migration conflict for ${row.id}; no existing data was overwritten.`,
        );
      manifest.records.push({ id: row.id, status: "existing" });
      continue;
    }
    if (row.kind === "asset" && body.path?.startsWith("data/")) {
      if (!fs.existsSync(body.path))
        throw Error(`Missing legacy asset ${body.path}`);
      const bytes = fs.readFileSync(body.path);
      body.contentHash ??= createHash("sha256").update(bytes).digest("hex");
      if (process.env.MIGRATE_TO_BLOB === "true") {
        const blob = await put(
          `legacy/${body.id}${path.extname(body.path)}`,
          bytes,
          { access: "private", addRandomSuffix: false, allowOverwrite: false },
        );
        body.migrationSource = body.path;
        body.path = blob.pathname;
      }
    }
    await c.reducers.serviceWrite({
      id: row.id,
      kind: row.kind,
      body: JSON.stringify(body),
      remove: false,
    });
    manifest.records.push({ id: row.id, status: "imported" });
  }
  const imported = recordStore(c);
  for (const row of records)
    if (!imported.get(row.id))
      throw Error(`Missing migrated record: ${row.id}`);
});
fs.writeFileSync(
  `.local/migration-${target}.json`,
  JSON.stringify(manifest, null, 2),
  { mode: 0o600 },
);
console.log(
  `Migrated/verified ${records.length} records in ${target}. Original SQLite and private backup retained. No runtime dual writes.`,
);
