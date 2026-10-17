// @ts-check
/**
 * PUT /foxnox/branding/:id/logo — multipart upload wiring. The entity, the
 * storage service and the branding cache are stubbed; everything between the
 * HTTP request and the service (ACL, parsing, content validation) is real.
 */
import { jest } from "@jest/globals";
import request from "supertest";

const CONSUMER = { "x-consumer-user-id": "1", "x-consumer-name": "tester" };
const PNG = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  Buffer.alloc(16),
]);

const saveLogo = jest.fn();
const deleteLogo = jest.fn();
const saveFavicon = jest.fn();
const deleteFavicon = jest.fn();
const loadBrandingFromDb = jest.fn();
const noop = jest.fn((_req, _res, next) => next());

jest.unstable_mockModule("../../src/entities/branding.js", () => ({
  default: {
    get: noop,
    getHistory: noop,
    addArraySubstack: noop,
    updateArraySubstack: noop,
    archive: noop,
    privateProps: [],
    properties: [{ key: "logoFile", isFilterable: false }],
  },
}));
jest.unstable_mockModule("../../src/services/branding-logo.js", () => ({
  saveLogo,
  deleteLogo,
  saveFavicon,
  deleteFavicon,
  LOGO_FILE_RE: /^logo-.+$/,
  FAVICON_FILE_RE: /^favicon-.+$/,
}));
jest.unstable_mockModule("../../src/web/branding.js", () => ({
  loadBrandingFromDb,
}));
jest.unstable_mockModule("../../src/web/preview.js", () => ({
  previewBranding: noop,
}));

const express = (await import("express")).default;
const { errorHandler } = await import("@dwtechs/errandler-express");
const { send } = await import("../../src/middlewares/res/send.js");
const branding = (await import("../../src/routes/branding.js")).default;
const bEnt = (await import("../../src/entities/branding.js")).default;

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use("/foxnox/branding", branding, send(bEnt));
errorHandler(app);

const put = (id = 1) =>
  request(app).put(`/foxnox/branding/${id}/logo`).set(CONSUMER);

describe("PUT /foxnox/branding/:id/logo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveLogo.mockResolvedValue({ id: 1, logoFile: "logo-x.png" });
  });

  it("should store a valid image and return the updated row", async () => {
    const res = await put().attach("logo", PNG, "any-name.txt");

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([{ id: 1, logoFile: "logo-x.png" }]);
    expect(saveLogo).toHaveBeenCalledWith(
      1,
      { userId: 1, nickname: "tester" },
      { buffer: PNG, ext: "png" },
    );
    expect(loadBrandingFromDb).toHaveBeenCalledTimes(1);
  });

  it("should reject a write with no consumer headers", async () => {
    const res = await request(app)
      .put("/foxnox/branding/1/logo")
      .attach("logo", PNG, "logo.png");

    expect(res.status).toBe(401);
    expect(saveLogo).not.toHaveBeenCalled();
  });

  it("should reject content that is not a supported image", async () => {
    const res = await put().attach("logo", Buffer.from("GIF89a...."), "a.png");

    expect(res.status).toBe(400);
    expect(saveLogo).not.toHaveBeenCalled();
  });

  it("should reject a request without a logo file", async () => {
    const res = await put().field("other", "value");

    expect(res.status).toBe(400);
    expect(saveLogo).not.toHaveBeenCalled();
  });

  it("should reject a file over 10 MB with 413", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]);
    const res = await put().attach("logo", big, "big.png");

    expect(res.status).toBe(413);
    expect(saveLogo).not.toHaveBeenCalled();
  });

  it("should answer 404 when the branding row does not exist", async () => {
    saveLogo.mockResolvedValue(null);
    const res = await put(9).attach("logo", PNG, "logo.png");

    expect(res.status).toBe(404);
    expect(loadBrandingFromDb).not.toHaveBeenCalled();
  });

  it("should answer 403 when the ACL field allow-list excludes logoFile", async () => {
    const res = await put()
      .set("x-acl-fields", "name,tagline")
      .attach("logo", PNG, "logo.png");

    expect(res.status).toBe(403);
    expect(saveLogo).not.toHaveBeenCalled();
  });
});

describe("DELETE /foxnox/branding/:id/logo", () => {
  const del = (id = 1) =>
    request(app).delete(`/foxnox/branding/${id}/logo`).set(CONSUMER);

  beforeEach(() => {
    jest.clearAllMocks();
    deleteLogo.mockResolvedValue({ id: 1, logoFile: "" });
  });

  it("should clear the logo and return the updated row", async () => {
    const res = await del();

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([{ id: 1, logoFile: "" }]);
    expect(deleteLogo).toHaveBeenCalledWith(1, {
      userId: 1,
      nickname: "tester",
    });
    expect(loadBrandingFromDb).toHaveBeenCalledTimes(1);
  });

  it("should reject a write with no consumer headers", async () => {
    const res = await request(app).delete("/foxnox/branding/1/logo");

    expect(res.status).toBe(401);
    expect(deleteLogo).not.toHaveBeenCalled();
  });

  it("should answer 404 when the branding row does not exist", async () => {
    deleteLogo.mockResolvedValue(null);
    const res = await del(9);

    expect(res.status).toBe(404);
    expect(loadBrandingFromDb).not.toHaveBeenCalled();
  });

  it("should answer 403 when the ACL field allow-list excludes logoFile", async () => {
    const res = await del().set("x-acl-fields", "name,tagline");

    expect(res.status).toBe(403);
    expect(deleteLogo).not.toHaveBeenCalled();
  });
});

describe("PUT /foxnox/branding/:id/favicon", () => {
  const putFavicon = (id = 1) =>
    request(app).put(`/foxnox/branding/${id}/favicon`).set(CONSUMER);

  beforeEach(() => {
    jest.clearAllMocks();
    saveFavicon.mockResolvedValue({ id: 1, faviconFile: "favicon-x.png" });
  });

  it("should store the favicon and return the updated row", async () => {
    const res = await putFavicon().attach("favicon", PNG, "any-name.txt");

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([{ id: 1, faviconFile: "favicon-x.png" }]);
    expect(saveFavicon).toHaveBeenCalledWith(
      1,
      { userId: 1, nickname: "tester" },
      { buffer: expect.any(Buffer), ext: "png" },
    );
    expect(saveLogo).not.toHaveBeenCalled();
    expect(loadBrandingFromDb).toHaveBeenCalledTimes(1);
  });

  it("should reject a file sent under the logo field name", async () => {
    const res = await putFavicon().attach("logo", PNG, "logo.png");

    expect(res.status).toBe(400);
    expect(saveFavicon).not.toHaveBeenCalled();
  });

  it("should reject content that is not an image", async () => {
    const res = await putFavicon().attach(
      "favicon",
      Buffer.from("GIF89a...."),
      "a.png",
    );

    expect(res.status).toBe(400);
    expect(saveFavicon).not.toHaveBeenCalled();
  });

  it("should answer 404 when the branding row does not exist", async () => {
    saveFavicon.mockResolvedValue(null);
    const res = await putFavicon(9).attach("favicon", PNG, "favicon.png");

    expect(res.status).toBe(404);
    expect(loadBrandingFromDb).not.toHaveBeenCalled();
  });

  it("should answer 403 when the ACL field allow-list excludes faviconFile", async () => {
    const res = await putFavicon()
      .set("x-acl-fields", "name,logoFile")
      .attach("favicon", PNG, "favicon.png");

    expect(res.status).toBe(403);
    expect(saveFavicon).not.toHaveBeenCalled();
  });
});

describe("DELETE /foxnox/branding/:id/favicon", () => {
  const delFavicon = (id = 1) =>
    request(app).delete(`/foxnox/branding/${id}/favicon`).set(CONSUMER);

  beforeEach(() => {
    jest.clearAllMocks();
    deleteFavicon.mockResolvedValue({ id: 1, faviconFile: "" });
  });

  it("should clear the favicon and return the updated row", async () => {
    const res = await delFavicon();

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([{ id: 1, faviconFile: "" }]);
    expect(deleteFavicon).toHaveBeenCalledWith(1, {
      userId: 1,
      nickname: "tester",
    });
    expect(deleteLogo).not.toHaveBeenCalled();
    expect(loadBrandingFromDb).toHaveBeenCalledTimes(1);
  });

  it("should answer 404 when the branding row does not exist", async () => {
    deleteFavicon.mockResolvedValue(null);
    const res = await delFavicon(9);

    expect(res.status).toBe(404);
    expect(loadBrandingFromDb).not.toHaveBeenCalled();
  });

  it("should answer 403 when the ACL field allow-list excludes faviconFile", async () => {
    const res = await delFavicon().set("x-acl-fields", "name,logoFile");

    expect(res.status).toBe(403);
    expect(deleteFavicon).not.toHaveBeenCalled();
  });
});
