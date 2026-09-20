// @ts-check
import express from "express";

const router = express.Router();

import ppEnt, { DEFAULTS } from "../entities/pwd-policy.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import history from "../middlewares/history.js";
import { dropNulls } from "../middlewares/mappers/drop-nulls.js";
import { fillDefaults } from "../middlewares/mappers/fill-defaults.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", enforceAcl(ppEnt, "search"), ppEnt.get);
// Get version history of a specific row
router.get(
  "/:id/history",
  enforceAcl(ppEnt, "existing"),
  history.get("pwd_policy"),
);
// Add password policies
router.post(
  "/",
  requireConsumer,
  enforceAcl(ppEnt, "insert"),
  fillDefaults(DEFAULTS),
  ppEnt.addArraySubstack,
);
// Update fields
router.put(
  "/",
  requireConsumer,
  enforceAcl(ppEnt, "existing"),
  dropNulls(ppEnt),
  ppEnt.updateArraySubstack,
);
// Bulk archive
router.post("/archive", requireConsumer, enforceAcl(ppEnt, "existing"), ppEnt.archive);
// Get entity schema
router.get("/schema", enforceAcl(ppEnt, "output"), schema.get(ppEnt));

export default router;
