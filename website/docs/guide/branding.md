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

## One Brand Per Deployment

Branding is read from the environment, so a Foxnox instance carries exactly one brand. Serving several tenants with different looks currently means running an instance per tenant.

## Emails Too

`WEB_BRAND_NAME` flows into the email templates, appearing in subjects like `Reset your password — Acme Corp`. The message body layout is a Handlebars template under `web/emails/`, so deeper email restyling means editing templates rather than setting variables.

## Localization

Branding and language are independent. Page copy comes from `web/locales/en.json` and `fr.json` and is picked per request from the `lang` parameter or the `Accept-Language` header; the brand name, colours, and logo are the same in every language. See [How Workflows Work](./workflows#localization).
