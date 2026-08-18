// @ts-check

/**
 * Gatelin forwards the authenticated user on protected proxy routes.
 *
 * @param {import('express').Request} req
 * @returns {number|null}
 */
export function getConsumerUserId(req) {
  const raw =
    req.headers["x-consumer-user-id"] ??
    req.headers["x-consumer-userid"] ??
    "";
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}
