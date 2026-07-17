import { prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";

const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

export async function loader(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return new Response("ready", { headers: HEADERS });
  } catch (error) {
    logger.warn({ err: error }, "readiness check failed");

    return new Response("not ready", { status: 503, headers: HEADERS });
  }
}
