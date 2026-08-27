// @ts-check
import express from "express";

const router = express.Router();

import tdEnt from "../entities/user-device.js";
import { enforceAcl } from "../middlewares/acl.js";
import history from "../middlewares/history.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", enforceAcl(tdEnt, "search"), tdEnt.get);
// Get version history of a specific row
router.get(
  "/:id/history",
  enforceAcl(tdEnt, "existing"),
  history.get("user_trusted_device"),
);
// Add trusted devices
router.post("/", enforceAcl(tdEnt, "insert"), tdEnt.addArraySubstack);
// Update fields
router.put("/", enforceAcl(tdEnt, "existing"), tdEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", enforceAcl(tdEnt, "existing"), tdEnt.archive);
// Get entity schema
router.get("/schema", enforceAcl(tdEnt, "output"), schema.get(tdEnt));

export default router;
