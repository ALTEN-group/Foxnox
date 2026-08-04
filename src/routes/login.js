// @ts-check
import { compare } from "@dwtechs/passken-express";
import express from "express";

const router = express.Router();

import pEnt from "../entities/pwd.js";

// middleware sub-stacks
const getPwd = [ pEnt.normalize, pEnt.validate, pEnt.get ];
const comparePwd = [
  getPwd,
  compare,
];

//Routes
// Validate password for login
router.post("/", comparePwd);

export default router;
