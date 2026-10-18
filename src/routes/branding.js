// @ts-check
import express from "express";

const router = express.Router();

import bEnt from "../entities/branding.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import {
  deleteBrandingFavicon,
  deleteBrandingLogo,
  saveBrandingFavicon,
  saveBrandingLogo,
} from "../middlewares/mappers/save-logo.js";
import schema from "../middlewares/schema.js";
import {
  assertFaviconFieldAllowed,
  assertLogoFieldAllowed,
  faviconUploadRow,
  logoUploadRow,
  parseFaviconUpload,
  parseLogoUpload,
  validateFaviconFile,
  validateLogoFile,
} from "../middlewares/validators/logo-upload.js";
import { loadBrandingFromDb } from "../web/branding.js";
import { previewBranding } from "../web/preview.js";

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
// Render a workflow page with unsaved branding values (admin live preview)
router.post("/preview", requireConsumer, previewBranding);
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
  // express.json() cannot read multipart: decode the file into `req.file`
  parseLogoUpload,
  // The file is not in `req.body.rows` (base64 in JSON would exceed the 100 kb
  // limit): rebuild the `rows` shape that `enforceAcl` expects
  logoUploadRow,
  // Strip fields Gatelin does not allow and check the row against ACL conditions
  enforceAcl(bEnt, "existing"),
  // 403 if `logoFile` was stripped, 400 if the content is not a supported image
  validateLogoFile,
  // Write the image to disk and update the row
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
// Upload the favicon image (multipart, single `favicon` file)
router.put(
  "/:id/favicon",
  requireConsumer,
  // Decode the multipart file into `req.file`
  parseFaviconUpload,
  // Rebuild the `rows` shape that `enforceAcl` expects
  faviconUploadRow,
  // Strip fields Gatelin does not allow and check the row against ACL conditions
  enforceAcl(bEnt, "existing"),
  // 403 if `faviconFile` was stripped, 400 if the content is not a supported image
  validateFaviconFile,
  // Write the image to disk and update the row
  saveBrandingFavicon,
  invalidateBrandingCache,
);
// Remove the uploaded favicon image
router.delete(
  "/:id/favicon",
  requireConsumer,
  enforceAcl(bEnt, "existing"),
  assertFaviconFieldAllowed,
  deleteBrandingFavicon,
  invalidateBrandingCache,
);
// Get entity schema
router.get("/schema", enforceAcl(bEnt, "output"), schema.get(bEnt));

export default router;
