/** @jest-environment node */
// @ts-check
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
    const { res, next } = run({ page: "recover", branding: {} });

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
      page: "unlock",
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
    const { res } = run({ page: "expired" });

    expect(res.render.mock.calls[0][1].policy).toEqual({
      minLength: 12,
      maxLength: 64,
    });
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
        body: { page: "recover" },
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
