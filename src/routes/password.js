// @ts-check
import express from "express";
import { compare } from "@dwtechs/passken-express";
const router = express.Router();

import pEnt from "../entities/pwd.js";
import history from "../middlewares/history.js";
import schema from "../middlewares/schema.js";
  
// middleware sub-stacks
const getPwd = [ pEnt.normalize, pEnt.validate, pEnt.get ];

//Routes
router.post("/compare", getPwd, compare);
// Search fields
router.post("/search", pEnt.get);
// Get version history of a specific field
router.get("/:id/history", history.get("field"));
// Add pwds
router.post("/", pEnt.addArraySubstack);
// Update fields
router.put("/", pEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", pEnt.archive);
// Get entity schema
router.get("/schema", schema.get(pEnt));

export default router;
