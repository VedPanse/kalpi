// Provision a module-scoped service identity. Never deploy the account owner's token.
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { openConnection } from "../providers/spacetime.js";
const database = process.argv[2],
  clientId = process.argv[3],
  file = process.argv[4];
if (!database || !clientId || !file || !file.startsWith(".local/"))
  throw Error(
    "Usage: node scripts/provision-service.mjs DATABASE PUBLIC_AUTH_CLIENT_ID .local/environment.env",
  );
if (existsSync(file))
  throw Error(
    "Environment file already exists; keep the existing service identity.",
  );
process.env.SPACETIME_URI = "wss://maincloud.spacetimedb.com";
process.env.SPACETIME_DATABASE = database;
const login = execFileSync(
  "scripts/spacetime.sh",
  ["login", "show", "--token"],
  { encoding: "utf8" },
);
const ownerToken = login.match(
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
)?.[0];
if (!ownerToken) throw Error("Sign in to the Spacetime CLI first.");
const service = await openConnection(null, ["SELECT * FROM published_stores"]);
const owner = await openConnection(ownerToken, [
  "SELECT * FROM service_records",
]);
try {
  await owner.reducers.grantService({ identity: service.identity });
  writeFileSync(
    file,
    [
      `SPACETIME_URI=${process.env.SPACETIME_URI}`,
      `SPACETIME_DATABASE=${database}`,
      `SPACETIME_SERVICE_TOKEN=${service.serviceCredential}`,
      `SPACETIME_AUTH_CLIENT_ID=${clientId}`,
      "SPACETIME_AUTH_AUTHORITY=https://auth.spacetimedb.com/oidc",
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log(
    "Provisioned module service identity " +
      service.identity.toHexString() +
      ". Credentials saved privately.",
  );
} finally {
  owner.disconnect();
  service.disconnect();
}
