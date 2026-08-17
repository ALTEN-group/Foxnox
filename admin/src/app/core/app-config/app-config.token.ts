import { InjectionToken } from "@angular/core";
import { Environment } from "environments/environment.model";
import { MenuItem } from "primeng/api";

export interface AppConfig {
  title: string;
  appKey: string;
  storageKeys: { [key: string]: string };
  sidenavItems: MenuItem[];
  apiRoot: string;
  apiGateway: string;
  apiUsers: string;
  /** Foxnox SSR workflows base (`/api/pwd/web`). */
  webBase: string;
  env: Partial<Environment>;
}

const defaultValue: AppConfig = {
  title: "",
  appKey: "",
  storageKeys: {},
  sidenavItems: [],
  apiRoot: "/api/",
  apiGateway: "/api/gateway/",
  apiUsers: "/api/users/",
  webBase: "/api/pwd/web",
  env: {},
};

export const APP_CONFIG = new InjectionToken<AppConfig>("APP_CONFIG", {
  providedIn: "root",
  factory: () => defaultValue,
});
