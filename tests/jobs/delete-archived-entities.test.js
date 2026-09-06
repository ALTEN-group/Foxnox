/**
 * @jest-environment node
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schedulerPath = path.join(__dirname, "../../src/jobs/scheduler.js");

const scheduleDailyAt = jest.fn();
jest.unstable_mockModule(schedulerPath, () => ({ scheduleDailyAt }));

const executeJob = jest.fn();
jest.unstable_mockModule("../../src/jobs/job-pool.js", () => ({ executeJob }));

const log = { info: jest.fn(), error: jest.fn() };
jest.unstable_mockModule("@dwtechs/winstan", () => ({ log }));

describe("startDeleteArchivedEntitiesJob", () => {
  let startDeleteArchivedEntitiesJob;

  beforeAll(async () => {
    const module = await import("../../src/jobs/delete-archived-entities.js");
    startDeleteArchivedEntitiesJob = module.startDeleteArchivedEntitiesJob;
  });

  beforeEach(() => {
    scheduleDailyAt.mockReset();
    executeJob.mockReset();
    log.info.mockReset();
    log.error.mockReset();
  });

  it("should register the job to run daily at 2 AM UTC", () => {
    startDeleteArchivedEntitiesJob();

    expect(scheduleDailyAt).toHaveBeenCalledWith(2, expect.any(Function));
    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("initialized"),
    );
  });

  it("should call SQL delete() on each archived table via the job pool", async () => {
    executeJob.mockResolvedValue({ rows: [{ count: 0 }] });
    startDeleteArchivedEntitiesJob();
    const callback = scheduleDailyAt.mock.calls[0][1];

    await callback();

    const tables = executeJob.mock.calls.map(([, args]) => args[1]).sort();
    expect(tables).toEqual(
      ["pwd", "pwd_policy", "token", "user_trusted_device"].sort(),
    );
    for (const [query, args] of executeJob.mock.calls) {
      expect(query).toBe("SELECT delete($1, $2, $3) AS count");
      expect(args[0]).toBe("public");
      const daysAgo =
        (Date.now() - args[2].getTime()) / (24 * 60 * 60 * 1000);
      expect(daysAgo).toBeGreaterThan(55);
      expect(daysAgo).toBeLessThan(65);
    }
  });
});
