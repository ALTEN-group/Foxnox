// @ts-check
import fs from "node:fs";
import path from "node:path";
import { log } from "@dwtechs/winstan";
import Handlebars from "handlebars";
import nodemailer from "nodemailer";
import { getBranding } from "../web/branding.js";
import { LOCALES_ROOT, WEB_ROOT } from "../web/engine.js";

const EMAILS_ROOT = path.join(WEB_ROOT, "emails");

/**
 * Outbound notification port: render Handlebars email templates and send via SMTP.
 * Point SMTP_* at Mailpit in local Docker, or a real provider in production.
 *
 * @typedef {{
 *   template: string,
 *   to: string,
 *   lang?: string,
 *   vars: Record<string, unknown>,
 * }} NotifyPayload
 */

/** @type {Map<string, object>} */
const localeCache = new Map();

/** @type {Map<string, Handlebars.TemplateDelegate>} */
const templateCache = new Map();

/** @type {import('nodemailer').Transporter | null} */
let transporter = null;

/**
 * @param {string} lang
 * @returns {"en"|"fr"}
 */
function normalizeLang(lang) {
  return String(lang || "en")
    .toLowerCase()
    .startsWith("fr")
    ? "fr"
    : "en";
}

/**
 * @param {string} lang
 * @returns {object}
 */
function loadLocale(lang) {
  const key = normalizeLang(lang);
  const cached = localeCache.get(key);
  if (cached) return cached;
  const locale = JSON.parse(
    fs.readFileSync(path.join(LOCALES_ROOT, `${key}.json`), "utf8"),
  );
  localeCache.set(key, locale);
  return locale;
}

/**
 * @param {string} name file basename without extension (e.g. layout, pwd-reset)
 * @returns {Handlebars.TemplateDelegate}
 */
function compileTemplate(name) {
  const cached = templateCache.get(name);
  if (cached) return cached;
  const filePath = path.join(EMAILS_ROOT, `${name}.hbs`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Unknown email template: ${name}`);
  }
  const compiled = Handlebars.compile(fs.readFileSync(filePath, "utf8"), {
    strict: true,
  });
  templateCache.set(name, compiled);
  return compiled;
}

/**
 * @returns {import('nodemailer').Transporter | null}
 */
function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT) || 1025;
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user ? { auth: { user, pass } } : {}),
  });
  return transporter;
}

/**
 * @returns {string}
 */
function mailFrom() {
  return (
    process.env.SMTP_FROM?.trim() || `${getBranding().name} <noreply@localhost>`
  );
}

/**
 * Render subject + HTML + plaintext for a workflow email.
 * Exported for unit tests.
 *
 * @param {{
 *   template: string,
 *   lang?: string,
 *   vars: Record<string, unknown>,
 * }} params
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderEmail({ template, lang = "en", vars }) {
  const locale = loadLocale(lang);
  const copy = locale.emails?.[template];
  if (!copy) {
    throw new Error(
      `Missing locale emails.${template} for lang=${locale.lang}`,
    );
  }

  const brand = getBranding();
  const greeting = vars.nickname
    ? String(copy.greetingNamed).replaceAll(
        "{{nickname}}",
        String(vars.nickname),
      )
    : String(copy.greeting);
  const subject = String(copy.subject).replaceAll("{{brand}}", brand.name);
  const ctx = {
    ...vars,
    greeting,
    email: { ...copy, subject },
    brand,
    lang: locale.lang,
  };
  const body = compileTemplate(template)(ctx);
  const html = compileTemplate("layout")({ ...ctx, body });

  const text = [
    greeting,
    "",
    copy.intro,
    "",
    String(vars.url ?? ""),
    "",
    copy.expiry,
    "",
    copy.ignore,
    brand.footerText ? `\n${brand.footerText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

/**
 * @param {NotifyPayload} payload
 * @returns {Promise<void>}
 */
export async function notifyUser(payload) {
  const { template, to, lang, vars } = payload;
  const rendered = renderEmail({ template, lang, vars });
  const transport = getTransporter();

  if (!transport) {
    // Never log template variables: workflow URLs contain bearer tokens.
    log.info(
      `notifyUser [log-notifier] template=${template} to=${to} lang=${lang ?? "en"} subject=${rendered.subject}`,
    );
    return;
  }

  await transport.sendMail({
    from: mailFrom(),
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  log.info(
    `notifyUser sent template=${template} to=${to} lang=${lang ?? "en"}`,
  );
}

/** Test helper: drop cached transporter / templates. */
export function _resetNotifyCachesForTests() {
  transporter = null;
  templateCache.clear();
  localeCache.clear();
}
