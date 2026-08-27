// @ts-check

import { isValidInteger } from "@dwtechs/checkard";
import express from "express";
import { verifyTrustedDevice } from "../services/devices.js";

const router = express.Router();

/**
 * Called by Gatelin during login to see if the browser's trusted-device
 * cookie should skip the 2FA challenge.
 *
 * Body: { userId: number, deviceToken: string }
 */
// Mounted at `/foxnox/devices/verify` in app.js → POST that path.
router.post("/", async (req, res, next) => {
  try {
    const userId = Number(req.body?.userId);
    const deviceToken = String(req.body?.deviceToken ?? "");
    if (!isValidInteger(userId, 1, undefined, true) || !deviceToken) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const trusted = await verifyTrustedDevice(userId, deviceToken);
    return res.status(200).json({ trusted });
  } catch (err) {
    return next(err);
  }
});

export default router;
