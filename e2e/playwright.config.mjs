import { defineConfig } from "@playwright/test";

// Read-only visitor journey. BASE_URL defaults to production; point it at a
// local build of _site/ to check a change before merge.
export default defineConfig({
  testDir: ".",
  testMatch: "visitor.spec.mjs",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  outputDir: process.env.E2E_OUT || "test-results",
  use: {
    baseURL: process.env.BASE_URL || "https://waseemilyas.uk",
    // Optional: use an already-installed Chromium instead of the bundled one.
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
  ],
});
