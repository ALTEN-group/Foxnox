/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { send } from "../../../src/middlewares/res/send.js";

describe("send middleware", () => {
  const ent = { privateProps: ["pwdHash", "twoFactorSecret"] };
  let res;

  beforeEach(() => {
    res = {
      locals: {},
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    };
  });

  it("should strip the entity's private props from each row", () => {
    res.locals.rows = [
      { id: 1, userId: 3, pwdHash: "secret", twoFactorSecret: "otp" },
    ];
    res.locals.total = 1;

    send(ent)({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      rows: [{ id: 1, userId: 3 }],
      total: 1,
    });
  });

  it("should strip private props from the nested history record snapshot", () => {
    res.locals.rows = [
      {
        id: 1,
        operation: "UPDATE",
        record: {
          id: 7,
          userId: 3,
          pwdHash: "secret",
          twoFactorSecret: "otp",
          failedAttempts: 2,
        },
      },
    ];
    res.locals.total = 1;

    send(ent)({}, res);

    const [{ rows }] = res.json.mock.calls[0];
    expect(rows[0].record).toEqual({ id: 7, userId: 3, failedAttempts: 2 });
    expect(rows[0].record).not.toHaveProperty("pwdHash");
    expect(rows[0].record).not.toHaveProperty("twoFactorSecret");
  });

  it("should leave rows without a record object untouched beyond top-level stripping", () => {
    res.locals.rows = [{ id: 1, record: null }];
    res.locals.total = 1;

    send(ent)({}, res);

    expect(res.json).toHaveBeenCalledWith({
      rows: [{ id: 1, record: null }],
      total: 1,
    });
  });

  it("should leave rows unchanged when the entity has no privateProps", () => {
    res.locals.rows = [{ id: 1, name: "Default" }];
    res.locals.total = 1;

    send({ privateProps: [] })({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      rows: [{ id: 1, name: "Default" }],
      total: 1,
    });
  });

  it("should respond 404 when no handler produced rows", () => {
    send(ent)({}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Not found" });
  });

  describe("x-acl-fields", () => {
    const policyEnt = { privateProps: [] };

    it("should leave rows unrestricted when the header is omitted", () => {
      res.locals.rows = [{ id: 1, name: "Default", length: 8, strict: true }];
      res.locals.total = 1;

      send(policyEnt)({ headers: {} }, res);

      expect(res.json).toHaveBeenCalledWith({
        rows: [{ id: 1, name: "Default", length: 8, strict: true }],
        total: 1,
      });
    });

    it("should project entity rows to the allow-list and always keep id", () => {
      res.locals.rows = [
        { id: 1, name: "Default", length: 8, strict: true, expiryDays: 90 },
      ];
      res.locals.total = 1;

      send(policyEnt)({ headers: { "x-acl-fields": "name,length" } }, res);

      expect(res.json).toHaveBeenCalledWith({
        rows: [{ id: 1, name: "Default", length: 8 }],
        total: 1,
      });
    });

    it("should keep only id when the allow-list is empty", () => {
      res.locals.rows = [{ id: 1, name: "Default", length: 8 }];
      res.locals.total = 1;

      send(policyEnt)({ headers: { "x-acl-fields": "" } }, res);

      expect(res.json).toHaveBeenCalledWith({
        rows: [{ id: 1 }],
        total: 1,
      });
    });

    it("should project nested history records and leave the envelope intact", () => {
      res.locals.rows = [
        {
          id: 9,
          operation: "UPDATE",
          consumerName: "alice",
          record: { id: 7, name: "Default", length: 8, strict: true },
        },
      ];
      res.locals.total = 1;

      send(policyEnt)({ headers: { "x-acl-fields": "name" } }, res);

      expect(res.json).toHaveBeenCalledWith({
        rows: [
          {
            id: 9,
            operation: "UPDATE",
            consumerName: "alice",
            record: { id: 7, name: "Default" },
          },
        ],
        total: 1,
      });
    });

    it("should drop schema descriptors whose key is not allowed", () => {
      res.locals.rows = [
        { key: "id", type: "integer", operations: ["SELECT"] },
        { key: "name", type: "string", operations: ["SELECT"] },
        { key: "strict", type: "boolean", operations: ["SELECT"] },
      ];
      res.locals.total = 3;

      send(policyEnt)({ headers: { "x-acl-fields": "name" } }, res);

      expect(res.json).toHaveBeenCalledWith({
        rows: [
          { key: "id", type: "integer", operations: ["SELECT"] },
          { key: "name", type: "string", operations: ["SELECT"] },
        ],
        total: 2,
      });
    });

    it("should strip private props before applying the allow-list", () => {
      res.locals.rows = [
        { id: 1, userId: 3, pwdHash: "secret", failedAttempts: 2 },
      ];
      res.locals.total = 1;

      send(ent)(
        { headers: { "x-acl-fields": "userId,pwdHash,failedAttempts" } },
        res,
      );

      expect(res.json).toHaveBeenCalledWith({
        rows: [{ id: 1, userId: 3, failedAttempts: 2 }],
        total: 1,
      });
    });
  });
});
