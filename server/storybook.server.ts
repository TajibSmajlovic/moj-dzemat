import express from "express";
import path from "node:path";

const STORYBOOK_CSP = [
  "default-src 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  "frame-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
].join("; ");

export function storybookRouter(directory = path.resolve("build/storybook")): express.Router {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set({
      "Content-Security-Policy": STORYBOOK_CSP,
      "X-Frame-Options": "SAMEORIGIN",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-cache",
    });
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD").status(405).end();
      return;
    }
    const [pathname] = req.originalUrl.split("?");
    if (pathname === "/storybook") {
      const query = req.originalUrl.slice(pathname.length);
      res.redirect(308, `/storybook/${query}`);
      return;
    }
    next();
  });
  router.use(
    express.static(directory, {
      redirect: false,
      setHeaders: (res, file) => {
        const relative = path.relative(directory, file).split(path.sep).join("/");
        // Vite hashes preview assets. Manager files and story indexes have stable names.
        const fingerprinted = /^assets\/.+-[\w-]{8}\.(?:js|css|woff2?|svg|png|webp)$/.test(
          relative,
        );
        res.setHeader(
          "Cache-Control",
          fingerprinted ? "public, max-age=31536000, immutable" : "no-cache",
        );
      },
    }),
  );
  router.use((_req, res) => {
    res.status(404).type("text").send("Storybook asset not found");
  });
  return router;
}
