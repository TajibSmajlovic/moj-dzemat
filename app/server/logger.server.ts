import pino, { type LoggerOptions } from "pino";

import { env } from "#app/server/env.server";

const environment = env();

const loggerOptions: LoggerOptions = {
  level: environment.NODE_ENV === "production" ? "info" : "debug",
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
    component: "web",
    ...(environment.AGENT_RUN_ID ? { runId: environment.AGENT_RUN_ID } : {}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const logger = environment.AGENT_LOG_PATH
  ? pino(
      loggerOptions,
      pino.destination({ dest: environment.AGENT_LOG_PATH, append: true, sync: false }),
    )
  : pino(loggerOptions);
