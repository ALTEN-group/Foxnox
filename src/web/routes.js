// @ts-check
import express from "express";
import { csrfProtection } from "./csrf.js";
import {
  getAccountRecoverChallenge,
  getAccountRecoverRequest,
  postAccountRecoverChallenge,
  postAccountRecoverRequest,
} from "./handlers/account-recover.js";
import {
  getPasswordExpired,
  postPasswordExpired,
} from "./handlers/password-expired.js";
import {
  getRecoverRequest,
  getRecoverReset,
  postRecoverRequest,
  postRecoverReset,
} from "./handlers/recover.js";
import {
  getSecurityQuestionsSetup,
  postSecurityQuestionsSetup,
} from "./handlers/security-questions.js";
import {
  getTrustedDevicePrompt,
  getTrustedDevicesManage,
  postTrustedDevicePrompt,
  postTrustedDevicesManage,
} from "./handlers/devices.js";
import {
  getTwofaSetup,
  getTwofaVerify,
  postTwofaSetup,
  postTwofaVerify,
} from "./handlers/twofa.js";
import {
  getUnlockConfirm,
  getUnlockRequest,
  postUnlockRequest,
} from "./handlers/unlock.js";

const router = express.Router();

// HTML forms — keep this parser local so JSON API routes stay JSON-only.
router.use(express.urlencoded({ extended: false, limit: "16kb" }));
// Signed double-submit CSRF for all workflow POSTs (after body parse).
router.use(csrfProtection);

// Password recovery
router.get("/recover", getRecoverRequest);
router.post("/recover", postRecoverRequest);
router.get("/recover/reset", getRecoverReset);
router.post("/recover/reset", postRecoverReset);

// Two-factor authentication
router.get("/2fa/verify", getTwofaVerify);
router.post("/2fa/verify", postTwofaVerify);
router.get("/2fa/setup", getTwofaSetup);
router.post("/2fa/setup", postTwofaSetup);

// Lost-2FA / account recovery (security questions)
router.get("/account-recover", getAccountRecoverRequest);
router.post("/account-recover", postAccountRecoverRequest);
router.get("/account-recover/challenge", getAccountRecoverChallenge);
router.post("/account-recover/challenge", postAccountRecoverChallenge);

// Security questions enrollment
router.get("/security-questions", getSecurityQuestionsSetup);
router.post("/security-questions", postSecurityQuestionsSetup);

// Trusted devices
router.get("/trusted-devices/prompt", getTrustedDevicePrompt);
router.post("/trusted-devices/prompt", postTrustedDevicePrompt);
router.get("/trusted-devices", getTrustedDevicesManage);
router.post("/trusted-devices", postTrustedDevicesManage);

// Expired password (login challenge)
router.get("/password/expired", getPasswordExpired);
router.post("/password/expired", postPasswordExpired);

// Account unlock after lockout
router.get("/unlock", getUnlockRequest);
router.post("/unlock", postUnlockRequest);
router.get("/unlock/confirm", getUnlockConfirm);

export default router;
