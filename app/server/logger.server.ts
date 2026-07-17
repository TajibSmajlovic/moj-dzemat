import pino from "pino";

import { env } from "#app/server/env.server";

/**
   Structured JSON logger writing to stdout. Fly.io already aggregates
   stdout, so we don't ship a transport. Request-scoped loggers are
   created in the Express layer via `.child({ requestId })`.
 */
export const logger = pino({
  level: env().NODE_ENV === "production" ? "info" : "debug",
  // Strip secrets and direct personal identifiers from every log line.
  // Keep operational ids (requestId/userId) so incidents remain traceable.
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "headers.cookie",
      "headers.authorization",
      "password",
      "hash",
      "token",
      "email",
      "to",
      "ip",
      "clientIp",
      "search",
      "*.password",
      "*.hash",
      "*.token",
      "*.email",
      "*.to",
      "*.ip",
      "*.clientIp",
      "*.search",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: "moj-dzemat",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
