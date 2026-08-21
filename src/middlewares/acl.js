// @ts-check
import { execute } from "@dwtechs/antity-pgsql";

const ALLOWED_OPS = new Set(["=", "!=", "<", ">", "<=", ">="]);
const MAX_CONDITIONS = 50;
const MAX_CONDITIONS_HEADER_BYTES = 16 * 1024;

/**
 * Enforces Gatelin's ACL headers at the Foxnox data boundary.
 *
 * @param {object} ent
 * @param {"search"|"insert"|"existing"|"output"} mode
 * @returns {import("express").RequestHandler}
 */
export function enforceAcl(ent, mode) {
  return async function aclMiddleware(req, res, next) {
    let acl;
    try {
      mapConsumer(req, res);
      acl = parseAcl(req, ent);
      if (mode === "insert" || mode === "existing")
        filterWriteRows(req, acl.fields);
      if (mode === "search") applySearchConditions(req, acl.conditions);
      else if (mode === "insert") enforceInsertConditions(req, acl.conditions);
      else if (mode === "existing")
        await assertExistingRows(req, res, ent, acl.conditions);
    } catch (err) {
      return next(normalizeAclError(err));
    }
    next();
  };
}

/**
 * Maps Gatelin's trusted identity headers to the shape antity-pgsql uses for
 * creator/updater audit columns. Header absence is allowed for internal flows.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
function mapConsumer(req, res) {
  const rawId = req.headers["x-consumer-user-id"];
  const rawName = req.headers["x-consumer-name"];
  if (rawId === undefined && rawName === undefined) return;
  if (Array.isArray(rawId) || Array.isArray(rawName))
    throw forbidden("Invalid consumer headers");

  const userId = Number(rawId);
  const nickname = typeof rawName === "string" ? rawName.trim() : "";
  if (!Number.isInteger(userId) || userId <= 0 || !nickname)
    throw forbidden("Invalid consumer headers");

  res.locals.consumer = { userId, nickname };
}

/**
 * @param {import("express").Request} req
 * @param {object} ent
 */
function parseAcl(req, ent) {
  const properties = new Map(ent.properties.map((prop) => [prop.key, prop]));
  const fields = parseFields(req.headers["x-acl-fields"], properties);
  const conditions = parseConditions(
    req.headers["x-acl-conditions"],
    properties,
  );
  return { fields, conditions };
}

/**
 * @param {string|string[]|undefined} header
 * @param {Map<string, object>} properties
 * @returns {Set<string>|null}
 */
function parseFields(header, properties) {
  if (header === undefined) return null;
  const raw = Array.isArray(header) ? header.join(",") : String(header);
  const fields = new Set(
    raw
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean),
  );
  for (const field of fields) {
    if (!properties.has(field)) throw forbidden(`Unknown ACL field "${field}"`);
  }
  return fields;
}

/**
 * @param {string|string[]|undefined} header
 * @param {Map<string, object>} properties
 * @returns {Array<{field:string, op:string, value:unknown}>}
 */
function parseConditions(header, properties) {
  if (header === undefined) return [];
  if (Array.isArray(header))
    throw forbidden("Duplicate x-acl-conditions headers");
  if (Buffer.byteLength(header) > MAX_CONDITIONS_HEADER_BYTES)
    throw forbidden("ACL conditions header is too large");

  let parsed;
  try {
    parsed = JSON.parse(header);
  } catch {
    throw forbidden("Invalid x-acl-conditions JSON");
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_CONDITIONS)
    throw forbidden("Invalid ACL conditions");

  return parsed.map((condition) => {
    if (!condition || typeof condition !== "object" || Array.isArray(condition))
      throw forbidden("Invalid ACL condition");
    const { field, op, value } = condition;
    const property = properties.get(field);
    if (
      typeof field !== "string" ||
      !property ||
      !property.isFilterable ||
      !ALLOWED_OPS.has(op) ||
      value === null ||
      typeof value === "object"
    )
      throw forbidden("Unsupported ACL condition");
    return { field, op, value: normalizeConditionValue(value, property.type) };
  });
}

/**
 * @param {import("express").Request} req
 * @param {Set<string>|null} fields
 */
function filterWriteRows(req, fields) {
  if (fields === null || !Array.isArray(req.body?.rows)) return;
  req.body.rows = req.body.rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => key === "id" || fields.has(key)),
    );
  });
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
    message: err?.message ?? "ACL enforcement failed",
  };
}
