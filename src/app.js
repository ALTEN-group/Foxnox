// @ts-check
import express from "express";
import { endTimer, startTimer } from "@dwtechs/winstan-plugin-express-perf";
import { errorHandler } from "@dwtechs/errandler-express";
import healixRouter from "@dwtechs/healix-express";

const app = express();
app.disable("x-powered-by");

// middlewares
import { send } from "./middlewares/res/send.js";

// Routes
import login from "./routes/password.js";
import token from "./routes/token.js";
import pwdPolicy from "./routes/pwd-policy.js";
import trustedDevice from "./routes/user-trusted-device.js";

const s = "/pwd/";

app.use(express.json({ limit: "100kb" }));
app.use(`${s}health`, healixRouter);
// performance measurement starts for any call to the following routes
app.use(startTimer);

// Routes
app.use(`${s}`, login, send);
app.use(`${s}tokens`, token, send);
app.use(`${s}policies`, pwdPolicy, send);
app.use(`${s}trusted-devices`, trustedDevice, send);

// Performance measurement ends
app.use(endTimer);

// Error handling
errorHandler(app);

export default app;
