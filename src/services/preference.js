// @ts-check
import { execute } from "@dwtechs/antity-pgsql";

/**
 * Fetches the merged list of preferences available for a resource from the
 * `preferences` view (templates, "userId" IS NULL / locked=true, and this
 * user's own preference rows, locked=false). "isActive" reflects this user's
 * own preference_selection row.
 *
 * @param {number} userId
 * @param {string} resource - resource name (matched against "resourceName")
 * @returns {Promise<Array<object>>}
 */
export async function getMany(userId, resource) {
  const { rows } = await execute(
    `SELECT v.id, v."resourceName", v.name, v.conf, v.locked,
            COALESCE(v.id = ps."preferenceId", false) AS "isActive"
     FROM preferences v
     LEFT JOIN preference_selection ps ON ps."resourceName" = v."resourceName" AND ps."userId" = $1
     WHERE v."resourceName" = $2 AND (v.locked OR v."userId" = $1)
     ORDER BY v.name`,
    [userId, resource],
    null,
  );
  return rows;
}
