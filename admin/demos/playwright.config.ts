import { defineConfig, devices } from "@playwright/test";

/** Video format: the viewport is filmed as is, without scaling. */
const DEMO_SIZE = { width: 1440, height: 900 };

/**
 * Filmed scenarios for the website demo videos, not tests: slow, with pauses and a fake cursor.
 * Raw videos (.webm) land in `videos/`, then `to-mp4.mjs` encodes them into the website.
 * Runs against the dev stack, like the e2e suite: `./scripts/start-dev.sh` first.
 */
const baseURL = (
  process.env.E2E_BASE_URL ?? "http://localhost:8200/foxnox/"
).replace(/\/?$/, "/");

export default defineConfig({
  testDir: "./scenarios",
  testMatch: "**/*.demo.ts",
  outputDir: "./.playwright",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: DEMO_SIZE,
    deviceScaleFactor: 1,
    video: { mode: "on", size: DEMO_SIZE },
  },
});
