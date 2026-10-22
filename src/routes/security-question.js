// @ts-check
import express from "express";

const router = express.Router();

import sqEnt from "../entities/security-question.js";
import { enforceAcl, requireConsumer } from "../middlewares/acl.js";
import {
  attachTranslations,
  exposeTranslationFields,
  mergeSaveHistory,
  persistTranslations,
} from "../middlewares/mappers/question-trans.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post(
  "/search",
  enforceAcl(sqEnt, "search"),
  sqEnt.get,
  attachTranslations,
);
// Get version history of a specific row
router.get(
  "/:id/history",
  enforceAcl(sqEnt, "existing"),
  sqEnt.getHistory,
  mergeSaveHistory,
);
// Add security questions
router.post(
  "/",
  requireConsumer,
  enforceAcl(sqEnt, "insert"),
  sqEnt.addArraySubstack,
  persistTranslations,
);
// Update fields
router.put(
  "/",
  requireConsumer,
  enforceAcl(sqEnt, "existing"),
  sqEnt.updateArraySubstack,
  persistTranslations,
);
// Bulk archive
router.post(
  "/archive",
  requireConsumer,
  enforceAcl(sqEnt, "existing"),
  sqEnt.archive,
);
// Get entity schema
router.get(
  "/schema",
  enforceAcl(sqEnt, "output"),
  schema.get(sqEnt),
  exposeTranslationFields,
);

export default router;
