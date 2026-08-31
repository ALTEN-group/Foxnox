// @ts-check

/**
 * Sets req.body.rows[].userId to the authenticated consumer's id - never
 * trusting whatever the client posted, since that field decides row
 * ownership and, if null, would create a shared template - and sets
 * resourceName from the URL's :resource segment. No resource entity lookup
 * needed: Foxnox has no resource/service registry, resourceName is a plain
 * column CHECK-constrained to the 4 known admin resources.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function injectUserIdAndResourceName(req, res, next) {
  const userId = res.locals.consumer.userId;
  const { resource } = req.params;
  req.body.rows = req.body.rows.map((r) => ({
    ...r,
    userId,
    resourceName: resource,
  }));
  next();
}
