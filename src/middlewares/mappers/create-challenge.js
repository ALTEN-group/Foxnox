// @ts-check
import { createLoginChallenge } from "../../services/challenge.js";

/**
 * Mint a login challenge and expose its public response to the terminal
 * response middleware.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function createChallenge(req, res, next) {
  try {
    const minted = await createLoginChallenge({
      userId: req.body.userId,
      kind: req.body.kind,
    });

    res.locals.challenge = {
      kind: minted.kind,
      challenge: minted.challenge,
      path: minted.path,
      url: minted.url,
      expiresAt: minted.expiresAt.toISOString(),
    };
    next();
  } catch (err) {
    next(err);
  }
}
