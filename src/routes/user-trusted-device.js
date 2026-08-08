// @ts-check
import express from "express";
const router = express.Router();

import tdEnt from "../entities/user-trusted-device.js";
import history from "../middlewares/history.js";
import schema from "../middlewares/schema.js";

//Routes
// Search fields
router.post("/search", tdEnt.get);
// Get version history of a specific field
router.get("/:id/history", history.get("user_trusted_device"));
// Add trusted devices
router.post("/", tdEnt.addArraySubstack);
// Update fields
router.put("/", tdEnt.updateArraySubstack);
// Bulk archive
router.post("/archive", tdEnt.archive);
// Get entity schema
router.get("/schema", schema.get(tdEnt));

export default router;
