import { afterEach, describe, expect, it, vi } from "vitest";

import { loader } from "#app/routes/resources.readiness";
import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readiness route", () => {
  it("returns ready when the database responds", async () => {
    const response = await loader();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ready");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("returns 503 when the database is unavailable", async () => {
    const error = new Error("database unavailable");
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(error);
    const loggerWarn = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    const response = await loader();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("not ready");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(loggerWarn).toHaveBeenCalledWith({ err: error }, "readiness check failed");
  });
});
