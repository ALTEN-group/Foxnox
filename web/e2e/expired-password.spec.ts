import { expect, test } from "@playwright/test";
import { expectAdminSession, fillPasswords, heading, submit } from "./helpers/browser";
import { NEW_PASSWORD, PASSWORD } from "./helpers/env";
import { compare, mintChallenge, prepareUser } from "./helpers/foxnox";
import { USERS } from "./helpers/users";

const user = USERS.passwords;

test.beforeEach(async () => {
  await prepareUser(user);
});

// A real expired login cannot be staged: the pwd_expiry_guard trigger refuses a past
// pwdExpiry. So the challenge is minted the way the BFF does after `pwdExpiry < now`.
test.describe("expired password", () => {
  test("forces a new password, signs the user in, and works only once", async ({ page }) => {
    const url = await mintChallenge(user, "expired-password");
    await page.goto(url);
    await expect(heading(page)).toHaveText("Your password has expired");

    await fillPasswords(page, NEW_PASSWORD, `${NEW_PASSWORD}x`);
    await submit(page);
    await expect(page.locator(".form-error")).toHaveText("Passwords do not match.");

    await fillPasswords(page, "short");
    await submit(page);
    await expect(page.locator(".form-error")).toHaveText("Password does not meet the security policy.");

    await fillPasswords(page, NEW_PASSWORD);
    await submit(page);
    await expectAdminSession(page);

    expect(await compare(user, NEW_PASSWORD)).toBe(200);
    expect(await compare(user, PASSWORD)).toBe(401);

    await page.goto(url);
    await expect(page.locator(".form-error")).toHaveText("This session is no longer valid. Sign in again.");
  });

  test("rejects an unknown challenge", async ({ page }) => {
    await page.goto("password/expired?challenge=not-a-real-challenge");
    await expect(page.locator(".form-error")).toHaveText("This session is no longer valid. Sign in again.");
  });
});
