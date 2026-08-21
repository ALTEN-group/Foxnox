// @ts-check

/**
 * Send the newly minted login challenge.
 *
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 */
export function sendChallenge(_req, res) {
  res.status(201).json(res.locals.challenge);
}
