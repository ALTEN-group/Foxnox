import { execute } from "@dwtechs/antity-pgsql";

// Bookkeeping columns every audited table stamps on every write, regardless
// of which field actually changed — always ignored, or a history row would
// never look like a no-op even when only system-managed columns changed.
const ALWAYS_IGNORED_COLS = ["updatedAt", "updaterId", "updaterName"];

/**
 * Groups history rows that belong to the same logical action (e.g. a route
 * update that also rewrites its route_operation/route_method junction rows)
 * into a single entry.
 *
 * Rows are grouped by (tstamp, consumerId, record.id): Postgres `now()` is
 * transaction-stable so every row written by the same transaction shares the
 * same tstamp, and record.id (the audited entity's own id, reused by
 * junction-table history rows) keeps unrelated records apart when several
 * of them are updated in a single bulk transaction. Merged group keeps the
 * first row's id/operation/tstamp/consumerName and combines all `record`
 * fields into one object.
 * @param {Array<object>} rows - rows returned by query(), ordered by tstamp ASC, id ASC
 * @returns {Array<object>} grouped history entries
 */
function groupByAction(rows) {
  const groups = new Map();
  for (const row of rows) {
    const tstamp =
      row.tstamp instanceof Date ? row.tstamp.toISOString() : row.tstamp;
    const key = `${tstamp}_${row.consumerId}_${row.record?.id}`;
    const group = groups.get(key);
    if (!group)
      groups.set(key, {
        id: row.id,
        tstamp: row.tstamp,
        operation: row.operation,
        consumerId: row.consumerId,
        consumerName: row.consumerName,
        record: { ...row.record },
      });
    else Object.assign(group.record, row.record);
  }
  return [...groups.values()];
}

/**
 * Drops history rows that changed nothing but ignored columns, so the
 * admin revision view only shows entries a human could actually revert to.
 * `log.history` itself is untouched — this only filters what gets returned.
 *
 * Always keeps the first row (the `INSERT` baseline). Each later row is
 * compared against the last *kept* row's record, ignoring `ignoreCols` plus
 * the bookkeeping columns every write stamps regardless of which field
 * changed; it's kept only if some other key differs, so runs of pure-noise
 * rows collapse into whichever real edit preceded them.
 * @param {Array<object>} rows - grouped history entries, ordered oldest to newest
 * @param {string[]} [ignoreCols=[]] - field-specific columns to ignore (e.g. system-managed fields)
 * @returns {Array<object>} rows with no-op entries dropped
 */
function filterMeaningful(rows, ignoreCols = []) {
  const ignored = new Set([...ignoreCols, ...ALWAYS_IGNORED_COLS]);
  const kept = [];
  let prevRecord = null;
  for (const row of rows) {
    if (!prevRecord) {
      kept.push(row);
      prevRecord = row.record;
      continue;
    }
    const changed = Object.keys(row.record).some(
      (key) => !ignored.has(key) && row.record[key] !== prevRecord[key],
    );
    if (changed) {
      kept.push(row);
      prevRecord = row.record;
    }
  }
  return kept;
}

/**
 * Creates a history getter middleware for a specific table.
 *
 * Rows carry the trigger's `row_to_json(NEW)` snapshot under `record`, which
 * includes `isPrivate` columns; the router's `send` terminal scrubs them.
 *
 * @param {string|string[]} tableName - The name(s) of the table(s) to retrieve history for
 * @param {string} [schema='public'] - The schema name (defaults to 'public')
 * @param {string[]} [ignoreCols=[]] - field-specific columns to ignore when deciding whether a row is meaningful
 * @returns {Function} Express middleware function
 */
function get(tableName, schema = "public", ignoreCols = []) {
  return (req, res, next) => {
    const id = req.params.id;
    // log.debug(`getHistory(id=${id})`);
    if (!id) return next({ statusCode: 400, message: "Missing id" });

    query(tableName, id, schema)
      .then((r) => {
        if (!r.rowCount)
          return next({ statusCode: 404, message: "history not found" });
        const rows = filterMeaningful(groupByAction(r.rows), ignoreCols);
        if (rows.length === 1 && rows[0].operation === "INSERT")
          return next({ statusCode: 404, message: "history not found" });
        res.locals.rows = rows;
        res.locals.total = rows.length;
        next();
      })
      .catch((err) => next(err));
  };
}

/**
 * Retrieves the history for a given ID.
 *
 * @param {string|string[]} tableName - The name(s) of the table(s) to retrieve history for
 * @param {type} id - The ID for which to retrieve history.
 * @param {string} [schema='public'] - The schema name (defaults to 'public')
 * @return {Promise} A promise that resolves with the history data.
 */
function query(tableName, id, schema = "public") {
  const tableNames = Array.isArray(tableName) ? tableName : [tableName];
  const sql = `
    SELECT id, tstamp, operation, "userId" AS "consumerId", "userName" AS "consumerName", record
    FROM log.history
    WHERE "schemaName" = $1 
      AND "tableName" = ANY($2::text[])
      AND CAST(record->>'id' AS INT) = $3
    ORDER BY tstamp ASC, id ASC
  `;
  return execute(sql, [schema, tableNames, id], null);
}

export default {
  get,
  groupByAction,
  filterMeaningful,
};
