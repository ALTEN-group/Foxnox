export interface Environment {
  production: boolean;
  /** Foxnox CRUD API base (`/api/foxnox`, without a trailing slash). */
  foxnoxApi: string;
  /** Gatelin auth / preferences base (`/api/gatelin/`). */
  gatelinApi: string;
  apiUsers: string;
  /**
   * Foxnox Handlebars workflow pages (`…/foxnox/web`).
   * Defaults to `${foxnoxApi}/web` when omitted.
   */
  webBase?: string;
  assets: string;
  msNotifEnabled: boolean;
}
