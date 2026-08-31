// @ts-check
import express from "express";

const router = express.Router();

import tEnt from "../entities/token.js";
import { enforceAcl } from "../middlewares/acl.js";
import history from "../middlewares/history.js";
import { dropNulls } from "../middlewares/mappers/drop-nulls.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", enforceAcl(tEnt, "search"), tEnt.get);
// Get version history of a specific row
router.get("/:id/history", enforceAcl(tEnt, "existing"), history.get("token"));
// Add tokens
router.post("/", enforceAcl(tEnt, "insert"), tEnt.addArraySubstack);
// Update fields
router.put(
  "/",
  enforceAcl(tEnt, "existing"),
  dropNulls(tEnt),
  tEnt.updateArraySubstack,
);
// Bulk archive
router.post("/archive", enforceAcl(tEnt, "existing"), tEnt.archive);
// Get entity schema
router.get("/schema", enforceAcl(tEnt, "output"), schema.get(tEnt));

export default router;
