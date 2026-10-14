// @ts-check
import express from "express";

const router = express.Router();

import bEnt from "../entities/branding.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import {
  deleteBrandingLogo,
  saveBrandingLogo,
} from "../middlewares/mappers/save-logo.js";
import schema from "../middlewares/schema.js";
import {
  assertLogoFieldAllowed,
  parseLogoUpload,
  validateLogoFile,
} from "../middlewares/validators/logo-upload.js";
import { loadBrandingFromDb } from "../web/branding.js";

/**
 * Refreshes the in-memory branding cache after any write so workflow pages
 * and emails pick up the change without a restart.
 * @type {import('express').RequestHandler}
 */
async function invalidateBrandingCache(_req, _res, next) {
  await loadBrandingFromDb();
  return next();
}

//Routes
// Search fields
router.post("/search", enforceAcl(bEnt, "search"), bEnt.get);
// Get version history of a specific row
router.get("/:id/history", enforceAcl(bEnt, "existing"), bEnt.getHistory);
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
// Upload the logo image (multipart, single `logo` file)
router.put(
  "/:id/logo",
  requireConsumer,
  enforceAcl(bEnt, "existing"),
  assertLogoFieldAllowed,
  parseLogoUpload,
  validateLogoFile,
  saveBrandingLogo,
  invalidateBrandingCache,
);
// Remove the uploaded logo image
router.delete(
  "/:id/logo",
  requireConsumer,
  enforceAcl(bEnt, "existing"),
  assertLogoFieldAllowed,
  deleteBrandingLogo,
  invalidateBrandingCache,
);
// Get entity schema
router.get("/schema", enforceAcl(bEnt, "output"), schema.get(bEnt));

export default router;
