// @ts-check
import { getPublicOrigin } from "./deep-link.js";
import {
  createWorkflowToken,
  consumeWorkflowToken,
  findValidWorkflowToken,
  TOKEN_TYPES,
} from "../services/token.js";

/**
 * Browser URL that completes login after mid-login challenges
 * (admin login page with ?ticket=…).
 * @returns {string}
 */
export function getLoginResumeBaseUrl() {
  const fromEnv = process.env.WEB_LOGIN_RESUME_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return `${getPublicOrigin()}/admin/login`;
}

/**
 * Mint a one-shot resume ticket and return the absolute admin URL.
 *
 * @param {number} userId
 * @returns {Promise<string>}
 */
export async function buildLoginResumeUrl(userId) {
  const token = await createWorkflowToken({
    userId,
    typeName: TOKEN_TYPES.LOGIN_RESUME,
  });
  const url = new URL(getLoginResumeBaseUrl());
  url.searchParams.set("ticket", token.plaintext);
  return url.toString();
}

/**
 * Validate + consume a login-resume ticket.
 *
 * @param {string} plaintext
 * @returns {Promise<{ userId: number }|null>}
 */
export async function redeemLoginResumeTicket(plaintext) {
  const valid = await findValidWorkflowToken({
    plaintext,
    typeName: TOKEN_TYPES.LOGIN_RESUME,
  });
  if (!valid) return null;
  await consumeWorkflowToken(valid.id);
  return { userId: valid.userId };
}
