import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { build } from "esbuild";

// Exercise the real OIDC client against a local provider with SpacetimeAuth's
// separate email-confirmation / polling-tab contract. No real email or tokens.
let server,
  base,
  bundle,
  exchanges = 0;
const requests = new Map();
const json = (res, value, status = 200) => {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
};
const html = (res, value) => {
  res.writeHead(200, { "content-type": "text/html" });
  res.end(value);
};
test.beforeAll(async () => {
  bundle = (
    await build({
      entryPoints: ["src/auth.js"],
      bundle: true,
      format: "esm",
      write: false,
    })
  ).outputFiles[0].text;
  server = createServer(async (req, res) => {
    const url = new URL(req.url, base);
    if (url.pathname === "/auth-client.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end(bundle);
    }
    if (url.pathname === "/oidc/.well-known/openid-configuration")
      return json(res, {
        issuer: base + "/oidc",
        authorization_endpoint: base + "/oidc/authorize",
        token_endpoint: base + "/oidc/token",
        jwks_uri: base + "/oidc/keys",
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        code_challenge_methods_supported: ["S256"],
      });
    if (url.pathname === "/oidc/authorize") {
      const id = randomUUID();
      requests.set(id, {
        ...Object.fromEntries(url.searchParams),
        verified: false,
      });
      return html(
        res,
        `<h1>Check your email</h1><p>Keep this sign-in tab open.</p><a href="/confirm?id=${id}" target="_blank">Simulated email confirmation</a><script>setInterval(async()=>{const s=await fetch('/status?id=${id}').then(r=>r.json());if(s.verified)location.href=s.callback},50)</script>`,
      );
    }
    if (url.pathname === "/confirm") {
      requests.get(url.searchParams.get("id")).verified = true;
      return html(res, "<h1>Email confirmed. You may close this tab.</h1>");
    }
    if (url.pathname === "/status") {
      const id = url.searchParams.get("id"),
        r = requests.get(id);
      return json(res, {
        verified: r.verified,
        callback: `${r.redirect_uri}?code=${id}&state=${r.state}`,
      });
    }
    if (url.pathname === "/oidc/token") {
      exchanges++;
      let body = "";
      for await (const chunk of req) body += chunk;
      const values = new URLSearchParams(body),
        r = requests.get(values.get("code"));
      if (
        !r?.verified ||
        r.used ||
        createHash("sha256")
          .update(values.get("code_verifier") || "")
          .digest("base64url") !== r.code_challenge
      )
        return json(res, { error: "invalid_grant" }, 400);
      r.used = true;
      const encode = (value) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const id_token = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: base + "/oidc", aud: "kalpi-auth-test", sub: "test-creator", email: "creator@example.invalid", nonce: r.nonce, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture-signature`;
      return json(res, {
        token_type: "Bearer",
        access_token: "fixture-access",
        id_token,
        expires_in: 3600,
        scope: "openid profile email",
      });
    }
    if (["/", "/auth/start", "/auth/callback"].includes(url.pathname))
      return html(
        res,
        `
      <h1>Kalpi authentication check</h1><div role="status">Loading</div><button>Creator sign in</button><p id="pending" hidden>Keep the sign-in tab open.</p><p role="alert"></p>
      <script type="module">
        import { initializeCreatorAuth, redirectCreatorSignIn, openCreatorSignIn, creatorUser } from '/auth-client.js';
        const config = {authAuthority: '${base}/oidc', authClientId: 'kalpi-auth-test'};
        const show = user => { document.querySelector('[role=status]').textContent = user ? 'Signed in as ' + user.profile.email : 'Signed out'; document.querySelector('button').hidden = !!user; };
        document.querySelector('button').onclick = () => { try { openCreatorSignIn(); document.querySelector('#pending').hidden = false; } catch(e) {document.querySelector('[role=alert]').textContent=e.message;} };
        try { if(location.pathname === '/auth/start') await redirectCreatorSignIn(config); else show(await initializeCreatorAuth(config, show)); } catch(e) {document.querySelector('[role=alert]').textContent=e.message;}
      </script>`,
      );
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("magic-link polling stays open and signs the original app in across tabs", async ({
  page,
  context,
}) => {
  await page.goto(base);
  await expect(page.getByRole("status")).toHaveText("Signed out");
  const opened = context.waitForEvent("page");
  await page.getByRole("button", { name: "Creator sign in" }).click();
  const signIn = await opened;
  await expect(signIn.getByRole("heading")).toHaveText("Check your email");
  expect(page.url()).toBe(base + "/");
  await expect(page.locator("#pending")).toBeVisible();
  const emailOpened = context.waitForEvent("page");
  await signIn
    .getByRole("link", { name: "Simulated email confirmation" })
    .click();
  const email = await emailOpened;
  await expect(email.getByRole("heading")).toContainText(
    "You may close this tab",
  );
  await expect(signIn.getByRole("status")).toHaveText(
    "Signed in as creator@example.invalid",
  );
  await expect(page.getByRole("status")).toHaveText(
    "Signed in as creator@example.invalid",
  );
  await expect(
    page.getByRole("button", { name: "Creator sign in" }),
  ).toBeHidden();
  await email.close();
  await signIn.close();
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(
    "Signed in as creator@example.invalid",
  );
  await page.screenshot({ path: "test-results/auth-complete.png" });
});

test("missing callback state fails closed and a reload can start over", async ({
  page,
}) => {
  const before = exchanges;
  await page.goto(base + "/auth/callback?code=untrusted&state=missing");
  await expect(page.getByRole("alert")).toContainText("start a fresh sign-in");
  expect(exchanges).toBe(before);
  expect(page.url()).toBe(base + "/");
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Signed out");
});

test("blocked sign-in tab gives a recoverable message without navigating away", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Creator sign in" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Allow pop-ups for Kalpi",
  );
  expect(page.url()).toBe(base + "/");
});
