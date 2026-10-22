import { FOXNOX_URL, PASSWORD } from "./env";
import { clearMailbox, waitForLink } from "./mailpit";
import type { E2eUser } from "./users";

const WEB = `${FOXNOX_URL}/foxnox/web`;

const CONSUMER_HEADERS = {
  "content-type": "application/json",
  "x-consumer-user-id": "1",
  "x-consumer-name": "e2e-web",
};

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${FOXNOX_URL}/foxnox${path}`, {
    method,
    headers: CONSUMER_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON error body
  }
  return { status: res.status, json, text };
}

/** POST /foxnox/pwd/compare straight to Foxnox (no Gatelin rate limit). */
export async function compare(user: E2eUser, pwd: string): Promise<number> {
  return (await api("POST", "/pwd/compare", { userId: user.id, pwd })).status;
}

/**
 * Mints a login challenge the way the BFF does: a successful compare first
 * (Foxnox refuses to mint without one), then POST /challenges.
 * Returns the URL to open in the browser.
 */
export async function mintChallenge(
  user: E2eUser,
  kind: "expired-password" | "2fa" | "trusted-device",
  pwd = PASSWORD,
): Promise<string> {
  const ok = await compare(user, pwd);
  if (ok !== 200) throw new Error(`compare before mint failed: HTTP ${ok}`);
  const { status, json, text } = await api("POST", "/challenges", { userId: user.id, kind });
  if (status !== 201) throw new Error(`mint ${kind} failed: HTTP ${status} ${text}`);
  return json.url as string;
}

async function submitForm(path: string, fields: Record<string, string>, cookie: string, csrf: string) {
  return fetch(`${WEB}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: new URLSearchParams({
      lang: "en",
      website: "",
      rendered_at: String(Date.now() - 3000),
      csrf,
      ...fields,
    }),
  });
}

async function loadForm(pathAndQuery: string) {
  const res = await fetch(`${WEB}${pathAndQuery}`);
  const html = await res.text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("foxnox_csrf="));
  if (!csrf || !cookie) throw new Error(`No CSRF form at ${pathAndQuery} (HTTP ${res.status})`);
  return { csrf, cookie };
}

/**
 * Makes `user` loginable with PASSWORD: creates its pwd row if missing, then sets
 * the password through the real "forgot password" flow (email via Mailpit).
 * Expects scripts/e2e-web.sh to have wiped the user's state beforehand.
 */
export async function prepareUser(user: E2eUser): Promise<void> {
  const found = await api("POST", "/pwd/search", {
    filters: { userId: { value: user.id, matchMode: "equals" } },
  });
  const rows: any[] = found.json?.rows ?? [];
  const active = rows.find((r) => !r.archived);
  if (active?.twoFactorEnabled) {
    throw new Error(
      `${user.email} still has 2FA enabled from a previous run. Run ./scripts/e2e-web.sh (it resets e2e state) instead of playwright directly.`,
    );
  }
  if (!active) {
    const created = await api("POST", "/pwd", { rows: [{ userId: user.id }] });
    if (created.status !== 200) throw new Error(`create pwd failed: HTTP ${created.status} ${created.text}`);
  }

  await clearMailbox(user.email);
  const request = await loadForm("/recover");
  const sent = await submitForm("/recover", { email: user.email }, request.cookie, request.csrf);
  if (sent.status !== 303) throw new Error(`recover request failed: HTTP ${sent.status}`);

  const link = await waitForLink(user.email, "/recover/reset");
  const token = new URL(link).searchParams.get("token")!;
  const reset = await loadForm(`/recover/reset?token=${encodeURIComponent(token)}`);
  const done = await submitForm(
    "/recover/reset",
    { token, password: PASSWORD, confirm: PASSWORD },
    reset.cookie,
    reset.csrf,
  );
  if (done.status !== 200) throw new Error(`password reset failed: HTTP ${done.status}`);
  await clearMailbox(user.email);
}
