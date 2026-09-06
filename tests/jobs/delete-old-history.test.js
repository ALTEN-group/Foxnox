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

describe("startDeleteOldHistoryJob", () => {
  let startDeleteOldHistoryJob;

  beforeAll(async () => {
    const module = await import("../../src/jobs/delete-old-history.js");
    startDeleteOldHistoryJob = module.startDeleteOldHistoryJob;
  });

  beforeEach(() => {
    scheduleDailyAt.mockReset();
    executeJob.mockReset();
    log.info.mockReset();
    log.error.mockReset();
  });

  it("should register the job to run daily at 3 AM UTC", () => {
    startDeleteOldHistoryJob();

    expect(scheduleDailyAt).toHaveBeenCalledWith(3, expect.any(Function));
    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("initialized"),
    );
  });

  it("should delete history rows older than 6 months and log the count", async () => {
    executeJob.mockResolvedValue({ rowCount: 42 });
    startDeleteOldHistoryJob();
    const callback = scheduleDailyAt.mock.calls[0][1];

    await callback();

    expect(executeJob).toHaveBeenCalledWith(
      "DELETE FROM log.history WHERE tstamp < $1",
      [expect.any(Date)],
    );
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining("42"));
  });

  it("should log a query failure without throwing", async () => {
    executeJob.mockRejectedValue(new Error("db down"));
    startDeleteOldHistoryJob();
    const callback = scheduleDailyAt.mock.calls[0][1];

    await expect(callback()).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("db down"));
  });
});
