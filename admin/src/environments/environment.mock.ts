import { Environment } from "../environments/environment.model";

export const environment: Environment = {
  production: false,
  foxnoxApi: "http://localhost:8200/api/foxnox/",
  gatelinApi: "http://localhost:8200/api/gatelin/",
  apiUsers: "http://localhost:8200/api/users/",
  assets: "assets",
  msNotifEnabled: false,
};
