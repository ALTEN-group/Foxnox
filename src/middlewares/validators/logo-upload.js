// @ts-check
import { isSet } from "@dwtechs/checkard";
import multer from "multer";

export const MAX_LOGO_BYTES = 10 * 1024 * 1024;

// PNG magic number: 0x89, "PNG", CR LF, 0x1A, LF
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** @param {string} field multipart field name */
const uploader = (field) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 5 },
  }).single(field);

const uploadLogo = uploader("logo");
const uploadFavicon = uploader("favicon");

// Active content that could run when the file is opened directly.
const SVG_FORBIDDEN =
  /<script|<foreignObject|<iframe|<embed|<object|<!ENTITY|\son\w+\s*=|(java|vb)script:/i;

// Whole-prefix match: nothing is stripped, so no partial-sanitization pitfalls.
const SVG_PREFIX =
  /^\uFEFF?\s*(?:(?:<\?xml[^>]*\?>|<!--(?:[^-]|-(?!->))*-->)\s*)*$/;

/**
 * Only whitespace, an XML declaration and comments may precede `<svg`.
 * @param {string} text
 * @returns {boolean}
 */
function isSvg(text) {
  const head = text.slice(0, 4096);
  const at = head.search(/<svg[\s>]/i);
  if (at < 0) return false;
  return SVG_PREFIX.test(head.slice(0, at)) && !SVG_FORBIDDEN.test(text);
}

/**
 * @param {Buffer} b
 * @returns {string|null} file extension for the detected image type
 */
function detectImageExt(b) {
  if (b.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  // JPEG starts with the SOI marker (FF D8) followed by another marker (FF)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  // WebP is a RIFF container whose form type (bytes 8-11) is "WEBP"
  if (
    b.toString("latin1", 0, 4) === "RIFF" &&
    b.toString("latin1", 8, 12) === "WEBP"
  )
    return "webp";
  return isSvg(b.toString("utf8")) ? "svg" : null;
}

/**
 * 403 when Gatelin's field allow-list does not cover `column`. Runs before
 * parsing so nothing is buffered for a refused call.
 *
 * @param {string} column
 * @returns {import('express').RequestHandler}
 */
const fieldAllowed = (column) => (_req, res, next) => {
  const fields = res.locals.acl?.fields;
  if (isSet(fields) && !fields.has(column))
    return next({ statusCode: 403, message: `Field ${column} is not allowed` });
  next();
};

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
 * The type comes from the content: the client MIME type and filename are
 * ignored. Result in `res.locals[localsKey]`.
 *
 * @param {string} label
 * @param {string} localsKey
 * @returns {import('express').RequestHandler}
 */
const validateImage = (label, localsKey) => (req, res, next) => {
  const buffer = req.file?.buffer;
  if (!buffer?.length)
    return next({
      statusCode: 400,
      message: `Missing ${label.toLowerCase()} file`,
    });
  const ext = detectImageExt(buffer);
  if (!ext)
    return next({
      statusCode: 400,
      message: `${label} must be a PNG, JPEG, WebP or script-free SVG image`,
    });
  res.locals[localsKey] = { buffer, ext };
  next();
};

// PUT /branding/:id/logo
export const assertLogoFieldAllowed = fieldAllowed("logoFile");
export const parseLogoUpload = parseUpload(uploadLogo, "Logo");
export const validateLogoFile = validateImage("Logo", "logo");

// PUT /branding/:id/favicon
export const assertFaviconFieldAllowed = fieldAllowed("faviconFile");
export const parseFaviconUpload = parseUpload(uploadFavicon, "Favicon");
export const validateFaviconFile = validateImage("Favicon", "favicon");
