// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { errorHandler } from "@dwtechs/errandler-express";
import { healix } from "@dwtechs/healix-express";
import { startTimer } from "@dwtechs/winstan-plugin-express-perf";
import express from "express";

const app = express();
app.disable("x-powered-by");

// middlewares
import { send } from "./middlewares/res/send.js";
import { sendPwd } from "./middlewares/res/send-pwd.js";

// Routes
import login from "./routes/password.js";
import token from "./routes/token.js";
import pwdPolicy from "./routes/pwd-policy.js";
import trustedDevice from "./routes/user-trusted-device.js";

const s = "/pwd/";

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

// Routes — mount the more specific `/pwd/<resource>` routers BEFORE the
// catch-all `/pwd/` password router. Express runs `app.use` middleware in
// registration order; if `/pwd/` comes first, unmatched paths like
// `/pwd/policies/search` fall through its `sendPwd` terminal and crash
// (`deleteProps` on undefined rows) instead of reaching the real router.
app.use(`${s}tokens`, token, send);
app.use(`${s}policies`, pwdPolicy, send);
app.use(`${s}trusted-devices`, trustedDevice, send);
// `/pwd/` uses `sendPwd` because the pwd entity carries `isPrivate` fields
// (pwdHash, twoFactorSecret) that must be stripped before serialization.
app.use(`${s}`, login, sendPwd);

// Error handling
errorHandler(app);

export default app;
