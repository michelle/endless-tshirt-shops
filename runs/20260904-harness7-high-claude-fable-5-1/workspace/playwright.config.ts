import { defineConfig } from "@playwright/test";

/**
 * End-to-end test of the real customer flow against a running instance.
 *   BASE_URL=https://example.vercel.app npm run test:e2e
 * Defaults to http://localhost:3000.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results",
});
