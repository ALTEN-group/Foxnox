/** @jest-environment node */
// @ts-check

import { jest } from "@jest/globals";

const logInfo = jest.fn();

jest.unstable_mockModule("@dwtechs/winstan", () => ({
  log: {
    debug: jest.fn(),
    info: logInfo,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const { notifyUser, _resetNotifyCachesForTests } = await import(
  "../../src/services/notify.js"
);

describe("notify service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    _resetNotifyCachesForTests();
  });

  it("should redact token-bearing variables from fallback logs", async () => {
    const secretToken = "secret-reset-token";
    const secretUrl = `https://example.com/reset?token=${secretToken}`;

    await notifyUser({
      template: "pwd-reset",
      to: "user@example.com",
      lang: "en",
      vars: {
        url: secretUrl,
        nickname: "Ada",
        token: secretToken,
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    });

    expect(logInfo).toHaveBeenCalledTimes(1);
    const message = String(logInfo.mock.calls[0][0]);
    expect(message).toContain("template=pwd-reset");
    expect(message).not.toContain(secretUrl);
    expect(message).not.toContain(secretToken);
    expect(message).not.toContain("vars=");
  });
});
