/** @jest-environment node */
// @ts-check
import fs from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";

process.env.WEB_PUBLIC_ORIGIN = "https://auth.example.test";
process.env.WEB_PUBLIC_BASE = "/api/foxnox/web";

jest.unstable_mockModule("../../src/entities/branding.js", () => ({
  default: { getCache: jest.fn().mockResolvedValue([]) },
}));

const { previewBranding } = await import("../../src/web/preview.js");

const run = (body) => {
  const next = jest.fn();
  const res = {
    render: jest.fn((_view, _ctx, cb) => cb(null, "<html>ok</html>")),
    json: jest.fn(),
  };
  previewBranding(
    /** @type {any} */ ({ body, headers: {}, query: {} }),
    /** @type {any} */ (res),
    next,
  );
  return { next, res };
};

describe("previewBranding", () => {
  it("should render the chosen template and answer with its html", () => {
    const { res, next } = run({ page: "recover/request", branding: {} });

    expect(next).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      "recover/request",
      expect.any(Object),
      expect.any(Function),
    );
    expect(res.json).toHaveBeenCalledWith({ html: "<html>ok</html>" });
  });

  it("should render with the unsaved branding and carry its css vars inline", () => {
    const { res } = run({
      page: "unlock/request",
      branding: {
        name: "Draft Co",
        primaryColor: "#123456",
        labelColor: "#654321",
      },
    });

    const ctx = res.render.mock.calls[0][1];
    expect(ctx.brand.name).toBe("Draft Co");
    expect(ctx.site.name).toBe("Draft Co");
    expect(ctx.previewCss).toMatch(/^:root\{.*--brand-primary:#123456/);
    expect(ctx.previewCss).toContain("--brand-label-color:#654321");
  });

  it("should give the expired-password page a policy so its inputs render", () => {
    const { res } = run({ page: "password/expired" });

    expect(res.render.mock.calls[0][1].policy).toEqual({
      minLength: 12,
      maxLength: 64,
      lowerCase: true,
      upperCase: true,
      number: true,
      symbol: true,
    });
  });

  it("should render the page in the requested language", () => {
    const { res } = run({ page: "recover/request", lang: "fr" });

    expect(res.render.mock.calls[0][1].lang).toBe("fr");
  });

  it("should preview every workflow page template", () => {
    const root = path.resolve("web/views/pages");
    const views = fs
      .readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".hbs"))
      .map((f) => f.slice(0, -4));

    expect(views.length).toBeGreaterThan(0);
    for (const view of views) {
      const { res, next } = run({ page: view });
      expect(next).not.toHaveBeenCalled();
      expect(res.render.mock.calls[0][0]).toBe(view);
    }
  });

  it.each([
    undefined,
    "",
    "nope",
    "__proto__",
    "constructor",
    7,
  ])("should answer 400 for the page %p", (page) => {
    const { next, res } = run({ page });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
    expect(res.render).not.toHaveBeenCalled();
  });

  it("should forward a render failure", () => {
    const next = jest.fn();
    const err = new Error("boom");
    const res = { render: jest.fn((_v, _c, cb) => cb(err)), json: jest.fn() };

    previewBranding(
      /** @type {any} */ ({
        body: { page: "recover/request" },
        headers: {},
        query: {},
      }),
      /** @type {any} */ (res),
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});
