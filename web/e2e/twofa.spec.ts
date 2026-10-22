import { expect, test } from "@playwright/test";
import {
  authenticate,
  enrollTotp,
  expectAdminSession,
  fillPasswords,
  heading,
  login,
  submit,
} from "./helpers/browser";
import { NEW_PASSWORD } from "./helpers/env";
import { mintChallenge, prepareUser } from "./helpers/foxnox";
import { totp } from "./helpers/totp";
import { USERS } from "./helpers/users";

const user = USERS.twofa;
const INVALID_STEP = "This sign-in step is no longer valid";
let secret = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await prepareUser(user);
});

test("verify page needs a valid challenge", async ({ page }) => {
  await page.goto("2fa/verify");
  await expect(heading(page)).toHaveText(INVALID_STEP);
  await page.goto("2fa/verify?challenge=not-a-real-challenge");
  await expect(heading(page)).toHaveText(INVALID_STEP);
});

test("enrolls an authenticator (wrong code first, then a real TOTP)", async ({ page }) => {
  await authenticate(page, user);
  await page.goto("2fa/setup");
  await expect(page.locator('input[name="secret"]')).toHaveCount(1);

  // 123456 is accepted outside production; use a code that is wrong everywhere.
  await page.locator("#code").fill("000000");
  await submit(page);
  await expect(page.locator(".form-error")).toHaveText("That code is not valid. Try again.");

  secret = await enrollTotp(page);
  expect(secret).toMatch(/^[A-Z2-7]+$/);
});

test("login now requires the authenticator code", async ({ page }) => {
  const res = await login(page, user);
  expect(res.status).toBe(202);
  expect(res.body.kind).toBe("2fa");

  await page.goto(res.body.url);
  await expect(heading(page)).toHaveText("Enter your verification code");

  await page.locator("#code").fill("000000");
  await submit(page);
  await expect(page.locator(".form-error")).toHaveText("That code is not valid. Try again.");

  await page.locator("#code").fill(totp(secret));
  await submit(page);
  await expect(heading(page)).toHaveText("Trust this device?");
  await submit(page, /Not now/);

  await expectAdminSession(page);
});

test("too many wrong codes kill the challenge", async ({ page }) => {
  const res = await login(page, user);
  expect(res.status).toBe(202);
  await page.goto(res.body.url);

  for (let i = 0; i < 5; i++) {
    if ((await heading(page).textContent()) === INVALID_STEP) break;
    await page.locator("#code").fill("000000");
    await submit(page);
  }
  await expect(heading(page)).toHaveText(INVALID_STEP);

  await page.goto(res.body.url);
  await expect(heading(page)).toHaveText(INVALID_STEP);
});

test("expired password goes through 2FA after the new password", async ({ page }) => {
  await page.goto(await mintChallenge(user, "expired-password"));
  await fillPasswords(page, NEW_PASSWORD);
  await submit(page);

  await expect(heading(page)).toHaveText("Enter your verification code");
  await page.locator("#code").fill(totp(secret));
  await submit(page);
  // Stops at the trust prompt: finishing would load the admin and spend Gatelin's session rate limit.
  await expect(heading(page)).toHaveText("Trust this device?");
});
