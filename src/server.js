// @ts-check
import { log } from "@dwtechs/winstan";
import { listen } from "@dwtechs/servpico-express";
import app from "./app.js";

// Cron jobs
import { startDeleteArchivedEntitiesJob } from "./jobs/delete-archived-entities.js";
import { startDeleteOldHistoryJob } from "./jobs/delete-old-history.js";

// Init cached reference data
Promise.all([
  // routeSvc.init(),
])
  .then(() => {
    // Start cron jobs
    startDeleteArchivedEntitiesJob();
    startDeleteOldHistoryJob();
    listen(app);
  })
  .catch((err) => log.error(`App cannot start: ${err.message || err.msg}`));
