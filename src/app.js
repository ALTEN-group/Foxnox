// @ts-check
import express from "express";
import { log } from "@dwtechs/winstan";
import { endTimer, startTimer } from "@dwtechs/winstan-plugin-express-perf";
import { listen } from "@dwtechs/servpico-express";
import { errorHandler } from "@dwtechs/errandler-express";
import healixRouter from "@dwtechs/healix-express";
import { security } from "./conf/sec.js";
import { corsMiddleware } from "./conf/cors.js";

const app = express();
app.use(security);
app.disable("x-powered-by");

// import consumerSvc from "./services/consumer.js";

// Cron jobs
import { startDeleteArchivedEntitiesJob } from "./jobs/delete-archived-entities.js";
import { startDeleteOldHistoryJob } from "./jobs/delete-old-history.js";

// middlewares
// import { send } from "./middlewares/res/send.js";
import checkRoute from "./middlewares/validators/check-route.js";

// Routes
// import session from "./routes/session.js";

const s = "/auth/";

// app.use(express.json({ limit: "100kb" }));
app.use(`${s}health`, healixRouter);
// performance measurement starts for any call to the following routes
app.use(startTimer);
// Validate route
app.use(checkRoute);
// Routes
// app.use(`${s}sessions`, sessionLimiter, session);


// Performance measurement ends
app.use(endTimer);

// Error handling
errorHandler(app);

// Init cached reference data
Promise.all([
  // routeSvc.init(),
])
  .then(() => {
    app.use(corsMiddleware);
    // Start cron jobs
    startDeleteArchivedEntitiesJob();
    startDeleteOldHistoryJob();
    listen(app);
  })
  .catch((err) => log.error(`App cannot start: ${err.message || err.msg}`));
