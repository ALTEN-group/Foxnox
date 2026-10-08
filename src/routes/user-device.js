// @ts-check
import express from "express";

const router = express.Router();

import tdEnt from "../entities/user-device.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", enforceAcl(tdEnt, "search"), tdEnt.get);
// Get version history of a specific row
// System-managed fields (lastUsedAt is touched on every login with the device)
// are ignored so the history only shows entries an admin could actually revert to.
const historyIgnoreCols = tdEnt.properties
  .filter((p) => p.readOnly)
  .map((p) => p.key);
router.get(
  "/:id/history",
  enforceAcl(tdEnt, "existing"),
  tdEnt.history({ ignoreCols: historyIgnoreCols }),
);
// Add trusted devices
router.post(
  "/",
  requireConsumer,
  enforceAcl(tdEnt, "insert"),
  tdEnt.addArraySubstack,
);
// Update fields
router.put(
  "/",
  requireConsumer,
  enforceAcl(tdEnt, "existing"),
  tdEnt.updateArraySubstack,
);
// Bulk archive
router.post(
  "/archive",
  requireConsumer,
  enforceAcl(tdEnt, "existing"),
  tdEnt.archive,
);
// Get entity schema
router.get("/schema", enforceAcl(tdEnt, "output"), schema.get(tdEnt));

export default router;
