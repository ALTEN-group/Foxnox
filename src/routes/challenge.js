// @ts-check
import express from "express";
import { createChallenge } from "../middlewares/mappers/create-challenge.js";
import { sendChallenge } from "../middlewares/res/send-challenge.js";
import { checkChallengeBody } from "../middlewares/validators/check-challenge.js";

const router = express.Router();

const add = [checkChallengeBody, createChallenge, sendChallenge];

router.post("/", add);

export default router;
