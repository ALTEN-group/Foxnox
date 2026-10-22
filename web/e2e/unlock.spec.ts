import { expect, test } from "@playwright/test";
import { heading, submit } from "./helpers/browser";
import { PASSWORD } from "./helpers/env";
import { compare, prepareUser } from "./helpers/foxnox";
import { waitForLink } from "./helpers/mailpit";
import { USERS } from "./helpers/users";

const user = USERS.passwords;

test.beforeEach(async () => {
  await prepareUser(user);
});

test("locked account is unlocked through the emailed link", async ({ page }) => {
  // Wrong passwords straight on Foxnox: no Gatelin rate limit, lockout threshold comes from the policy.
  let status = 401;
  for (let i = 0; i < 10 && status !== 403; i++) status = await compare(user, "Wrong-Password-1!");
  expect(status, "account locks after repeated failures").toBe(403);
  expect(await compare(user, PASSWORD), "right password is refused while locked").toBe(403);

  await page.goto("unlock");
  await expect(heading(page)).toHaveText("Account temporarily locked");
  await page.locator("#email").fill(user.email);
  await submit(page);
  await expect(heading(page)).toHaveText("Unlock requested");

  await page.goto(await waitForLink(user.email, "/unlock/confirm"));
  await expect(heading(page)).toHaveText("Account unlocked");

  expect(await compare(user, PASSWORD)).toBe(200);
});

test("unlock link is rejected when invalid", async ({ page }) => {
  await page.goto("unlock/confirm?token=not-a-real-token");
  await expect(heading(page)).toHaveText("This unlock link is no longer valid");
});
