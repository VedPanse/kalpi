import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { openConnection } from "../../providers/spacetime.js";
export async function testDatabase() {
  if (!process.env.SPACETIME_SERVICE_TOKEN)
    throw Error("Run npm run setup:local before integration tests.");
  const db = "kalpi-test-" + randomUUID(),
    exe = process.env.KALPI_SPACETIME_ROOT
      ? process.env.KALPI_SPACETIME_ROOT + "/spacetime"
      : homedir() + "/.local/share/kalpi-spacetime/spacetime",
    prefix = ["--root-dir=" + resolve(".local/spacetime-cli")];
  execFileSync(
    exe,
    [
      ...prefix,
      "publish",
      "--server",
      "http://127.0.0.1:3001",
      "--module-path",
      "spacetimedb",
      db,
      "--yes=skip-login",
    ],
    { env: { ...process.env, ALLOW_LOCAL_CREATORS: "true" }, stdio: "pipe" },
  );
  const previous = process.env.SPACETIME_DATABASE;
  process.env.SPACETIME_DATABASE = db;
  const connections = [];
  return {
    name: db,
    async connect(
      token,
      queries = [
        "SELECT * FROM my_projects",
        "SELECT * FROM my_designs",
        "SELECT * FROM my_revisions",
        "SELECT * FROM my_versions",
        "SELECT * FROM my_layouts",
        "SELECT * FROM my_publications",
        "SELECT * FROM my_assets",
        "SELECT * FROM my_votes",
        "SELECT * FROM published_stores",
        "SELECT * FROM room_visitors",
        "SELECT * FROM room_holds",
      ],
    ) {
      const c = await openConnection(token, queries);
      connections.push(c);
      return c;
    },
    async close() {
      for (const c of connections) c.disconnect();
      process.env.SPACETIME_DATABASE = previous;
      try {
        execFileSync(
          exe,
          [...prefix, "delete", "--server", "http://127.0.0.1:3001", db, "-y"],
          { stdio: "pipe" },
        );
      } catch (e) {
        console.error("Test database cleanup needed:", db);
      }
    },
  };
}
export const until = async (fn, timeout = 5000) => {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout)
      throw Error("Condition did not become true.");
    await new Promise((r) => setTimeout(r, 30));
  }
};
