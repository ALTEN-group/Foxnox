// @ts-check

import { log } from "@dwtechs/winstan";
import { makeDeleteArchived } from "../utils/delete-archived.js";
import { scheduleDailyAt } from "./scheduler.js";

const ARCHIVE_RETENTION_MONTHS = 2;

/**
 * Cron job to delete archived entities from the database.
 * All entities must be archived for at least ARCHIVE_RETENTION_MONTHS before deletion.
 * Runs once daily at 2:00 AM UTC as the job DB role via `delete()`.
 *
 * Deletes archived records from: pwds, tokens, password policies, and trusted devices.
 */
export function startDeleteArchivedEntitiesJob() {
  scheduleDailyAt(2, async () => {
    try {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - ARCHIVE_RETENTION_MONTHS);

      log.info(
        `Starting scheduled deletion of archived entities (archived > ${ARCHIVE_RETENTION_MONTHS} months)...`,
      );

      const entities = [
        { name: "pwds", deleteArchived: makeDeleteArchived("pwd") },
        { name: "tokens", deleteArchived: makeDeleteArchived("token") },
        {
          name: "password policies",
          deleteArchived: makeDeleteArchived("pwd_policy"),
        },
        {
          name: "trusted devices",
          deleteArchived: makeDeleteArchived("user_trusted_device"),
        },
      ];

      let totalDeleted = 0;

      const results = await Promise.allSettled(
        entities.map((entity) =>
          entity.deleteArchived(cutoff).then((count) => ({ entity, count })),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { entity, count } = result.value;
          if (count > 0)
            log.info(`    ✓ Deleted ${count} archived ${entity.name}`);
          else log.info(`    • No archived ${entity.name} to delete`);
          totalDeleted += count;
        } else {
          log.error(
            `    ✗ Failed: ${result.reason?.message || result.reason?.msg}`,
          );
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

  log.info(
    `Delete archived entities job initialized (runs daily at 2:00 AM UTC, deletes entities archived > ${ARCHIVE_RETENTION_MONTHS} months)`,
  );
}
