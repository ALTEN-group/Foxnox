import { expect, type Page, test } from "@playwright/test";
import { fillPasswords, heading, submit } from "./helpers/browser";
import { NEW_PASSWORD, PASSWORD } from "./helpers/env";
import { compare, prepareUser } from "./helpers/foxnox";
import { waitForLink } from "./helpers/mailpit";
import { USERS } from "./helpers/users";

const user = USERS.passwords;
const error = (page: Page) => page.locator(".form-error");

test.beforeEach(async () => {
  await prepareUser(user);
});

test.describe("forgot password", () => {
  test("emails a link, validates the new password, then updates it", async ({ page }) => {
    await page.goto("recover");
    await expect(heading(page)).toHaveText("Forgot your password?");
    await page.locator("#email").fill(user.email);
    await submit(page);
    await expect(heading(page)).toHaveText("Check your email");

    await page.goto(await waitForLink(user.email, "/recover/reset"));
    await expect(heading(page)).toHaveText("Choose a new password");

    await fillPasswords(page, NEW_PASSWORD, `${NEW_PASSWORD}x`);
    await submit(page);
    await expect(error(page)).toHaveText("Passwords do not match.");

    await fillPasswords(page, "short");
    await submit(page);
    await expect(error(page)).toHaveText("Password does not meet the security policy.");

    await fillPasswords(page, NEW_PASSWORD);
    await submit(page);
    await expect(heading(page)).toHaveText("Password updated");

    expect(await compare(user, NEW_PASSWORD)).toBe(200);
    expect(await compare(user, PASSWORD)).toBe(401);
  });

  test("reset link works only once", async ({ page }) => {
    await page.goto("recover");
    await page.locator("#email").fill(user.email);
    await submit(page);
    const link = await waitForLink(user.email, "/recover/reset");

    await page.goto(link);
    await fillPasswords(page, NEW_PASSWORD);
    await submit(page);
    await expect(heading(page)).toHaveText("Password updated");

    await page.goto(link);
    await expect(heading(page)).toHaveText("This link is no longer valid");
  });

  test("rejects a malformed email and does not reveal unknown accounts", async ({ page }) => {
    await page.goto("recover");
    await page.locator("#email").fill("not-an-email");
    await submit(page);
    await expect(error(page)).toHaveText("Enter a valid email address.");

    await page.locator("#email").fill("nobody-here@example.com");
    await submit(page);
    await expect(heading(page)).toHaveText("Check your email");
  });

  test("rejects a bad token", async ({ page }) => {
    await page.goto("recover/reset?token=not-a-real-token");
    await expect(heading(page)).toHaveText("This link is no longer valid");
  });
});
