// @ts-check

// PNG magic number: 0x89, "PNG", CR LF, 0x1A, LF
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

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
 * Entity normalizer: the type comes from the content, never from the client.
 * @param {Buffer} buffer
 * @returns {{ buffer: Buffer, ext: string|null }}
 */
export const toImage = (buffer) => ({ buffer, ext: detectImageExt(buffer) });

/**
 * Entity validator for a value produced by `toImage`.
 * @param {{ ext: string|null }} image
 * @returns {boolean}
 */
export const isImage = (image) => image.ext !== null;
