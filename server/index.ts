import type { ServerBuild } from "react-router";

import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import crypto from "node:crypto";

import { ROUTES } from "../app/lib/routes";
import { DAY_SECONDS } from "../app/lib/time";
import { env } from "../app/server/env.server";
import { MAX_REQUEST_BYTES } from "../app/server/limits.server";
import { logger } from "../app/server/logger.server";
import { clientIpFromHeaders, staticFileLimiter } from "../app/server/rate-limit.server";
import { securityHeaders } from "../app/server/security.server";

// Attach a request-scoped child logger to every Express request. Declared
// once here so downstream middleware and the Express error handler can read
// `req.log` without per-call type casts. Optional because the property is only
// populated after the request-id middleware below has run.
declare module "express-serve-static-core" {
  // Module augmentation requires `interface` for declaration merging;
  // a type alias cannot extend the upstream `Request`.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Request {
    log?: typeof logger;
  }
}

const { APP_URL, NODE_ENV, PORT } = env();
const isProd = NODE_ENV === "production";
const HEALTHCHECK_PATH = ROUTES.healthcheck;
const HEALTH_PATHS = new Set<string>([ROUTES.healthcheck, ROUTES.readiness]);
const canonicalUrl = new URL(APP_URL);
const canonicalHost = canonicalUrl.host.toLowerCase();

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clientIp(req: express.Request): string {
  const fromHeaders = clientIpFromHeaders((name) => firstHeaderValue(req.headers[name]));
  // `clientIpFromHeaders` returns "unknown" when no proxy header matched;
  // prefer Express's own `req.ip` (set via `trust proxy`) in that case.
  return fromHeaders === "unknown" ? (req.ip ?? "unknown") : fromHeaders;
}

function rateLimitStaticFiles(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const limit = staticFileLimiter.check(clientIp(req));
  if (limit.ok) return next();

  res.setHeader("Retry-After", Math.ceil(limit.resetInMs / 1000).toString());
  res.status(429).send("Too many requests");
}

async function createServer(): Promise<express.Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(compression());

  // Request id + baseline security headers. We set the id on every
  // response and reuse it from the incoming header when Fly provides
  // one so log lines trace across the edge.
  app.use((req, res, next) => {
    const requestId =
      (req.headers["fly-request-id"] as string | undefined) ??
      (req.headers["x-request-id"] as string | undefined) ??
      crypto.randomUUID();
    res.setHeader("X-Request-Id", requestId);

    for (const [key, value] of Object.entries(securityHeaders({ isProd }))) {
      res.setHeader(key, value);
    }

    const requestLog = logger.child({
      requestId,
      method: req.method,
      path: req.path,
    });
    req.log = requestLog;

    const logCompletion =
      !HEALTH_PATHS.has(req.path) &&
      !req.path.startsWith("/assets/") &&
      !req.path.startsWith("/.well-known/") &&
      req.path !== "/logo.svg";

    if (logCompletion) {
      const startedAt = performance.now();
      let finished = false;

      res.once("finish", () => {
        finished = true;
        const details = {
          statusCode: res.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        };

        if (res.statusCode >= 500) {
          requestLog.error(details, "request completed");
        } else {
          requestLog.info(details, "request completed");
        }
      });

      res.once("close", () => {
        if (finished) return;

        requestLog.warn(
          { durationMs: Math.round(performance.now() - startedAt) },
          "request aborted",
        );
      });
    }

    next();
  });

  // Drop oversized payloads early - RR parses FormData itself, but Node
  // will hold the full body in memory before our loader/action sees it,
  // so we short-circuit based on Content-Length. This runs after request
  // instrumentation so rejected requests still get security headers and logs.
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();

    const contentLength = Number(req.headers["content-length"] ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      res.status(413).send("Payload too large");
      return;
    }
    next();
  });

  app.use((req, res, next) => {
    if (HEALTH_PATHS.has(req.path)) return next();

    const requestHost = req.get("host")?.toLowerCase();
    if (!requestHost || requestHost === canonicalHost) return next();
    if (!isProd) return next();

    const target = new URL(req.originalUrl, canonicalUrl);
    req.log?.info(
      {
        fromHost: requestHost,
        toHost: canonicalHost,
        path: req.path,
        statusCode: 308,
      },
      "canonical host redirect",
    );

    return res.redirect(308, target.toString());
  });

  // Shallow liveness probe: this only confirms that Node + Express can
  // respond. Fly routes traffic based on the separate readiness resource.
  app.get(HEALTHCHECK_PATH, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send("alive");
  });

  // Chrome DevTools probes this on every page load (Chrome 128+).
  // Short-circuit it so React Router doesn't log a noisy 404.
  app.get("/.well-known/{*path}", (_req, res) => {
    res.status(404).end();
  });

  if (isProd) {
    // React Router's production assets live under `build/client`. Assets
    // are fingerprinted so we can set aggressive caching; HTML/other
    // static files get a shorter TTL.
    app.use(
      "/assets",
      rateLimitStaticFiles,
      express.static("build/client/assets", {
        immutable: true,
        maxAge: "1y",
      }),
    );
    app.get("/logo.svg", rateLimitStaticFiles, (_req, res) => {
      res.setHeader("Cache-Control", `public, max-age=${7 * DAY_SECONDS}`);
      res.sendFile("logo.svg", { root: "build/client" });
    });
    app.use(rateLimitStaticFiles, express.static("build/client", { maxAge: "1h" }));

    // `build/server/index.js` is produced by `react-router build`. Imported
    // with a dynamic import so tsx doesn't try to parse it at startup if
    // the build step hasn't run yet.
    const build = (await import(
      /* @vite-ignore */ `${process.cwd()}/build/server/index.js`
    )) as unknown as ServerBuild;
    app.all(
      "/{*splat}",
      createRequestHandler({
        build,
        mode: "production",
      }),
    );
  } else {
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(viteDevServer.middlewares);
    app.all(
      "/{*splat}",
      createRequestHandler({
        build: () =>
          viteDevServer.ssrLoadModule(
            "virtual:react-router/server-build",
          ) as unknown as Promise<ServerBuild>,
        mode: "development",
      }),
    );
  }

  // Last-resort error handler. RR normally handles errors inside its own
  // ErrorBoundary, but if Express middleware itself throws we don't want
  // stack traces leaking out.
  app.use(
    (error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      req.log?.error({ err: error }, "unhandled server error");
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    },
  );

  return app;
}

async function startServer(): Promise<void> {
  const app = await createServer();
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: NODE_ENV }, "server ready");
  });

  let shuttingDown = false;

  function shutdown(signal: NodeJS.Signals) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "server shutdown started");
    server.close((error) => {
      if (error) {
        logger.error({ err: error, signal }, "server shutdown failed");
        process.exit(1);
      }

      logger.info({ signal }, "server shutdown completed");
      process.exit(0);
    });
  }

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error: unknown) => {
  logger.error({ err: error }, "failed to start server");
  process.exit(1);
});
