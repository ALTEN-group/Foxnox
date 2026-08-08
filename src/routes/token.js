// @ts-check
import express from "express";
const router = express.Router();

import tEnt from "../entities/token.js";
import history from "../middlewares/history.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", tEnt.get);
// Get version history of a specific field
router.get("/:id/history", history.get("token"));
// Add tokens
router.post("/", tEnt.addArraySubstack);
// Update fields
router.put("/", tEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", tEnt.archive);
// Get entity schema
router.get("/schema", schema.get(tEnt));

export default router;
