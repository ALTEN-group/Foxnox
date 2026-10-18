// @ts-check
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { execute } from "@dwtechs/antity-pgsql";
import { log } from "@dwtechs/winstan";
import bEnt from "../entities/branding.js";
import { PUBLIC_ROOT } from "../web/engine.js";

/** Served by the `${WEB_MOUNT}/assets/branding` static mount in app.js. */
export const IMAGE_DIR = path.join(PUBLIC_ROOT, "assets", "branding");

/**
 * Describes one kind of branding image (logo, favicon).
 * Column names are constants, never request input.
 * @typedef {object} ImageKind
 * @property {string} prefix generated file name prefix
 * @property {string} fileCol branding column holding the stored file name
 * @property {RegExp} re only names matching it are ever written, deleted or exposed
 */

/**
 * @param {number} id branding row id
 * @returns {Promise<Record<string, any>|null>} the row, or null when missing/archived
 */
async function findActive(id) {
  const { query, args } = bEnt.query.select(
    0,
    null,
    null,
    null,
    {
      id: { value: id, matchMode: "equals" },
      archived: { value: false, matchMode: "equals" },
    },
    "AND",
  );
  const res = await execute(query, args, null);
  return res.rows?.[0] ?? null;
}

/**
 * @param {number} id branding row id
 * @param {Record<string, string>} values columns to set
 * @param {{ userId: number, nickname: string }} consumer
 * @returns {Promise<Record<string, any>|null>} the updated row
 */
async function updateRow(id, values, consumer) {
  const { query, args } = bEnt.query.update([{ id, ...values }], consumer);
  await execute(query, args, null);
  return findActive(id);
}

/**
 * Stores the image on disk, points the branding row at it (the DB trigger
 * clears the URL alternative) and drops the previous file. The
 * client-supplied filename is never used.
 *
 * @param {ImageKind} kind
 * @param {number} id branding row id
 * @param {{ userId: number, nickname: string }} consumer
 * @param {{ buffer: Buffer, ext: string }} image
 * @returns {Promise<Record<string, unknown>|null>} updated row, or null when the row is missing/archived
 */
export async function saveImage(kind, id, consumer, image) {
  const { prefix, fileCol, re } = kind;
  const current = await findActive(id);
  if (!current) return null;
  const file = `${prefix}-${randomUUID()}.${image.ext}`;
  if (!re.test(file)) throw new Error(`Invalid ${prefix} extension`);
  await mkdir(IMAGE_DIR, { recursive: true });
  await writeFile(path.join(IMAGE_DIR, file), image.buffer, { flag: "wx" });

  try {
    // The branding_before_update_trigger clears the URL column (either/or rule).
    const updated = await updateRow(id, { [fileCol]: file }, consumer);
    // A concurrent upload may leave its file behind: harmless, unlike a failed request.
    if (current[fileCol] && current[fileCol] !== file)
      await removeImage(current[fileCol], re);
    return updated;
  } catch (err) {
    await removeImage(file, re);
    throw err;
  }
}

/**
 * Clears the file column and removes the stored image from disk.
 *
 * @param {ImageKind} kind
 * @param {number} id branding row id
 * @param {{ userId: number, nickname: string }} consumer
 * @returns {Promise<Record<string, unknown>|null>} updated row, or null when the row is missing/archived
 */
export async function deleteImage(kind, id, consumer) {
  const { fileCol, re } = kind;
  const current = await findActive(id);
  if (!current) return null;
  const updated = await updateRow(id, { [fileCol]: "" }, consumer);
  if (current[fileCol]) await removeImage(current[fileCol], re);
  return updated;
}

/**
 * Best-effort delete: a leftover file is harmless, a failed request is not.
 * @param {string} file
 * @param {RegExp} re
 * @returns {Promise<void>}
 */
async function removeImage(file, re) {
  if (!re.test(file)) return;
  try {
    await unlink(path.join(IMAGE_DIR, file));
  } catch (err) {
    log.warn(`removeImage ${file} failed: ${err?.message || err}`);
  }
}
