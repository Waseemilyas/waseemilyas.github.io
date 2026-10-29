import { defineConfig } from "@playwright/test";

// Choose the target and revision explicitly so a local check cannot silently
// exercise production or an older build.
const target = new URL(process.env.BASE_URL || "http://127.0.0.1");
if (!process.env.BASE_URL || !/^https?:$/.test(target.protocol) || target.username || target.password) {
  throw new Error("Set BASE_URL to the local build or public site to exercise.");
}
if (!/^[0-9a-f]{40}$/.test(process.env.EXPECTED_REVISION || "")) {
  throw new Error("Set EXPECTED_REVISION to the full commit SHA built at BASE_URL.");
}
const serve = process.env.E2E_SERVE === "1";
if (serve && (target.protocol !== "http:" || target.hostname !== "127.0.0.1" || !target.port)) {
  throw new Error("E2E_SERVE requires BASE_URL=http://127.0.0.1:<private-port>.");
}
export default defineConfig({
  testDir: ".",
  testMatch: "visitor.spec.mjs",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  outputDir: process.env.E2E_OUT || "test-results",
  reporter: [["list"], ["json", { outputFile: `${process.env.E2E_OUT || "test-results"}/result.json` }]],
  webServer: serve ? {
    command: `python3 -m http.server ${target.port} --bind 127.0.0.1 --directory ../_site`,
    url: `${target.origin}/revision.txt`,
    reuseExistingServer: false,
    timeout: 10_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 3_000 },
  } : undefined,
  use: {
    baseURL: target.origin,
    serviceWorkers: "block",
    contextOptions: { reducedMotion: "reduce" },
    // Optional: use an already-installed Chromium instead of the bundled one.
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
  ],
});
