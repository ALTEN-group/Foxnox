// @ts-check
import express from "express";

import { when } from "../middlewares/conditional.js";

const router = express.Router();

import uEnt from "../entities/user.js";
import getUserByEmail from "../middlewares/queries/getUserByEmail.js";
import activateUser from "../middlewares/queries/activateUser.js";

// middleware sub-stacks
const getUser = [ uEnt.normalize, uEnt.validate, getUserByEmail, uEnt.get ];
const activate = [ activateUser, uEnt.update ];
const login = [
  getUser,
  compare,
  when(res => !res.body.rows[0].active, activate),
  refresh,
];

//Routes
// add a consumer. Log a user
router.post("/", login);

export default router;
