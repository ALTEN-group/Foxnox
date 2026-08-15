import { Environment } from "environments/environment.model";

export const environment: Environment = {
  production: false,
  apiRoot: "http://localhost:8100/api/",
  apiGateway: "http://localhost:8100/api/gateway/",
  apiUsers: "http://localhost:8100/api/users/",
  assets: "assets",
  msNotifEnabled: false,
};
