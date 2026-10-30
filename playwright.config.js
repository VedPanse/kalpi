import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (!process.env.KALPI_HOSTED_URL && existsSync(".local/runtime.env"))
  process.loadEnvFile(".local/runtime.env");
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 600000,
  workers: 1,
  expect: { timeout: 20000 },
  fullyParallel: false,
  use: {
    baseURL: process.env.KALPI_HOSTED_URL || "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  reporter: "list",
});
