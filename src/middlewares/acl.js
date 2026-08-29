// @ts-check
import { execute } from "@dwtechs/antity-pgsql";
import { getConsumer, getAcl, stripUnallowedFields } from "@dwtechs/gatelin-express";

/**
 * Enforces Gatelin's ACL headers at the Foxnox data boundary.
 *
 * @param {object} ent
 * @param {"search"|"insert"|"existing"|"output"} mode
 * @returns {import("express").RequestHandler}
 */
export function enforceAcl(ent, mode) {
  return function aclMiddleware(req, res, next) {
    mapConsumer(req, res, (err) => {
      if (err) return next(normalizeAclError(err));
      getAcl(req, res, (err2) => {
        if (err2) return next(normalizeAclError(err2));
        let conditions;
        try {
          res.locals.acl = validateAcl(res.locals.acl, ent);
          conditions = res.locals.acl.conditions;
        } catch (err3) {
          return next(normalizeAclError(err3));
        }
        // Strip disallowed fields first so insert conditions can inject their
        // forced value onto fields that were just stripped out (same order as
        // the previous inline implementation).
        const enforceConditions = async () => {
          try {
            if (mode === "search") applySearchConditions(req, conditions);
            else if (mode === "insert") enforceInsertConditions(req, conditions);
            else if (mode === "existing")
              await assertExistingRows(req, res, ent, conditions);
          } catch (err4) {
            return next(normalizeAclError(err4));
          }
          next();
        };
        if (mode === "insert" || mode === "existing")
          stripUnallowedFields(req, res, enforceConditions);
        else
          enforceConditions();
      });
    });
  };
}

/**
 * Maps Gatelin's trusted identity headers to res.locals.consumer via the shared
 * @dwtechs/gatelin-express `getConsumer` middleware. Header absence is allowed
 * for internal flows: the strict shared validator only runs when at least one
 * consumer header is present.
 * Exported for routes (e.g. preferences) that need consumer identity without
 * the rest of the ACL fields/conditions pipeline.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function mapConsumer(req, res, next) {
  if (
    req.headers["x-consumer-user-id"] === undefined &&
    req.headers["x-consumer-name"] === undefined
  )
    return next();
  getConsumer(req, res, (err) => next(err ? normalizeAclError(err) : undefined));
}

/**
 * Checks the shared lib's raw ACL (field names / condition shape) against this
 * entity's own properties: unknown or non-filterable fields are rejected, and
 * condition values are normalized to each property's type.
 *
 * @param {{fields: Set<string>|null, conditions: Array<{field:string, op:string, value:unknown}>}} acl
 * @param {object} ent
 */
function validateAcl(acl, ent) {
  const properties = new Map(ent.properties.map((prop) => [prop.key, prop]));
  if (acl.fields) {
    for (const field of acl.fields)
      if (!properties.has(field)) throw forbidden(`Unknown ACL field "${field}"`);
  }
  const conditions = acl.conditions.map((condition) => {
    const property = properties.get(condition.field);
    if (!property || !property.isFilterable)
      throw forbidden("Unsupported ACL condition");
    return {
      ...condition,
      value: normalizeConditionValue(condition.value, property.type),
    };
  });
  return { fields: acl.fields, conditions };
}


/**
 * @param {import("express").Request} req
 * @param {Array<{field:string, op:string, value:unknown}>} conditions
 */
function applySearchConditions(req, conditions) {
  if (!conditions.length) return;
  req.body ??= {};
  req.body.filters ??= {};
  for (const condition of conditions) {
    const filters = req.body.filters[condition.field];
    const callerFilters = (
      Array.isArray(filters) ? filters : filters ? [filters] : []
    ).map((filter) => ({ ...filter, operator: "AND" }));
    const forced = {
      value: condition.value,
      matchMode: condition.op,
      operator: "AND",
    };
    req.body.filters[condition.field] = [...callerFilters, forced];
  }
  // ACL predicates must never be ORed with caller-controlled filters.
  req.body.operator = "AND";
}

/**
 * @param {import("express").Request} req
 * @param {Array<{field:string, op:string, value:unknown}>} conditions
 */
function enforceInsertConditions(req, conditions) {
  if (!conditions.length) return;
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length) return;

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw forbidden("Invalid row for ACL enforcement");
    for (const condition of conditions) {
      if (!(condition.field in row) && condition.op === "=") {
        row[condition.field] = condition.value;
        continue;
      }
      if (
        !(condition.field in row) ||
        !matches(row[condition.field], condition.op, condition.value)
      )
        throw forbidden("Row violates ACL conditions");
    }
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {object} ent
 * @param {Array<{field:string, op:string, value:unknown}>} conditions
 */
async function assertExistingRows(req, res, ent, conditions) {
  if (!conditions.length) return;
  const ids = getTargetIds(req);
  if (!ids.length) return;

  const filters = conditionsToFilters(conditions);
  filters.id = { value: ids, matchMode: "in" };
  const { query, args } = ent.query.select(0, null, null, null, filters, "AND");
  const result = await execute(query, args, res.locals.dbClient ?? null);
  const matched = new Set(result.rows.map((row) => Number(row.id)));
  if (ids.some((id) => !matched.has(id)))
    throw forbidden("One or more rows violate ACL conditions");

  // Prevent a permitted update from moving a row outside its ACL partition.
  if (Array.isArray(req.body?.rows)) {
    for (const row of req.body.rows) {
      for (const condition of conditions) {
        if (
          condition.field in row &&
          !matches(row[condition.field], condition.op, condition.value)
        )
          throw forbidden("Update violates ACL conditions");
      }
    }
  }
}

/**
 * @param {import("express").Request} req
 */
function getTargetIds(req) {
  const ids = [];
  if (req.params?.id !== undefined) ids.push(Number(req.params.id));
  if (Array.isArray(req.body?.rows)) {
    for (const row of req.body.rows) {
      if (row?.id !== undefined) ids.push(Number(row.id));
    }
  }
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

/**
 * @param {Array<{field:string, op:string, value:unknown}>} conditions
 */
function conditionsToFilters(conditions) {
  const filters = {};
  for (const condition of conditions) {
    filters[condition.field] ??= [];
    filters[condition.field].push({
      value: condition.value,
      matchMode: condition.op,
      operator: "AND",
    });
  }
  return filters;
}

function matches(actual, op, expected) {
  const normalizedActual = normalizeLike(actual, expected);
  switch (op) {
    case "=":
      return normalizedActual === expected;
    case "!=":
      return normalizedActual !== expected;
    case "<":
      return normalizedActual < expected;
    case ">":
      return normalizedActual > expected;
    case "<=":
      return normalizedActual <= expected;
    case ">=":
      return normalizedActual >= expected;
    default:
      return false;
  }
}

function normalizeConditionValue(value, type) {
  if (type === "integer" || type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number))
      throw forbidden("Invalid numeric ACL condition value");
    return number;
  }
  if (type === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw forbidden("Invalid boolean ACL condition value");
  }
  return String(value);
}

function normalizeLike(value, expected) {
  if (typeof expected === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (typeof expected === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
  }
  if (typeof expected === "string") return String(value);
  return value;
}

function forbidden(message) {
  return { statusCode: 403, message };
}

function normalizeAclError(err) {
  if (err?.statusCode) return err;
  return {
    statusCode: err?.status ?? 500,
    message: err?.message ?? err?.msg ?? "ACL enforcement failed",
  };
}
