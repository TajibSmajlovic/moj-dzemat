import type { ServerBuild } from "react-router";

import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import crypto from "node:crypto";

import { MAX_REQUEST_BYTES } from "../app/lib/limits";
import { env } from "../app/utils/env.server";
import { logger } from "../app/utils/logger.server";
import { securityHeaders } from "../app/utils/security.server";

// Attach a request-scoped child logger to every Express request. Declared
// once here so route/middleware code can read `req.log` without per-call
// type casts. Optional because the property is only populated after the
// request-id middleware below has run.
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
const HEALTHCHECK_PATH = "/resources/healthcheck";
const canonicalUrl = new URL(APP_URL);
const canonicalHost = canonicalUrl.host.toLowerCase();

async function createServer(): Promise<express.Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(compression());

  // Drop oversized payloads early - RR parses FormData itself, but Node
  // will hold the full body in memory before our loader/action sees it,
  // so we short-circuit based on Content-Length.
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    const contentLength = Number(req.headers["content-length"] ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      res.status(413).send("Payload too large");
      return;
    }
    next();
  });

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

    // Attach a request-scoped child logger so route code can log with
    // consistent metadata (filled in later todos).
    req.log = logger.child({
      requestId,
      method: req.method,
      path: req.path,
    });
    next();
  });

  app.use((req, res, next) => {
    if (req.path === HEALTHCHECK_PATH) return next();

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

  // Liveness + readiness probe. Fly hits this before routing traffic;
  // keep it cheap (no DB call) so we don't flap during a migration.
  app.get(HEALTHCHECK_PATH, (_req, res) => {
    res.status(200).send("ok");
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
      express.static("build/client/assets", {
        immutable: true,
        maxAge: "1y",
      }),
    );
    app.get("/logo.svg", (_req, res) => {
      res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
      res.sendFile("logo.svg", { root: "build/client" });
    });
    app.use(express.static("build/client", { maxAge: "1h" }));

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
        getLoadContext() {
          return {};
        },
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

createServer()
  .then((app) => {
    app.listen(PORT, () => {
      logger.info({ port: PORT, env: NODE_ENV }, "server ready");
    });
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, "failed to start server");
    process.exit(1);
  });
