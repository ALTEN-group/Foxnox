import { Environment } from "../environments/environment.model";

export const environment: Environment = {
  production: false,
  foxnoxApi: "http://localhost:8100/api/foxnox",
  gatelinApi: "http://localhost:8100/api/gatelin/",
  apiUsers: "http://localhost:8100/api/users/",
  assets: "assets",
  msNotifEnabled: false,
};
