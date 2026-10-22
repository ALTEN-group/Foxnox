import { defineConfig, devices } from "@playwright/test";

/**
 * Public web workflows (recover, 2FA, unlock, devices, ...) are served by Foxnox
 * behind Traefik at /api/foxnox/web/. Run through `./scripts/e2e-web.sh`, which
 * resets the e2e accounts first.
 *
 * The deep links Foxnox emits and redirects to use WEB_PUBLIC_ORIGIN
 * (http://localhost:8100). Inside the e2e container that host does not exist, so
 * E2E_HOST_RULES remaps it to Traefik at the Chromium DNS level; cookies keep
 * the localhost origin.
 */
const baseURL = (
  process.env.E2E_BASE_URL ?? "http://localhost:8100/api/foxnox/web/"
).replace(/\/?$/, "/");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: process.env.E2E_HOST_RULES
        ? [`--host-resolver-rules=${process.env.E2E_HOST_RULES}`]
        : [],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
