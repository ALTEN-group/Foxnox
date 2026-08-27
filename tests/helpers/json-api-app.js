// @ts-check
/**
 * Minimal Express app that mirrors the JSON `/foxnox/*` mounts in `src/app.js`
 * (without Handlebars workflows or perf timers). Keep mount order in sync
 * with app.js — specific routers before the catch-all `/foxnox/` password router.
 *
 * Call only after Jest has registered entity / history / passken mocks.
 *
 * @returns {Promise<import("express").Express>}
 */
export async function createJsonApiApp() {
  const express = (await import("express")).default;
  const { errorHandler } = await import("@dwtechs/errandler-express");
  const { send } = await import("../../src/middlewares/res/send.js");
  const { sendPwd } = await import("../../src/middlewares/res/send-pwd.js");

  const login = (await import("../../src/routes/password.js")).default;
  const token = (await import("../../src/routes/token.js")).default;
  const pwdPolicy = (await import("../../src/routes/pwd-policy.js")).default;
  const trustedDevice = (await import("../../src/routes/user-device.js"))
    .default;
  const trustedDeviceVerify = (
    await import("../../src/routes/device-verify.js")
  ).default;
  const challenge = (await import("../../src/routes/challenge.js")).default;
  const loginTicket = (await import("../../src/routes/login-ticket.js"))
    .default;

  const ppEnt = (await import("../../src/entities/pwd-policy.js")).default;
  const tEnt = (await import("../../src/entities/token.js")).default;
  const tdEnt = (await import("../../src/entities/user-device.js"))
    .default;

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  const s = "/foxnox/";
  app.use(`${s}tokens`, token, send(tEnt));
  app.use(`${s}policies`, pwdPolicy, send(ppEnt));
  app.use(`${s}devices/verify`, trustedDeviceVerify);
  app.use(`${s}devices`, trustedDevice, send(tdEnt));
  app.use(`${s}challenges`, challenge);
  app.use(`${s}login-tickets`, loginTicket);
  app.use(`${s}`, login, sendPwd);

  errorHandler(app);
  return app;
}
