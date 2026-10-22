import { expect, type Page, test } from "@playwright/test";
import {
  authenticate,
  enrollTotp,
  expectAdminSession,
  heading,
  login,
  submit,
} from "./helpers/browser";
import { prepareUser } from "./helpers/foxnox";
import { totp } from "./helpers/totp";
import { USERS } from "./helpers/users";

const user = USERS.devices;
let secret = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await prepareUser(user);
});

async function passTwoFactor(page: Page, url: string) {
  await page.goto(url);
  await page.locator("#code").fill(totp(secret));
  await submit(page);
  await expect(heading(page)).toHaveText("Trust this device?");
}

test("prerequisite: 2FA enabled", async ({ page }) => {
  await authenticate(page, user);
  secret = await enrollTotp(page);
});

test("trusted device skips 2FA until it is revoked", async ({ page }) => {
  const first = await login(page, user);
  expect(first.status).toBe(202);
  await passTwoFactor(page, first.body.url);
  await page.locator("#deviceName").fill("e2e-laptop");
  await submit(page, /Trust this device/);
  await expectAdminSession(page);

  await page.goto("recover");
  const second = await login(page, user);
  expect(second.status, "cookie from the trust prompt skips 2FA").toBe(200);
  expect(second.body.accessToken).toBeTruthy();

  await authenticate(page, user, second.body.accessToken);
  await page.goto("trusted-devices");
  await expect(heading(page)).toHaveText("Trusted devices");
  const row = page.locator("tr", { hasText: "e2e-laptop" });
  await expect(row).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    row.getByRole("button", { name: "Revoke" }).click(),
  ]);
  await expect(heading(page)).toHaveText("Trust revoked");

  const third = await login(page, user);
  expect(third.status, "revoked device must face 2FA again").toBe(202);
});

test("trusted-device prompt needs a valid challenge", async ({ page }) => {
  await page.goto("trusted-devices/prompt?challenge=not-a-real-challenge");
  await expect(heading(page)).toHaveText("This sign-in step is no longer valid");
});
