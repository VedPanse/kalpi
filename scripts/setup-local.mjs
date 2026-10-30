import { execFileSync, spawn } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  symlinkSync,
  readFileSync,
  writeFileSync,
  openSync,
} from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
const installed =
    process.env.KALPI_SPACETIME_ROOT ||
    homedir() + "/.local/share/kalpi-spacetime",
  exe = existsSync(installed + "/spacetime")
    ? installed + "/spacetime"
    : "spacetime",
  root = resolve(".local/spacetime-cli");
mkdirSync(root, { recursive: true });
if (existsSync(installed + "/bin") && !existsSync(root + "/bin"))
  symlinkSync(installed + "/bin", root + "/bin");
const run = (args, options = {}) =>
  execFileSync(exe, ["--root-dir=" + root, ...args], {
    encoding: "utf8",
    ...options,
  });
try {
  await fetch("http://127.0.0.1:3001/v1/health");
} catch {
  const log = openSync(".local/spacetime.log", "a");
  const proc = spawn(
    exe,
    ["--root-dir=" + root, "start", "--listen-addr", "127.0.0.1:3001"],
    { detached: true, stdio: ["ignore", log, log] },
  );
  proc.unref();
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      await fetch("http://127.0.0.1:3001/v1/health");
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!ready) throw Error("Spacetime did not start. See .local/spacetime.log.");
}
if (existsSync(".local/runtime.env")) {
  const env = parseEnv(readFileSync(".local/runtime.env", "utf8"));
  if (env.SPACETIME_SERVICE_TOKEN)
    run(["login", "--token", env.SPACETIME_SERVICE_TOKEN], {
      stdio: ["ignore", "ignore", "ignore"],
    });
}
console.log(
  run(
    [
      "publish",
      "--server",
      "http://127.0.0.1:3001",
      "--module-path",
      "spacetimedb",
      "kalpi-local",
      "--yes=migrate,break-clients,skip-login",
    ],
    { env: { ...process.env, ALLOW_LOCAL_CREATORS: "true" } },
  ),
);
const auth = run(["login", "show", "--token"]),
  token = auth.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
if (!token) throw Error("Local service identity unavailable.");
writeFileSync(
  ".local/runtime.env",
  `SPACETIME_URI=http://127.0.0.1:3001\nSPACETIME_DATABASE=kalpi-local\nSPACETIME_SERVICE_TOKEN=${token}\nHOST=127.0.0.1\nPORT=3002\n`,
  { mode: 0o600 },
);
console.log(
  run([
    "generate",
    "--lang",
    "typescript",
    "--out-dir",
    "src/module_bindings",
    "--module-path",
    "spacetimedb",
    "-y",
  ]),
);
execFileSync(process.execPath, ["scripts/build.mjs"], { stdio: "inherit" });
console.log("Ready. Run npm run start:local. Open http://127.0.0.1:3002.");
