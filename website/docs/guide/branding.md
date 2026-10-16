# Branding

The account workflow pages are the only part of Foxnox your end users ever see, and they show up at sensitive moments — a password reset, a 2FA prompt. A page that looks nothing like the rest of your product reads as a phishing attempt.

Branding is configured entirely through `WEB_BRAND_*` environment variables, applied as CSS custom properties on every page. No template editing, no rebuild.

## Variables

| Variable | Default | Effect |
|---|---|---|
| `WEB_BRAND_NAME` | `Foxnox` | Product name in the page header and in email subjects. Truncated at 80 characters. |
| `WEB_BRAND_TAGLINE` | `Account security` | Short line under the name. Truncated at 160 characters. |
| `WEB_BRAND_MARK` | first letter of the name | Letter mark shown when no logo is set. Max 2 characters. |
| `WEB_BRAND_LOGO_URL` | — | Logo image URL. When set, replaces the letter mark. |
| `WEB_BRAND_LOGO_ALT` | the brand name | Logo alt text |
| `WEB_BRAND_PRIMARY_COLOR` | `#1f6feb` | `--brand-primary`: buttons, links, focus rings |
| `WEB_BRAND_PRIMARY_HOVER_COLOR` | `#1858c3` | `--brand-primary-hover`: button hover state |
| `WEB_BRAND_SECONDARY_COLOR` | `#5c6570` | `--brand-secondary`: muted and secondary text |
| `WEB_BRAND_BACKGROUND_COLOR` | `#f4f6f8` | `--brand-bg`: page background |
| `WEB_BRAND_NAME_COLOR` | `#1a1d21` | `--brand-name-color`: brand name in the page header |
| `WEB_BRAND_CARD_TITLE_COLOR` | `#1a1d21` | `--brand-card-title-color`: card titles |
| `WEB_BRAND_LABEL_COLOR` | `#1a1d21` | `--brand-label-color`: form field labels |
| `WEB_BRAND_BUTTON_TEXT_COLOR` | `#ffffff` | `--brand-button-text`: text inside primary buttons |
| `WEB_BRAND_FAVICON_URL` | packaged `favicon.svg` | Favicon URL |
| `WEB_BRAND_FOOTER_TEXT` | — | Footer copy. Omitted entirely when unset. |
| `WEB_BRAND_FOOTER_URL` | — | Makes the footer text a link |

## Example

```yaml
environment:
  WEB_BRAND_NAME: Acme Corp
  WEB_BRAND_TAGLINE: Account security
  WEB_BRAND_LOGO_URL: https://acme.example.com/logo.svg
  WEB_BRAND_LOGO_ALT: Acme Corp
  WEB_BRAND_PRIMARY_COLOR: "#e2231a"
  WEB_BRAND_PRIMARY_HOVER_COLOR: "#b81b14"
  WEB_BRAND_SECONDARY_COLOR: "#5c6570"
  WEB_BRAND_BACKGROUND_COLOR: "#faf9f7"
  WEB_BRAND_FOOTER_TEXT: © Acme Corp
  WEB_BRAND_FOOTER_URL: https://acme.example.com
```

Quote hex colours in YAML — an unquoted `#` starts a comment, so `WEB_BRAND_PRIMARY_COLOR: #e2231a` sets an empty value and silently falls back to the default.

## Values Are Sanitized

Because these variables are injected into HTML and CSS, every one is validated rather than trusted:

- **Colours** must match `#RGB` or `#RRGGBB`. Anything else is discarded and the default is used, so a malformed value cannot break out into arbitrary CSS.
- **URLs** must be `http:`, `https:`, or root-relative. Protocol-relative `//host` and everything else are rejected, which rules out `javascript:` in the footer link.
- **Text** is trimmed and length-capped per field.

The practical consequence is that a wrong value fails quietly rather than loudly: if your colour does not appear, check the format before suspecting the deployment.

## Logo or Letter Mark

With no `WEB_BRAND_LOGO_URL`, pages render a letter mark — `WEB_BRAND_MARK` if set, otherwise the first letter of the brand name. It is a reasonable default that needs no asset hosting.

Set a logo URL for anything user-facing. It must be reachable by the browser, not just from inside your network, and SVG is preferred since the mark is displayed small.

## Text Colours, Button Text and Favicon

These fields are set from the admin Branding page and stored in the `branding` table. A stored value wins over the matching `WEB_BRAND_*` variable above, which only applies when no branding row is active.

| Field | Default | Effect |
|---|---|---|
| Brand name color | `#1a1d21` | `--brand-name-color`: the name in the page header |
| Card title color | `#1a1d21` | `--brand-card-title-color`: the title of each card |
| Field label color | `#1a1d21` | `--brand-label-color`: form field labels |
| Button text color | `#ffffff` | `--brand-button-text`: text inside primary buttons |
| Favicon | packaged `favicon.svg` | A URL or an uploaded PNG, JPEG, WebP or script-free SVG image (max 10 MB) |

The favicon follows the same either/or rule as the logo: uploading an image clears the URL, and a URL typed afterwards wins over the stored file. The order is stored URL, stored file, `WEB_BRAND_FAVICON_URL`, then the packaged `web/public/assets/favicon.svg`.

The server logs a warning when the primary color has a contrast ratio below 3 against the button text color.

## Live Preview

Below the form, the admin Branding page shows a preview card. Pick a workflow page and it re-renders as you type, using the current, unsaved form values.

The page is rendered by Foxnox itself (`POST /foxnox/branding/preview`) from the real Handlebars templates with placeholder data, so it matches what end users see and needs no token. Only an authenticated admin with access to the branding resource can call it, and nothing is stored. The result is shown in a script-less, non-interactive iframe.

A pending logo or favicon upload is not previewed: only the image already stored appears until you save.

## One Brand Per Deployment

Branding is read from the environment, so a Foxnox instance carries exactly one brand. Serving several tenants with different looks currently means running an instance per tenant.

## Emails Too

`WEB_BRAND_NAME` flows into the email templates, appearing in subjects like `Reset your password — Acme Corp`. The message body layout is a Handlebars template under `web/emails/`, so deeper email restyling means editing templates rather than setting variables.

## Localization

Branding and language are independent. Page copy comes from `web/locales/en.json` and `fr.json` and is picked per request from the `lang` parameter or the `Accept-Language` header; the brand name, colours, and logo are the same in every language. See [How Workflows Work](./workflows#localization).
