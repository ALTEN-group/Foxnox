// @ts-check

import { compare, create } from "@dwtechs/passken-express";
import express from "express";

const router = express.Router();

import pEnt from "../entities/pwd.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import history from "../middlewares/history.js";
import { checkLockout } from "../middlewares/mappers/check-lockout.js";
import { serializeCompare } from "../middlewares/mappers/serialize-compare.js";
import {
  clearLoginAttempts,
  trackFailedAttempt,
} from "../middlewares/mappers/track-login-attempt.js";
import schema from "../middlewares/schema.js";
import { checkCompareBody } from "../middlewares/validators/check-compare.js";

//Routes
router.post(
  "/compare",
  checkCompareBody,
  serializeCompare,
  pEnt.get,
  checkLockout,
  compare,
  clearLoginAttempts,
  trackFailedAttempt,
);
// Search fields
router.post("/search", enforceAcl(pEnt, "search"), pEnt.get);
// Get version history of a specific row
router.get("/:id/history", enforceAcl(pEnt, "existing"), history.get("pwd"));
// Add pwds — server generates plaintext + hash for each { userId } row: passken-express
router.post("/", requireConsumer, enforceAcl(pEnt, "insert"), create, pEnt.addArraySubstack);
// Update fields
router.put("/", requireConsumer, enforceAcl(pEnt, "existing"), pEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", requireConsumer, enforceAcl(pEnt, "existing"), pEnt.archive);
// Get entity schema
router.get("/schema", enforceAcl(pEnt, "output"), schema.get(pEnt));

export default router;
