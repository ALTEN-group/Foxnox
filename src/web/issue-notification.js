// @ts-check
import { log } from "@dwtechs/winstan";
import { notifyUser } from "../services/notify.js";
import { createWorkflowToken } from "../services/token.js";
import { findUserByEmail } from "../services/users.js";
import { buildDeepLink } from "./deep-link.js";

/**
 * Shared orchestration: resolve user → create token → deep link → notify.
 *
 * Returns immediately so request handlers can render the same "check your
 * email" page whether or not the address exists. Lookup, token insert, and
 * SMTP run in the background; awaiting them would leak existence via latency.
 *
 * @param {{
 *   email: string,
 *   typeName: string,
 *   path: string,
 *   template: string,
 *   lang?: string,
 * }} params
 * @returns {Promise<{ issued: boolean }>}
 */
export async function issueWorkflowNotification(params) {
  void deliverWorkflowNotification(params);
  return { issued: true };
}

/**
 * @param {{
 *   email: string,
 *   typeName: string,
 *   path: string,
 *   template: string,
 *   lang?: string,
 * }} params
 * @returns {Promise<{ issued: boolean }>}
 */
async function deliverWorkflowNotification({
  email,
  typeName,
  path,
  template,
  lang = "en",
}) {
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      log.info(
        `issueWorkflowNotification: no user for template=${template} (enumeration-safe)`,
      );
      return { issued: false };
    }

    const token = await createWorkflowToken({
      userId: user.id,
      typeName,
    });

    const url = buildDeepLink(path, {
      token: token.plaintext,
      lang,
    });

    await notifyUser({
      template,
      to: user.email,
      lang,
      vars: {
        url,
        expiresAt: token.expiresAt.toISOString(),
        typeName: token.typeName,
        nickname: user.nickname ?? null,
      },
    });

    return { issued: true };
  } catch (err) {
    log.error(
      `issueWorkflowNotification failed template=${template}: ${err?.message || err}`,
    );
    return { issued: false };
  }
}
