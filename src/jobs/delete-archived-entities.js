// @ts-check
import { log } from "@dwtechs/winstan";
import { execute } from "@dwtechs/antity-pgsql";
import { scheduleDailyAt } from "./scheduler.js";
import pEnt from "../entities/pwd.js";
import tEnt from "../entities/token.js";
import ppEnt from "../entities/pwd-policy.js";
import tdEnt from "../entities/user-trusted-device.js";

/**
 * Cron job to delete archived entities from the database.
 * All entities must be archived for at least 2 months before deletion.
 * Runs once daily at 2:00 AM.
 *
 * Deletes archived records from: pwds, tokens, password policies, and trusted devices.
 *
 * Cron schedule format: "second minute hour day month weekday"
 * Current schedule: "0 0 2 * * *" means every day at 2:00 AM
 *
 * @example
 * // Start the cron job
 * startDeleteArchivedEntitiesJob();
 */
function deleteArchived(entity, date) {
  const q = entity.query.deleteArchive();
  return execute(q, [date], null).then((r) => r.rowCount || 0);
}
export function startDeleteArchivedEntitiesJob() {
  scheduleDailyAt(2, async () => {
    try {
      // Calculate date for 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      log.info(
        "Starting scheduled deletion of archived entities (archived > 2 months)...",
      );

      // Define all entities to process
      const entities = [
        { name: "pwds", entity: pEnt },
        { name: "tokens", entity: tEnt },
        { name: "password policies", entity: ppEnt },
        { name: "trusted devices", entity: tdEnt },
      ];

      let totalDeleted = 0;

      // Process all entities concurrently
      const results = await Promise.allSettled(
        entities.map((entity) =>
          deleteArchived(entity.entity, twoMonthsAgo).then((count) => ({ entity, count }))
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { entity, count } = result.value;
          if (count > 0)
            log.info(`    ✓ Deleted ${count} archived ${entity.name}`);
          else log.info(`    • No archived ${entity.name} to delete`);
          totalDeleted += count;
        } else {
          log.error(`    ✗ Failed: ${result.reason?.message || result.reason?.msg}`);
        }
      }

      log.info(
        `Completed deletion of archived entities. Total deleted: ${totalDeleted}`,
      );
    } catch (err) {
      log.error(
        `Failed to complete archived entities deletion job: ${err.message || err.msg}`,
      );
    }
  });

  log.info("Delete archived entities job initialized (runs daily at 2:00 AM UTC, deletes entities archived > 2 months)");
}
