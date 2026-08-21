// @ts-check
import express from "express";
import { redeemLoginResumeTicket } from "../web/login-resume.js";

const router = express.Router();

/**
 * Gatelin redeems a one-shot ticket after mid-login challenges complete.
 * Body: { ticket: string }
 * → 200 { userId } | 400
 */
router.post("/redeem", async (req, res, next) => {
  try {
    const ticket = String(req.body?.ticket ?? "").trim();
    if (!ticket) {
      return res.status(400).json({ error: "Missing ticket" });
    }
    const redeemed = await redeemLoginResumeTicket(ticket);
    if (!redeemed) {
      return res.status(400).json({ error: "Invalid or expired ticket" });
    }
    return res.status(200).json({ userId: redeemed.userId });
  } catch (err) {
    return next(err);
  }
});

export default router;
