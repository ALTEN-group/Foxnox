// @ts-check

import { failFast, listen } from "@dwtechs/servpico-express";
import { log } from "@dwtechs/winstan";
import { startAdminServer } from "./admin-server.js";
import app from "./app.js";
import { validateRuntimeEnv } from "./conf/runtime.js";

// Cron jobs
import { startDeleteArchivedEntitiesJob } from "./jobs/delete-archived-entities.js";
import { startDeleteOldHistoryJob } from "./jobs/delete-old-history.js";
import { initPwdGeneration } from "./services/pwd.js";

Promise.resolve()
  .then(validateRuntimeEnv)
  .then(() => Promise.all([initPwdGeneration()]))
  .then(() => {
    const adminServer = startAdminServer();
    if (adminServer) {
      for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
        process.once(signal, () =>
          adminServer.close(() => log.info("Admin UI server closed")),
        );
      }
    }
    // Start cron jobs only after all required listeners initialized.
    startDeleteArchivedEntitiesJob();
    startDeleteOldHistoryJob();
    listen(app);
  })
  .catch(failFast);
