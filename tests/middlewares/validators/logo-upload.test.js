/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

const { assertLogoFieldAllowed, validateLogoFile } = await import(
  "../../../src/middlewares/validators/logo-upload.js"
);

const PNG = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  Buffer.alloc(16),
]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBPVP8 "),
]);
const svg = (body = "") =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

const run = (buffer) => {
  const next = jest.fn();
  const res = { locals: /** @type {Record<string, any>} */ ({}) };
  validateLogoFile(
    /** @type {any} */ ({ file: { buffer } }),
    /** @type {any} */ (res),
    next,
  );
  return { next, res };
};

describe("validateLogoFile", () => {
  it.each([
    ["png", PNG],
    ["jpg", JPEG],
    ["webp", WEBP],
    ["svg", svg("<circle r='4'/>")],
  ])("should accept %s content and expose its extension", (ext, buffer) => {
    const { next, res } = run(buffer);
    expect(next).toHaveBeenCalledWith();
    expect(res.locals.logo).toEqual({ buffer, ext });
  });

  it("should accept an svg preceded by an xml declaration and a comment", () => {
    const buffer = Buffer.from(
      `\uFEFF<?xml version="1.0"?>\n<!-- logo -->\n<svg xmlns="http://www.w3.org/2000/svg"/>`,
    );
    expect(run(buffer).res.locals.logo.ext).toBe("svg");
  });

  it.each([
    ["a script element", svg("<script>alert(1)</script>")],
    ["an inline event handler", svg('<rect onload="x()"/>')],
    ["a javascript: URL", svg('<a href="javascript:x()"/>')],
    ["a foreignObject", svg("<foreignObject/>")],
    ["an entity declaration", svg("<!ENTITY x 'y'>")],
  ])("should reject an svg with %s", (_label, buffer) => {
    const { next, res } = run(buffer);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.locals.logo).toBeUndefined();
  });

  it.each([
    ["a gif", Buffer.from("GIF89a....")],
    ["html", Buffer.from("<html><svg></svg></html>")],
    [
      "an svg-looking file with a payload before the root",
      Buffer.from("x<svg>"),
    ],
  ])("should reject %s", (_label, buffer) => {
    expect(run(buffer).next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("should reject a missing or empty file", () => {
    expect(run(undefined).next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(run(Buffer.alloc(0)).next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

describe("assertLogoFieldAllowed", () => {
  const run = (fields) => {
    const next = jest.fn();
    assertLogoFieldAllowed(
      /** @type {any} */ ({}),
      /** @type {any} */ ({ locals: { acl: { fields } } }),
      next,
    );
    return next;
  };

  it("should allow when there is no field allow-list", () => {
    expect(run(null)).toHaveBeenCalledWith();
  });

  it("should allow when logoFile is in the allow-list", () => {
    expect(run(new Set(["logoFile"]))).toHaveBeenCalledWith();
  });

  it("should refuse with 403 when logoFile is not in the allow-list", () => {
    expect(run(new Set(["name"]))).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
