// @ts-check
import { isArray, isInteger } from "@dwtechs/checkard";
import { log } from "@dwtechs/winstan";

/**
 * First user matching the filters on the user-management search API
 * (ms_user mock in dev), or null when absent or unreachable.
 *
 * @param {Record<string, { value: unknown, matchMode: string }>} filters
 * @returns {Promise<Record<string, any> | null>}
 */
async function searchUser(filters) {
  const url = process.env.USER_SEARCH_URL;
  if (!url) {
    log.error(
      "USER_SEARCH_URL is not configured — cannot resolve workflow recipients",
    );
    return null;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ filters }),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      log.error(`USER_SEARCH_URL returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const user = data?.rows?.[0];
    return user?.id ? user : null;
  } catch (err) {
    log.error(`USER_SEARCH_URL request failed: ${err?.message || err}`);
    return null;
  }
}

/**
 * Resolve a user by email via the user-management search API.
 *
 * @param {string} email
 * @returns {Promise<{ id: number, email: string, nickname?: string } | null>}
 */
export async function findUserByEmail(email) {
  const user = await searchUser({
    email: { value: email, matchMode: "equals" },
  });
  if (!user) return null;

  return {
    id: Number(user.id),
    email: String(user.email ?? email),
    nickname: user.nickname ? String(user.nickname) : undefined,
  };
}

/**
 * Gatelin role ids of a user, via the user-management search API.
 *
 * @param {number} userId
 * @returns {Promise<number[]>} empty when the user or its roles are unknown
 */
export async function findUserRoleIds(userId) {
  const user = await searchUser({ id: { value: userId, matchMode: "equals" } });
  if (!isArray(user?.roles)) return [];
  return user.roles.filter((id) => isInteger(id, false)).map(Number);
}
