import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const [file, scope, project] = process.argv.slice(2);
if (!file?.startsWith(".local/") || !scope || !project)
  throw Error(
    "Usage: node scripts/configure-vercel.mjs .local/environment.env SCOPE PROJECT",
  );
const env = parseEnv(readFileSync(file, "utf8"));
for (const [key, value] of Object.entries(env)) {
  if (!key.startsWith("SPACETIME_") && key !== "SELLER_TOKEN") continue;
  execFileSync(
    "vercel",
    [
      "--scope",
      scope,
      "env",
      "add",
      key,
      "--project",
      project,
      "--environment",
      "production,preview,development",
      "--type",
      /TOKEN|KEY/.test(key) ? "secret" : "config",
      "--force",
      "--yes",
    ],
    { input: value, stdio: ["pipe", "pipe", "pipe"] },
  );
  console.log("Configured " + key);
}
