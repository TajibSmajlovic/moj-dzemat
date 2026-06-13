import { describe, expect, it } from "vitest";

import { securityHeaders } from "#app/server/security.server";

describe("securityHeaders", () => {
  it("adds a production CSP without affecting development", () => {
    expect(securityHeaders({ isProd: false })["Content-Security-Policy"]).toBeUndefined();

    const csp = securityHeaders({ isProd: true })["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-src https://www.youtube-nocookie.com https://www.google.com");
    expect(csp).toContain("https://static.cloudflareinsights.com");
  });
});
