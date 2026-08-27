// @ts-check
import path from "node:path";
import { execute } from "@dwtechs/antity-pgsql";
import { errorHandler } from "@dwtechs/errandler-express";
import { healix } from "@dwtechs/healix-express";
import { startTimer } from "@dwtechs/winstan-plugin-express-perf";
import express from "express";
import { configureWebEngine, PUBLIC_ROOT, WEB_MOUNT } from "./web/engine.js";
import webRoutes from "./web/routes.js";

const app = express();
app.disable("x-powered-by");

import ppEnt from "./entities/pwd-policy.js";
import tEnt from "./entities/token.js";
import tdEnt from "./entities/user-device.js";
// middlewares
import { send } from "./middlewares/res/send.js";
import { sendPwd } from "./middlewares/res/send-pwd.js";
import challenge from "./routes/challenge.js";
import loginTicket from "./routes/login-ticket.js";
// Routes
import login from "./routes/password.js";
import pwdPolicy from "./routes/pwd-policy.js";
import token from "./routes/token.js";
import trustedDeviceVerify from "./routes/device-verify.js";
import trustedDevice from "./routes/user-device.js";

const s = "/foxnox/";

configureWebEngine(app);

app.use(express.json({ limit: "100kb" }));
app.use(
  `${s}health`,
  healix({
    // Liveness stays dependency-free; readiness proves the service can still
    // reach Postgres, so an instance that lost the database leaves rotation.
    checks: { db: () => execute("SELECT 1", [], null) },
  }),
);
// performance measurement starts for any call to the following routes
app.use(startTimer);

// Account workflow pages (Handlebars SSR) — before JSON CRUD routers.
app.use(
  `${WEB_MOUNT}/assets`,
  express.static(path.join(PUBLIC_ROOT, "assets")),
);
app.use(WEB_MOUNT, webRoutes);

// Routes — mount the more specific `/foxnox/<resource>` routers BEFORE the
// catch-all `/foxnox/` password router. Express runs `app.use` middleware in
// registration order; if `/foxnox/` comes first, unmatched paths like
// `/foxnox/policies/search` fall through its `sendPwd` terminal and crash
// (`deleteProps` on undefined rows) instead of reaching the real router.
app.use(`${s}tokens`, token, send(tEnt));
app.use(`${s}policies`, pwdPolicy, send(ppEnt));
// `devices` rather than `trusted-devices`: Gatelin's `resource.name` is
// varchar(20) and doubles as the literal URL segment, so `foxnox/trusted-devices`
// (22) cannot be registered there.
app.use(`${s}devices/verify`, trustedDeviceVerify);
app.use(`${s}devices`, trustedDevice, send(tdEnt));
app.use(`${s}challenges`, challenge);
app.use(`${s}login-tickets`, loginTicket);
// `/foxnox/` uses `sendPwd` because the pwd entity carries `isPrivate` fields
// (pwdHash, twoFactorSecret) that must be stripped before serialization.
app.use(`${s}`, login, sendPwd);

// Error handling
errorHandler(app);

export default app;
