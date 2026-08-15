export interface Environment {
  production: boolean;
  /** Traefik `/api` prefix — Foxnox CRUD is `/api/pwd/…`, not under `/gateway`. */
  apiRoot: string;
  /** Gatelin auth / preferences base (`/api/gateway/`). */
  apiGateway: string;
  apiUsers: string;
  assets: string;
  msNotifEnabled: boolean;
}
