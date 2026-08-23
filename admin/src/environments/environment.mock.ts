import { Environment } from "../environments/environment.model";

export const environment: Environment = {
  production: false,
  apiRoot: "http://localhost:8100/api/",
  gatelinApi: "http://localhost:8100/api/gatelin/",
  apiUsers: "http://localhost:8100/api/users/",
  assets: "assets",
  msNotifEnabled: false,
};
