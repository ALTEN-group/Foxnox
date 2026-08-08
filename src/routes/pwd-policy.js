// @ts-check
import express from "express";
const router = express.Router();

import ppEnt from "../entities/pwd-policy.js";
import history from "../middlewares/history.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", ppEnt.get);
// Get version history of a specific field
router.get("/:id/history", history.get("pwd_policy"));
// Add password policies
router.post("/", ppEnt.addArraySubstack);
// Update fields
router.put("/", ppEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", ppEnt.archive);
// Get entity schema
router.get("/schema", schema.get(ppEnt));

export default router;
