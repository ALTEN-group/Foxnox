// @ts-check
import express from "express";

const router = express.Router();

import bEnt from "../entities/branding.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import history from "../middlewares/history.js";
import schema from "../middlewares/schema.js";
import { loadBrandingFromDb } from "../web/branding.js";

/**
 * Refreshes the in-memory branding cache after any write so workflow pages
 * and emails pick up the change without a restart.
 * @type {import('express').RequestHandler}
 */
async function invalidateBrandingCache(req, res, next) {
  await loadBrandingFromDb();
  next();
}

//Routes
// Search fields
router.post("/search", enforceAcl(bEnt, "search"), bEnt.get);
// Get version history of a specific row
router.get(
  "/:id/history",
  enforceAcl(bEnt, "existing"),
  history.get("branding"),
);
// Add branding rows
router.post(
  "/",
  requireConsumer,
  enforceAcl(bEnt, "insert"),
  bEnt.addArraySubstack,
  invalidateBrandingCache,
);
// Update fields
router.put(
  "/",
  requireConsumer,
  enforceAcl(bEnt, "existing"),
  bEnt.updateArraySubstack,
  invalidateBrandingCache,
);
// Bulk archive
router.post(
  "/archive",
  requireConsumer,
  enforceAcl(bEnt, "existing"),
  bEnt.archive,
  invalidateBrandingCache,
);
// Get entity schema
router.get("/schema", enforceAcl(bEnt, "output"), schema.get(bEnt));

export default router;
