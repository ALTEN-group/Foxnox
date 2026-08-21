// @ts-check
import express from "express";

const router = express.Router();

import ppEnt from "../entities/pwd-policy.js";
import { enforceAcl } from "../middlewares/acl.js";
import history from "../middlewares/history.js";
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
router.post("/", enforceAcl(ppEnt, "insert"), ppEnt.addArraySubstack);
// Update fields
router.put("/", enforceAcl(ppEnt, "existing"), ppEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", enforceAcl(ppEnt, "existing"), ppEnt.archive);
// Get entity schema
router.get("/schema", enforceAcl(ppEnt, "output"), schema.get(ppEnt));

export default router;
