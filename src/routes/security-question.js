// @ts-check
import express from "express";

const router = express.Router();

import sqEnt from "../entities/security-question.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", enforceAcl(sqEnt, "search"), sqEnt.get);
// Get version history of a specific row
router.get("/:id/history", enforceAcl(sqEnt, "existing"), sqEnt.getHistory);
// Add security questions
router.post(
  "/",
  requireConsumer,
  enforceAcl(sqEnt, "insert"),
  sqEnt.addArraySubstack,
);
// Update fields
router.put(
  "/",
  requireConsumer,
  enforceAcl(sqEnt, "existing"),
  sqEnt.updateArraySubstack,
);
// Bulk archive
router.post(
  "/archive",
  requireConsumer,
  enforceAcl(sqEnt, "existing"),
  sqEnt.archive,
);
// Get entity schema
router.get("/schema", enforceAcl(sqEnt, "output"), schema.get(sqEnt));

export default router;
