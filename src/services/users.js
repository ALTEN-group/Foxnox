// @ts-check
import { log } from "@dwtechs/winstan";

/**
 * Resolve a user by email via the user-management search API (ms_user mock in dev).
 *
 * @param {string} email
 * @returns {Promise<{ id: number, email: string, nickname?: string } | null>}
 */
export async function findUserByEmail(email) {
  const url = process.env.USER_SEARCH_URL;
  if (!url) {
    log.error(
      "USER_SEARCH_URL is not configured — cannot resolve workflow recipients",
    );
    return null;
  }

  const body = {
    filters: {
      email: { value: email, matchMode: "equals" },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      log.error(`USER_SEARCH_URL returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const user = data?.rows?.[0];
    if (!user?.id) return null;

    return {
      id: Number(user.id),
      email: String(user.email ?? email),
      nickname: user.nickname ? String(user.nickname) : undefined,
    };
  } catch (err) {
    log.error(`USER_SEARCH_URL request failed: ${err?.message || err}`);
    return null;
  }
}
