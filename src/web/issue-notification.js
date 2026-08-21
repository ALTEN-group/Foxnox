// @ts-check
import { log } from "@dwtechs/winstan";
import { notifyUser } from "../services/notify.js";
import { createWorkflowToken } from "../services/token.js";
import { findUserByEmail } from "../services/users.js";
import { buildDeepLink } from "./deep-link.js";

/**
 * Shared orchestration: resolve user → create token → deep link → notify.
 * Always returns without throwing for "user not found" so callers can keep
 * enumeration-safe UX. Transport/DB errors are logged and swallowed the same
 * way so the UI still shows the generic "check your email" page.
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
export async function issueWorkflowNotification({
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
