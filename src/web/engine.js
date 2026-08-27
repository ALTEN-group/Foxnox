// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { engine } from "express-handlebars";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = path.resolve(__dirname, "../../web");
export const VIEWS_ROOT = path.join(WEB_ROOT, "views");
export const PUBLIC_ROOT = path.join(WEB_ROOT, "public");
export const LOCALES_ROOT = path.join(WEB_ROOT, "locales");

/**
 * Public browser prefix (Traefik keeps `/api`, Foxnox serves `/foxnox/web`).
 * Override with WEB_PUBLIC_BASE when Gatelin path changes.
 */
export const WEB_PUBLIC_BASE =
  process.env.WEB_PUBLIC_BASE?.replace(/\/$/, "") || "/api/foxnox/web";

/** Internal Express mount path (what Foxnox itself listens on). */
export const WEB_MOUNT = "/foxnox/web";

/**
 * Configure Handlebars for Foxnox workflow pages.
 * Layout/partial conventions mirror the ALTEN `website/` project.
 *
 * @param {import('express').Express} app
 */
export function configureWebEngine(app) {
  app.engine(
    "hbs",
    engine({
      extname: ".hbs",
      defaultLayout: "main",
      layoutsDir: path.join(VIEWS_ROOT, "layouts"),
      partialsDir: path.join(VIEWS_ROOT, "partials"),
    }),
  );
  app.set("view engine", "hbs");
  app.set("views", path.join(VIEWS_ROOT, "pages"));
}
