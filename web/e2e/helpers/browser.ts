import { expect, type Page } from "@playwright/test";
import { ORIGIN, PASSWORD } from "./env";
import { totp } from "./totp";
import type { E2eUser } from "./users";

/** workflows.js blocks submits within 1.5 s of render (anti-bot); wait it out. */
export async function waitFillTime(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const rendered = Number(document.querySelector<HTMLInputElement>("#renderedAt")?.value ?? 0);
    return rendered > 0 && Date.now() - rendered > 1700;
  });
}

/** Clicks a form button once the anti-bot delay passed and waits for the resulting page. */
export async function submit(page: Page, button: string | RegExp = /./): Promise<void> {
  await waitFillTime(page);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.locator('form.form button[type="submit"]').filter({ hasText: button }).first().click(),
  ]);
}

export async function fillPasswords(page: Page, password: string, confirm = password): Promise<void> {
  await page.locator("#password").fill(password);
  await page.locator("#confirm").fill(confirm);
}

export const heading = (page: Page) => page.locator(".card__title");

type Json = Record<string, any>;

async function gatelin(page: Page, path: string, payload: Json): Promise<{ status: number; body: Json }> {
  // Same-origin fetch from the page so the trusted-device cookie travels like in a real login.
  if (!page.url().startsWith(ORIGIN)) await page.goto("recover");
  const res = await page.evaluate(
    async ({ path, payload }) => {
      const r = await fetch(`/api/gatelin${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      let body = null;
      try {
        body = await r.json();
      } catch {
        // empty body
      }
      return { status: r.status, body };
    },
    { path, payload },
  );
  if (res.status === 429) {
    throw new Error(
      "Gatelin rate limit (20 /sessions per 15 min). Wait, or restart the gatelin container to reset it.",
    );
  }
  return res as { status: number; body: Json };
}

/** POST /api/gatelin/sessions — 200 { accessToken }, 202 { kind, url } or an error. */
export const login = (page: Page, user: E2eUser, password = PASSWORD) =>
  gatelin(page, "/sessions", { email: user.email, pwd: password });

/**
 * Workflows end with a redirect to WEB_LOGIN_RESUME_URL?ticket=… — the admin login,
 * which trades the ticket for a session. Passing means the whole chain worked:
 * workflow → ticket → Gatelin → admin session.
 */
export async function expectAdminSession(page: Page): Promise<void> {
  await expect(page.getByRole("link", { name: /Passwords/ })).toBeVisible({ timeout: 30_000 });
}

const tokens = new Map<number, string>();

/**
 * Protected workflow pages (2FA setup, security questions, trusted devices) need the
 * Authorization header Gatelin turns into x-consumer-user-id; a browser never sends it
 * on plain navigations, so inject it. One login per account per run (rate limit). A newer
 * session for the same user invalidates older tokens, so pass the latest `accessToken`
 * after any login that completed.
 */
export async function authenticate(page: Page, user: E2eUser, accessToken?: string): Promise<void> {
  let token = accessToken ?? tokens.get(user.id);
  if (!token) {
    const { status, body } = await login(page, user);
    expect(status, `login ${user.email}`).toBe(200);
    token = body.accessToken as string;
    tokens.set(user.id, token);
  }
  await page.route(
    /\/api\/foxnox\/web\/(2fa\/setup|security-questions|trusted-devices)\/?(\?.*)?$/,
    (route) =>
      route.continue({ headers: { ...route.request().headers(), authorization: `Bearer ${token}` } }),
  );
}

/** Walks /2fa/setup with a computed TOTP, like scanning the QR into an authenticator. */
export async function enrollTotp(page: Page): Promise<string> {
  await page.goto("2fa/setup");
  await expect(heading(page)).toHaveText("Set up two-factor authentication");
  const secret = await page.locator('input[name="secret"]').inputValue();
  await page.locator("#code").fill(totp(secret));
  await submit(page);
  await expect(heading(page)).toHaveText("Two-factor authentication is on");
  return secret;
}

/** Picks three distinct questions on /security-questions and answers them; returns id → answer. */
export async function fillSecurityQuestions(page: Page): Promise<Record<string, string>> {
  const selects = page.locator('select[name="questionIds"]');
  const answers = page.locator('input[name="answers"]');
  const count = await selects.count();
  const ids = await selects
    .first()
    .locator("option")
    .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean));

  const given: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    await selects.nth(i).selectOption(ids[i]);
    given[ids[i]] = `Answer ${ids[i]}`;
    await answers.nth(i).fill(given[ids[i]]);
  }
  return given;
}
