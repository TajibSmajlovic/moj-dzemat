import pino from "pino";

import { env } from "#app/utils/env.server";

/**
 * Structured JSON logger writing to stdout. Fly.io already aggregates
 * stdout, so we don't ship a transport. Request-scoped loggers are
 * created in the Express layer via `.child({ requestId })`.
 */
export const logger = pino({
  level: env().NODE_ENV === "production" ? "info" : "debug",
  // Strip the cookie and authorization headers from every log line so
  // session ids / reset tokens can't leak into log storage.
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "headers.cookie",
      "headers.authorization",
      "*.password",
      "*.hash",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: "moj-dzemat",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
