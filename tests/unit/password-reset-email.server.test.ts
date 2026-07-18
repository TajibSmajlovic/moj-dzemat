import { describe, expect, it } from "vitest";

import { PASSWORD_RESET_TOKEN_TTL_LABEL } from "#app/features/auth/auth-policy";
import { passwordResetHref } from "#app/features/auth/auth-routes";
import { buildPasswordResetEmail } from "#app/features/auth/password-reset-email.server";

describe("buildPasswordResetEmail", () => {
  it("builds a branded password reset email with a button and fallback link", () => {
    const resetUrl = `https://mojdzematdonjemostre.ba${passwordResetHref("signed-token")}`;
    const email = buildPasswordResetEmail({
      resetUrl,
      siteName: "Moj Džemat - Donje Moštre",
    });

    expect(email.subject).toBe("Postavljanje nove lozinke");
    expect(email.text).toContain("Postavite novu lozinku");
    expect(email.text).toContain(`Link vrijedi ${PASSWORD_RESET_TOKEN_TTL_LABEL}`);
    expect(email.text).toContain(resetUrl);
    expect(email.html).toContain("Moj Džemat - Donje Moštre");
    expect(email.html).toContain("Postavi novu lozinku");
    expect(email.html).toContain(`href="${resetUrl}"`);
    expect(email.html).toContain("Ako dugme ne radi");
  });

  it("escapes interpolated HTML values", () => {
    const resetUrl = 'https://example.test/nova-lozinka/<token>"&x=1';
    const email = buildPasswordResetEmail({
      resetUrl,
      siteName: 'Moj <Džemat> & "test"',
    });

    expect(email.html).toContain("Moj &lt;Džemat&gt; &amp; &quot;test&quot;");
    expect(email.html).toContain(
      'href="https://example.test/nova-lozinka/&lt;token&gt;&quot;&amp;x=1"',
    );
    expect(email.html).not.toContain("Moj <Džemat>");
    expect(email.html).not.toContain(`href="${resetUrl}"`);
  });
});
