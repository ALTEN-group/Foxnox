/** @jest-environment node */
// @ts-check
import { jest } from "@jest/globals";

const findUserByEmail = jest.fn();
const createWorkflowToken = jest.fn();
const notifyUser = jest.fn();

jest.unstable_mockModule("../../src/services/users.js", () => ({
  findUserByEmail,
}));

jest.unstable_mockModule("../../src/services/token.js", () => ({
  createWorkflowToken,
}));

jest.unstable_mockModule("../../src/services/notify.js", () => ({
  notifyUser,
}));

jest.unstable_mockModule("../../src/web/deep-link.js", () => ({
  buildDeepLink: () => "http://localhost/recover/reset?token=tok",
}));

const { issueWorkflowNotification } = await import(
  "../../src/web/issue-notification.js"
);

describe("issueWorkflowNotification", () => {
  beforeEach(() => {
    findUserByEmail.mockReset();
    createWorkflowToken.mockReset();
    notifyUser.mockReset();
  });

  it("should return before SMTP so existence is not leaked by latency", async () => {
    let finishNotify;
    notifyUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishNotify = resolve;
        }),
    );
    findUserByEmail.mockResolvedValue({
      id: 3,
      email: "a@example.com",
      nickname: "Ann",
    });
    createWorkflowToken.mockResolvedValue({
      plaintext: "tok",
      expiresAt: new Date("2026-09-06T20:00:00.000Z"),
      typeName: "Password reset",
    });

    const result = await issueWorkflowNotification({
      email: "a@example.com",
      typeName: "Password reset",
      path: "/recover/reset",
      template: "pwd-reset",
      lang: "en",
    });

    expect(result).toEqual({ issued: true });
    expect(notifyUser).not.toHaveBeenCalled();
    for (let i = 0; i < 10 && notifyUser.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }
    expect(notifyUser).toHaveBeenCalled();
    finishNotify();
  });

  it("should not send mail when no user exists", async () => {
    findUserByEmail.mockResolvedValue(null);
    await issueWorkflowNotification({
      email: "missing@example.com",
      typeName: "Password reset",
      path: "/recover/reset",
      template: "pwd-reset",
    });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(createWorkflowToken).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
