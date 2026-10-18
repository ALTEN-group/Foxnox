// @ts-check
import multer from "multer";
import bEnt from "../../entities/branding.js";

export const MAX_LOGO_BYTES = 10 * 1024 * 1024;

/** @param {string} field multipart field name */
const uploader = (field) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 5 },
  }).single(field);

const uploadLogo = uploader("logo");
const uploadFavicon = uploader("favicon");

/**
 * Parses the multipart body (single file, in memory).
 *
 * @param {import('express').RequestHandler} upload
 * @param {string} label
 * @returns {import('express').RequestHandler}
 */
const parseUpload = (upload, label) => (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE")
      return next({
        statusCode: 413,
        message: `${label} exceeds ${MAX_LOGO_BYTES / 1024 / 1024} MB`,
      });
    if (err.name === "MulterError")
      return next({ statusCode: 400, message: "Invalid upload" });
    next(err);
  });
};

/**
 * Reshapes the upload like a bulk update (`{ rows: [{ id, <column> }] }`, the
 * body the client sends on DELETE) so `enforceAcl` strips fields Gatelin does
 * not allow, exactly as for `PUT /`.
 *
 * @param {string} column entity property carrying the image
 * @returns {import('express').RequestHandler}
 */
const toRow = (column) => (req, _res, next) => {
  req.body = { rows: [{ id: req.params.id, [column]: req.file?.buffer }] };
  next();
};

/**
 * 400 without a row, 403 when the ACL stripped `column` from it.
 *
 * @param {string} column
 * @returns {import('express').RequestHandler}
 */
const assertAllowed = (column) => (req, _res, next) => {
  const row = req.body?.rows?.[0];
  if (!row) return next({ statusCode: 400, message: "Missing row" });
  if (!(column in row))
    return next({ statusCode: 403, message: `Field ${column} is not allowed` });
  next();
};

/**
 * Applies the entity property's normalizer and validator to the uploaded file.
 * Result in `res.locals[localsKey]`.
 *
 * @param {string} column
 * @param {string} label
 * @param {string} localsKey
 * @returns {import('express').RequestHandler}
 */
const validateImage = (column, label, localsKey) => (req, res, next) => {
  assertAllowed(column)(req, res, (err) => {
    if (err) return next(err);
    const buffer = req.body.rows[0][column];
    if (!buffer?.length)
      return next({
        statusCode: 400,
        message: `Missing ${label.toLowerCase()} file`,
      });
    const prop = bEnt.getProp(column);
    const image = prop?.normalizer?.(buffer);
    if (!prop?.validator?.(image))
      return next({
        statusCode: 400,
        message: `${label} must be a PNG, JPEG, WebP or script-free SVG image`,
      });
    res.locals[localsKey] = image;
    next();
  });
};

// PUT /branding/:id/logo
export const parseLogoUpload = parseUpload(uploadLogo, "Logo");
export const logoUploadRow = toRow("logoFile");
export const validateLogoFile = validateImage("logoFile", "Logo", "logo");
// DELETE /branding/:id/logo
export const assertLogoFieldAllowed = assertAllowed("logoFile");

// PUT /branding/:id/favicon
export const parseFaviconUpload = parseUpload(uploadFavicon, "Favicon");
export const faviconUploadRow = toRow("faviconFile");
export const validateFaviconFile = validateImage(
  "faviconFile",
  "Favicon",
  "favicon",
);
// DELETE /branding/:id/favicon
export const assertFaviconFieldAllowed = assertAllowed("faviconFile");
