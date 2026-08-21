import { Environment } from "environments/environment.model";

export const environment: Environment = {
  production: true,
  apiRoot: "https://ookonva.com/api/",
  // gatelinApi: "http://vps-36553f06.vps.ovh.net:80/api/",
  gatelinApi: "https://ookonva.com/api/gatelin/",
  apiUsers: "https://ookonva.com/api/users/",
  assets: "assets",
  msNotifEnabled: false,
};
