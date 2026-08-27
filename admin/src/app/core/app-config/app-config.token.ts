import { InjectionToken } from "@angular/core";
import { Environment } from "../../../environments/environment.model";
import { MenuItem } from "@openng/optimus-ui/api";

export interface AppConfig {
  title: string;
  appKey: string;
  storageKeys: { [key: string]: string };
  sidenavItems: MenuItem[];
  foxnoxApi: string;
  gatelinApi: string;
  apiUsers: string;
  /** Foxnox SSR workflows base (`/api/foxnox/web`). */
  webBase: string;
  env: Partial<Environment>;
}

const defaultValue: AppConfig = {
  title: "",
  appKey: "",
  storageKeys: {},
  sidenavItems: [],
  foxnoxApi: "/api/foxnox",
  gatelinApi: "/api/gatelin/",
  apiUsers: "/api/users/",
  webBase: "/api/foxnox/web",
  env: {},
};

export const APP_CONFIG = new InjectionToken<AppConfig>("APP_CONFIG", {
  providedIn: "root",
  factory: () => defaultValue,
});
