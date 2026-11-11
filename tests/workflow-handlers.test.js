/** @jest-environment node */
// @ts-check
/**
 * HTTP integration for each workflow handler path (supertest + service mocks).
 * Asserts routing, token/challenge gates, form guards, and success/error views
 * without requiring Postgres or SMTP.
 */

import { log } from "@dwtechs/winstan";
import { jest } from "@jest/globals";
import request from "supertest";
import { csrfForm } from "./helpers/form.js";

process.env.PWD_SECRET = "test-secret-for-unit-tests-only";
process.env.WEB_PUBLIC_ORIGIN = "http://localhost:8100";
process.env.WEB_PUBLIC_BASE = "/api/foxnox/web";

const issueWorkflowNotification = jest.fn(async () => ({ issued: true }));
const findValidWorkflowToken = jest.fn();
const consumeWorkflowToken = jest.fn(async () => {});
const bumpWorkflowTokenAttempts = jest.fn(async () => {});

const findValidLoginChallenge = jest.fn();
const consumeLoginChallenge = jest.fn(async () => {});
const bumpLoginChallengeAttempts = jest.fn(async () => {});
const createLoginChallenge = jest.fn(async () => ({
  id: 99,
  kind: "trusted-device",
  challenge: "next-challenge",
  path: "/trusted-devices/prompt",
  url: "http://localhost:8100/api/foxnox/web/trusted-devices/prompt?challenge=next-challenge",
  expiresAt: new Date(Date.now() + 60_000),
  typeName: "Trusted device challenge",
}));

const rotatePassword = jest.fn(async () => {});
const recoverPassword = jest.fn(async () => {});
const unlockAccount = jest.fn(async () => {});
const passwordMeetsPolicy = jest.fn(async () => true);
const userPolicy = { id: 3, length: 12 };
const getPwdPolicyForUser = jest.fn(async () => userPolicy);
const verifyCurrentPassword = jest.fn(async () => true);
const getPasswordFormPolicy = jest.fn(async () => ({
  minLength: 8,
  maxLength: 64,
}));

const listSecurityQuestionCatalog = jest.fn(async () => [
  { id: 1, label: "Q1", categoryId: 1 },
  { id: 2, label: "Q2", categoryId: 1 },
  { id: 3, label: "Q3", categoryId: 1 },
]);
const listEnrolledSecurityQuestions = jest.fn(async () => [
  { id: 1, label: "Q1" },
  { id: 2, label: "Q2" },
]);
const hasEnrolledSecurityAnswers = jest.fn(async () => false);
const getSecurityQuestionsByIds = jest.fn(async (ids) =>
  ids.map((id) => ({ id: Number(id), label: `Q${id}` })),
);
const emptyQuestionSlots = jest.fn((n = 3) =>
  Array.from({ length: n }, (_, i) => ({ slot: i + 1 })),
);
const saveSecurityAnswers = jest.fn(async () => {});

jest.unstable_mockModule("../src/web/issue-notification.js", () => ({
  issueWorkflowNotification,
}));

jest.unstable_mockModule("../src/services/token.js", () => ({
  TOKEN_TYPES: Object.freeze({
    PASSWORD_RESET: "Password reset",
    ACCOUNT_RECOVERY: "Account recovery",
    ACCOUNT_UNLOCK: "Account unlock",
    TWO_FA_CHALLENGE: "2FA challenge",
    EXPIRED_PASSWORD_CHALLENGE: "Expired password challenge",
    TRUSTED_DEVICE_CHALLENGE: "Trusted device challenge",
  }),
  findValidWorkflowToken,
  consumeWorkflowToken,
  bumpWorkflowTokenAttempts,
  createWorkflowToken: jest.fn(),
  hashToken: jest.fn(),
  archiveTokensForPasswords: jest.fn(),
}));

jest.unstable_mockModule("../src/services/challenge.js", () => ({
  CHALLENGE_KINDS: {},
  isChallengeKind: jest.fn(),
  isHttpMintableChallengeKind: jest.fn(),
  getChallengeSpec: jest.fn(),
  findValidLoginChallenge,
  consumeLoginChallenge,
  bumpLoginChallengeAttempts,
  createLoginChallenge,
}));

jest.unstable_mockModule("../src/services/pwd.js", () => ({
  rotatePassword,
  recoverPassword,
  recordFailedAttempt: jest.fn(async () => {}),
  resetFailedAttempts: jest.fn(async () => {}),
  unlockAccount,
  passwordMeetsPolicy,
  getPasswordFormPolicy,
  getPwdPolicyForUser,
  getFirstActivePwdPolicy: jest.fn(),
  getPwdAuthState: jest.fn(async () => ({
    id: 1,
    userId: 55,
    twoFactorEnabled: false,
    pwdExpiry: null,
    lockedUntil: null,
    failedAttempts: 0,
  })),
  getTwoFactorSecret: jest.fn(async () => "JBSWY3DPEHPK3PXP"),
  enableTwoFactor: jest.fn(async () => {}),
  disableTwoFactor: jest.fn(async () => {}),
  verifyCurrentPassword,
  recordLastLogin: jest.fn(async () => {}),
}));

jest.unstable_mockModule("../src/services/security-questions.js", () => ({
  listSecurityQuestionCatalog,
  listEnrolledSecurityQuestions,
  hasEnrolledSecurityAnswers,
  getSecurityQuestionsByIds,
  emptyQuestionSlots,
  saveSecurityAnswers,
  verifySecurityAnswers: jest.fn(async () => true),
  hashSecurityAnswer: jest.fn(async () => "hash"),
}));

jest.unstable_mockModule("../src/services/totp.js", () => ({
  generateTotpSecret: jest.fn(() => "JBSWY3DPEHPK3PXP"),
  buildOtpauthUri: jest.fn(
    () => "otpauth://totp/Foxnox:55?secret=JBSWY3DPEHPK3PXP",
  ),
  verifyTotpCode: jest.fn(() => true),
}));

jest.unstable_mockModule("../src/services/devices.js", () => ({
  getTrustedDeviceCookieName: () => "trusted_device",
  mintTrustedDeviceToken: jest.fn(() => ({
    plaintext: "devicetok",
    hash: "devicehash",
    expiresAt: new Date(Date.now() + 86_400_000),
  })),
  createTrustedDevice: jest.fn(async () => ({ id: 1 })),
  verifyTrustedDevice: jest.fn(async () => true),
  listTrustedDevices: jest.fn(async () => [
    {
      id: 1,
      deviceName: "Office laptop",
      lastUsedAt: "2026-08-17",
      expiresAt: "2026-11-17",
    },
  ]),
  archiveTrustedDevice: jest.fn(async () => true),
}));

jest.unstable_mockModule("../src/web/login-resume.js", () => ({
  getLoginResumeBaseUrl: () => "http://localhost:8100/foxnox/login",
  buildLoginResumeUrl: jest.fn(
    async () => "http://localhost:8100/foxnox/login?ticket=resume-ticket",
  ),
  redeemLoginResumeTicket: jest.fn(async () => ({ userId: 55 })),
}));

// Keep the assembled app and its entities real; stop I/O at the pool boundary.
jest.unstable_mockModule("pg-pool", () => ({
  default: class {
    async query() {
      return { rows: [], rowCount: 0 };
    }
  },
}));

const { WEB_MOUNT } = await import("../src/web/engine.js");
const { default: app } = await import("../src/app.js");
const base = WEB_MOUNT;

/**
 * @param {string} path
 * @param {Record<string, unknown>} [fields]
 * @param {Record<string, string>} [headers]
 */
function post(path, fields = {}, headers = {}) {
  const { cookie, body } = csrfForm(fields);
  const req = request(app)
    .post(`${base}${path}`)
    .set("Cookie", cookie)
    .set("Content-Type", "application/x-www-form-urlencoded");
  for (const [k, v] of Object.entries(headers)) req.set(k, v);
  return req.send(body);
}

const validToken = {
  id: 10,
  userId: 55,
  attempts: 0,
  maxAttempts: 3,
  expiresAt: new Date(Date.now() + 60_000),
};

beforeEach(() => {
  jest.clearAllMocks();
  recoverPassword.mockReset().mockResolvedValue(undefined);
  consumeWorkflowToken.mockReset().mockResolvedValue(undefined);
  findValidWorkflowToken.mockResolvedValue(validToken);
  findValidLoginChallenge.mockResolvedValue(validToken);
  passwordMeetsPolicy.mockResolvedValue(true);
  verifyCurrentPassword.mockResolvedValue(true);
  hasEnrolledSecurityAnswers.mockResolvedValue(false);
  getPasswordFormPolicy.mockResolvedValue({ minLength: 8, maxLength: 64 });
  listEnrolledSecurityQuestions.mockResolvedValue([
    { id: 1, label: "Q1" },
    { id: 2, label: "Q2" },
  ]);
  listSecurityQuestionCatalog.mockResolvedValue([
    { id: 1, label: "Q1", categoryId: 1 },
    { id: 2, label: "Q2", categoryId: 1 },
    { id: 3, label: "Q3", categoryId: 1 },
  ]);
  createLoginChallenge.mockResolvedValue({
    id: 99,
    kind: "trusted-device",
    challenge: "next-challenge",
    path: "/trusted-devices/prompt",
    url: "http://localhost:8100/api/foxnox/web/trusted-devices/prompt?challenge=next-challenge",
    expiresAt: new Date(Date.now() + 60_000),
    typeName: "Trusted device challenge",
  });
});

describe("password recover", () => {
  it("GET /recover renders request form with CSRF field", async () => {
    const res = await request(app).get(`${base}/recover`);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/email/i);
    expect(res.text).toMatch(/name="csrf"/);
    expect(res.headers["set-cookie"]?.join(";") || "").toMatch(/foxnox_csrf=/);
  });

  it("POST /recover rejects missing CSRF", async () => {
    const res = await request(app)
      .post(`${base}/recover`)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send(`email=user@example.com&rendered_at=${Date.now() - 2000}`);
    expect(res.status).toBe(403);
    expect(issueWorkflowNotification).not.toHaveBeenCalled();
  });

  it("POST /recover returns 204 for honeypot", async () => {
    const res = await post("/recover", {
      email: "a@b.co",
      website: "http://bot",
    });
    expect(res.status).toBe(204);
    expect(issueWorkflowNotification).not.toHaveBeenCalled();
  });

  it("POST /recover issues notification and redirects to sent page", async () => {
    const res = await post("/recover", { email: "user@example.com" });
    expect(res.status).toBe(303);
    expect(res.headers.location).toMatch(/\/recover\/sent$/);
    expect(issueWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        typeName: "Password reset",
        path: "/recover/reset",
        template: "pwd-reset",
      }),
    );
  });

  it("GET /recover/sent shows sent page without sending email", async () => {
    const res = await request(app).get(`${base}/recover/sent`);
    expect(res.status).toBe(200);
    expect(issueWorkflowNotification).not.toHaveBeenCalled();
  });

  it("GET /recover/reset rejects missing/invalid token", async () => {
    findValidWorkflowToken.mockResolvedValue(null);
    const missing = await request(app).get(`${base}/recover/reset`);
    expect(missing.status).toBe(400);

    const bad = await request(app).get(`${base}/recover/reset?token=bad`);
    expect(bad.status).toBe(400);
  });

  it("GET /recover/reset shows form for valid token", async () => {
    const res = await request(app).get(`${base}/recover/reset?token=plain`);
    expect(res.status).toBe(200);
    expect(findValidWorkflowToken).toHaveBeenCalledWith({
      plaintext: "plain",
      typeName: "Password reset",
    });
    expect(getPasswordFormPolicy).toHaveBeenCalledWith(55);
  });

  it("POST /recover/reset recovers password before consuming token", async () => {
    const res = await post("/recover/reset", {
      token: "plain",
      password: "GoodPass1!",
      confirm: "GoodPass1!",
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("Your password has been changed.");
    expect(getPwdPolicyForUser).toHaveBeenCalledWith(55);
    expect(passwordMeetsPolicy).toHaveBeenCalledWith("GoodPass1!", userPolicy);
    expect(recoverPassword).toHaveBeenCalledWith(55, "GoodPass1!");
    expect(rotatePassword).not.toHaveBeenCalled();
    expect(consumeWorkflowToken).toHaveBeenCalledWith(10);
    expect(recoverPassword.mock.invocationCallOrder[0]).toBeLessThan(
      consumeWorkflowToken.mock.invocationCallOrder[0],
    );
  });

  it("POST /recover/reset rejects mismatched passwords", async () => {
    const res = await post("/recover/reset", {
      token: "plain",
      password: "GoodPass1!",
      confirm: "other",
    });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("Passwords do not match.");
    expect(recoverPassword).not.toHaveBeenCalled();
    expect(rotatePassword).not.toHaveBeenCalled();
    expect(consumeWorkflowToken).not.toHaveBeenCalled();
  });

  it.each(["USER_UNAVAILABLE", "PWD_NOT_FOUND", "WEAK_PASSWORD", "UNEXPECTED"])(
    "POST /recover/reset handles %s without consuming the token",
    async (code) => {
      const error = Object.assign(new Error("recovery boundary failed"), {
        code,
      });
      recoverPassword.mockRejectedValueOnce(error);
      const logged = jest.spyOn(log, "error").mockImplementation(() => {});
      try {
        const res = await post("/recover/reset", {
          token: "plain",
          password: "GoodPass1!",
          confirm: "GoodPass1!",
        });
        expect(res.status).toBe(code === "UNEXPECTED" ? 500 : 400);
        expect(res.headers["content-type"]).toMatch(/text\/html/);
        expect(res.text).toContain(
          code === "WEAK_PASSWORD"
            ? "Password does not meet the security policy."
            : "This link is no longer valid",
        );
        expect(recoverPassword).toHaveBeenCalledWith(55, "GoodPass1!");
        expect(rotatePassword).not.toHaveBeenCalled();
        expect(consumeWorkflowToken).not.toHaveBeenCalled();
        if (code === "UNEXPECTED")
          expect(logged).toHaveBeenCalledWith(
            expect.stringContaining(
              "Password recovery failed userId=55: recovery boundary failed",
            ),
          );
      } finally {
        logged.mockRestore();
      }
    },
  );

  it("POST /recover/reset rejects weak passwords before writing", async () => {
    passwordMeetsPolicy.mockResolvedValueOnce(false);
    const res = await post("/recover/reset", {
      token: "plain",
      password: "weak",
      confirm: "weak",
    });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("Password does not meet the security policy.");
    expect(recoverPassword).not.toHaveBeenCalled();
    expect(consumeWorkflowToken).not.toHaveBeenCalled();
  });
});

describe("unlock", () => {
  it("POST /unlock issues unlock notification", async () => {
    const res = await post("/unlock", { email: "locked@example.com" });
    expect(res.status).toBe(303);
    expect(res.headers.location).toMatch(/\/unlock\/sent$/);
    expect(issueWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        typeName: "Account unlock",
        template: "account-unlock",
        path: "/unlock/confirm",
      }),
    );
  });

  it("GET /unlock/confirm unlocks and consumes token", async () => {
    const res = await request(app).get(`${base}/unlock/confirm?token=plain`);
    expect(res.status).toBe(200);
    expect(unlockAccount).toHaveBeenCalledWith(55);
    expect(consumeWorkflowToken).toHaveBeenCalledWith(10);
  });

  it("GET /unlock/confirm rejects invalid token", async () => {
    findValidWorkflowToken.mockResolvedValue(null);
    const res = await request(app).get(`${base}/unlock/confirm?token=bad`);
    expect(res.status).toBe(400);
    expect(unlockAccount).not.toHaveBeenCalled();
  });
});

describe("account recover", () => {
  it("POST /account-recover issues recovery notification", async () => {
    const res = await post("/account-recover", {
      email: "lost2fa@example.com",
    });
    expect(res.status).toBe(303);
    expect(res.headers.location).toMatch(/\/account-recover\/sent$/);
    expect(issueWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        typeName: "Account recovery",
        template: "account-recover",
      }),
    );
  });

  it("GET /account-recover/challenge loads enrolled questions", async () => {
    const res = await request(app).get(
      `${base}/account-recover/challenge?token=plain`,
    );
    expect(res.status).toBe(200);
    expect(listEnrolledSecurityQuestions).toHaveBeenCalledWith(55, "en");
  });

  it("POST /account-recover/challenge consumes token on answers", async () => {
    const res = await post("/account-recover/challenge", {
      token: "plain",
      questionIds: ["1", "2"],
      answers: ["a", "b"],
    });
    expect(res.status).toBe(200);
    expect(consumeWorkflowToken).toHaveBeenCalledWith(10);
  });

  it("POST /account-recover/challenge bumps attempts on empty answers", async () => {
    const res = await post("/account-recover/challenge", {
      token: "plain",
      questionIds: ["1"],
      answers: [""],
    });
    expect(res.status).toBe(400);
    expect(bumpWorkflowTokenAttempts).toHaveBeenCalledWith(10);
    expect(consumeWorkflowToken).not.toHaveBeenCalled();
  });
});

describe("2FA", () => {
  it("GET /2fa/verify requires a valid challenge", async () => {
    findValidLoginChallenge.mockResolvedValue(null);
    const res = await request(app).get(`${base}/2fa/verify?challenge=bad`);
    expect(res.status).toBe(400);
  });

  it("POST /2fa/verify consumes challenge and redirects to trusted-device", async () => {
    const res = await post("/2fa/verify", {
      challenge: "ch",
      code: "123456",
    });
    expect(res.status).toBe(303);
    expect(consumeLoginChallenge).toHaveBeenCalledWith(10);
    expect(bumpLoginChallengeAttempts).not.toHaveBeenCalled();
    expect(createLoginChallenge).toHaveBeenCalledWith({
      userId: 55,
      kind: "trusted-device",
    });
    expect(res.headers.location).toContain("/trusted-devices/prompt");
  });

  it("POST /2fa/verify rejects invalid TOTP", async () => {
    const totp = await import("../src/services/totp.js");
    totp.verifyTotpCode.mockReturnValueOnce(false);
    const res = await post("/2fa/verify", { challenge: "ch", code: "000000" });
    expect(res.status).toBe(400);
    expect(bumpLoginChallengeAttempts).toHaveBeenCalledWith(10);
    expect(consumeLoginChallenge).not.toHaveBeenCalled();
  });

  it("POST /2fa/setup accepts a valid TOTP when authenticated", async () => {
    const res = await post(
      "/2fa/setup",
      { code: "654321", secret: "JBSWY3DPEHPK3PXP", setupToken: "s" },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(200);
  });
});

describe("expired password", () => {
  it("GET /password/expired requires valid challenge", async () => {
    findValidLoginChallenge.mockResolvedValue(null);
    const res = await request(app).get(
      `${base}/password/expired?challenge=bad`,
    );
    expect(res.status).toBe(400);
  });

  it("POST /password/expired rotates and consumes challenge", async () => {
    const res = await post("/password/expired", {
      challenge: "ch",
      password: "GoodPass1!",
      confirm: "GoodPass1!",
    });
    expect(res.status).toBe(303);
    expect(rotatePassword).toHaveBeenCalledWith(55, "GoodPass1!");
    expect(consumeLoginChallenge).toHaveBeenCalledWith(10);
    expect(res.headers.location).toContain("/foxnox/login?ticket=");
  });
});

describe("trusted devices", () => {
  it("GET /trusted-devices/prompt requires valid challenge", async () => {
    findValidLoginChallenge.mockResolvedValue(null);
    const res = await request(app).get(
      `${base}/trusted-devices/prompt?challenge=bad`,
    );
    expect(res.status).toBe(400);
  });

  it("POST /trusted-devices/prompt consumes challenge on trust=yes", async () => {
    const res = await post("/trusted-devices/prompt", {
      challenge: "ch",
      trust: "yes",
    });
    expect(res.status).toBe(303);
    expect(consumeLoginChallenge).toHaveBeenCalledWith(10);
    expect(res.headers.location).toContain("/foxnox/login?ticket=");
  });

  it("POST /trusted-devices/prompt skips device save when trust=no", async () => {
    const res = await post("/trusted-devices/prompt", {
      challenge: "ch",
      trust: "no",
    });
    expect(res.status).toBe(303);
    expect(consumeLoginChallenge).toHaveBeenCalledWith(10);
    expect(res.headers.location).toContain("/foxnox/login?ticket=");
  });

  it("GET /trusted-devices shows manage page when authenticated", async () => {
    const res = await request(app)
      .get(`${base}/trusted-devices`)
      .set("x-consumer-user-id", "55");
    expect(res.status).toBe(200);
  });

  it("POST /trusted-devices revokes a device id", async () => {
    const res = await post(
      "/trusted-devices",
      { deviceId: "1" },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(200);
  });
});

describe("security questions", () => {
  it("GET /security-questions loads catalog when authenticated", async () => {
    const res = await request(app)
      .get(`${base}/security-questions`)
      .set("x-consumer-user-id", "55");
    expect(res.status).toBe(200);
    expect(listSecurityQuestionCatalog).toHaveBeenCalled();
  });

  it("POST /security-questions rejects incomplete enrollment", async () => {
    const res = await post(
      "/security-questions",
      {
        questionIds: ["1", "2"],
        answers: ["a", "b"],
      },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(400);
  });

  it("POST /security-questions accepts three distinct catalog answers", async () => {
    const res = await post(
      "/security-questions",
      {
        questionIds: ["1", "2", "3"],
        answers: ["a", "b", "c"],
      },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(200);
    expect(saveSecurityAnswers).toHaveBeenCalled();
    expect(verifyCurrentPassword).not.toHaveBeenCalled();
  });

  it("should reject replacing enrolled answers without the current password", async () => {
    hasEnrolledSecurityAnswers.mockResolvedValue(true);
    const res = await post(
      "/security-questions",
      {
        questionIds: ["1", "2", "3"],
        answers: ["a", "b", "c"],
      },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(400);
    expect(saveSecurityAnswers).not.toHaveBeenCalled();
  });

  it("should reject replacing enrolled answers when the current password is wrong", async () => {
    hasEnrolledSecurityAnswers.mockResolvedValue(true);
    verifyCurrentPassword.mockResolvedValue(false);
    const res = await post(
      "/security-questions",
      {
        questionIds: ["1", "2", "3"],
        answers: ["a", "b", "c"],
        password: "WrongPass1!",
      },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(400);
    expect(saveSecurityAnswers).not.toHaveBeenCalled();
  });

  it("should replace enrolled answers when the current password matches", async () => {
    hasEnrolledSecurityAnswers.mockResolvedValue(true);
    verifyCurrentPassword.mockResolvedValue(true);
    const res = await post(
      "/security-questions",
      {
        questionIds: ["1", "2", "3"],
        answers: ["a", "b", "c"],
        password: "CurrentPass1!",
      },
      { "x-consumer-user-id": "55" },
    );
    expect(res.status).toBe(200);
    expect(verifyCurrentPassword).toHaveBeenCalledWith(55, "CurrentPass1!");
    expect(saveSecurityAnswers).toHaveBeenCalled();
  });
});
