// @ts-check
import { log } from "@dwtechs/winstan";

/**
 * Outbound notification port. Logs today; swap for the mail service later.
 *
 * @typedef {{
 *   template: string,
 *   to: string,
 *   lang?: string,
 *   vars: Record<string, unknown>,
 * }} NotifyPayload
 */

/**
 * @param {NotifyPayload} payload
 * @returns {Promise<void>}
 */
export async function notifyUser(payload) {
  const { template, to, lang, vars } = payload;
  // Intentionally verbose in development so deep links can be copied from logs
  // until a real mail service is wired.
  log.info(
    `notifyUser [log-notifier] template=${template} to=${to} lang=${lang ?? "en"} vars=${JSON.stringify(vars)}`,
  );
}
