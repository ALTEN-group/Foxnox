import { expect, test } from "@playwright/test";
import {
  authenticate,
  enrollTotp,
  fillSecurityQuestions,
  heading,
  login,
  submit,
} from "./helpers/browser";
import { prepareUser } from "./helpers/foxnox";
import { PASSWORD } from "./helpers/env";
import { waitForLink } from "./helpers/mailpit";
import { USERS } from "./helpers/users";

const user = USERS.recover;
let answers: Record<string, string> = {};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await prepareUser(user);
});

test("security questions page is not available without a session", async ({ page }) => {
  const res = await page.goto("security-questions");
  expect(res?.status()).toBeGreaterThanOrEqual(401);
});

test("enrolls three security questions", async ({ page }) => {
  await authenticate(page, user);
  await page.goto("security-questions");
  await expect(heading(page)).toHaveText("Set up security questions");

  await submit(page);
  await expect(page.locator(".form-error")).toHaveText(
    "Select a question and provide an answer for each row.",
  );

  await fillSecurityQuestions(page);
  await submit(page);
  await expect(heading(page)).toHaveText("Security questions saved");
});

test("replacing answers asks for the current password", async ({ page }) => {
  await authenticate(page, user);
  await page.goto("security-questions");
  await expect(page.locator("#password")).toBeVisible();

  await fillSecurityQuestions(page);
  await page.locator("#password").fill("Wrong-Password-1!");
  await submit(page);
  await expect(page.locator(".form-error")).toHaveText(
    "Enter your current password to replace existing answers.",
  );

  answers = await fillSecurityQuestions(page);
  await page.locator("#password").fill(PASSWORD);
  await submit(page);
  await expect(heading(page)).toHaveText("Security questions saved");
});

test("prerequisite: 2FA enabled", async ({ page }) => {
  await authenticate(page, user);
  await enrollTotp(page);
});

test("lost authenticator: security questions switch 2FA off", async ({ page }) => {
  const first = await login(page, user);
  expect(first.status).toBe(202);

  await page.goto(first.body.url);
  await page.getByRole("link", { name: "Lost access to your authenticator?" }).click();
  await expect(heading(page)).toHaveText("Lost access to two-factor authentication?");
  await page.locator("#email").fill(user.email);
  await submit(page);
  await expect(heading(page)).toHaveText("Check your email");

  await page.goto(await waitForLink(user.email, "/account-recover/challenge"));
  await expect(heading(page)).toHaveText("Answer your security questions");

  const ids = Object.keys(answers);
  for (const id of ids) await page.locator(`#answer-${id}`).fill("wrong answer");
  await submit(page);
  await expect(page.locator(".form-error")).toHaveText(
    "One or more answers are incorrect. Try again.",
  );

  // Answers are compared ignoring case and surrounding whitespace.
  for (const id of ids) await page.locator(`#answer-${id}`).fill(`  ${answers[id].toUpperCase()}  `);
  await submit(page);
  await expect(heading(page)).toHaveText("Access restored");

  await page.goto("recover");
  const after = await login(page, user);
  expect(after.status, "2FA is off after recovery").toBe(200);
});

test("recovery link needs a valid token", async ({ page }) => {
  await page.goto("account-recover/challenge?token=not-a-real-token");
  await expect(heading(page)).toHaveText("This link is no longer valid");
});
