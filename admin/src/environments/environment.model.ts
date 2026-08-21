export interface Environment {
  production: boolean;
  /** Traefik `/api` prefix — Foxnox CRUD is `/api/pwd/…`, not under `/gatelin`. */
  apiRoot: string;
  /** Gatelin auth / preferences base (`/api/gatelin/`). */
  gatelinApi: string;
  apiUsers: string;
  /**
   * Foxnox Handlebars workflow pages (`…/pwd/web`).
   * Defaults to `${apiRoot}pwd/web` when omitted.
   */
  webBase?: string;
  assets: string;
  msNotifEnabled: boolean;
}
