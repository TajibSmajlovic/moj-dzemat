import { describe, expect, it } from "vitest";

import { sanitizePostBody } from "#app/features/posts/post-sanitize.server";

/**
 * The sanitizer is the single trust boundary between admin input and
 * public render. These tests pin down both the allowlist (what survives)
 * and the denylist (what gets stripped) so a future regression on
 * either axis would scream loudly.
 */

describe("sanitizePostBody", () => {
  describe("XSS denylist", () => {
    it("strips <script> tags entirely, including their text", () => {
      expect(sanitizePostBody("<p>safe</p><script>alert(1)</script>")).toBe("<p>safe</p>");
    });

    it("strips nested <script> obfuscation", () => {
      // Malformed input may leave residual text behind, but no executable
      // tag may survive. Only the absence of script tags matters for XSS.
      const out = sanitizePostBody("<scr<script>ipt>alert(1)</script>");
      expect(out).not.toContain("<script");
      expect(out).not.toContain("</script");
    });

    it("strips <iframe>", () => {
      const result = sanitizePostBody('<iframe src="https://evil.example"></iframe>safe');
      expect(result).not.toContain("iframe");
      expect(result).toContain("safe");
    });

    it("strips on* event handlers (quoted)", () => {
      const result = sanitizePostBody(`<p onclick="alert(1)">x</p>`);
      expect(result).toBe("<p>x</p>");
    });

    it("strips on* event handlers (unquoted) - the original regex bypass", () => {
      const result = sanitizePostBody("<p onclick=alert(1)>x</p>");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert");
    });

    it("strips <svg onload> - the original regex bypass", () => {
      const result = sanitizePostBody("<p>x</p><svg onload=alert(1)></svg>");
      expect(result).not.toContain("svg");
      expect(result).not.toContain("onload");
    });

    it("strips <img onerror> - the original regex bypass", () => {
      const result = sanitizePostBody('<img src=x onerror="alert(1)">');
      expect(result).not.toContain("img");
      expect(result).not.toContain("onerror");
    });

    it("rejects javascript: hrefs - the original regex bypass", () => {
      const result = sanitizePostBody('<a href="javascript:alert(1)">click</a>');
      expect(result).not.toContain("javascript");
      expect(result).not.toContain("alert");
    });

    it("rejects data: hrefs", () => {
      const result = sanitizePostBody(
        '<a href="data:text/html,<script>alert(1)</script>">click</a>',
      );
      expect(result).not.toContain("data:");
      expect(result).not.toContain("script");
    });

    it("rejects vbscript: hrefs", () => {
      const result = sanitizePostBody('<a href="vbscript:msgbox(1)">click</a>');
      expect(result).not.toContain("vbscript");
    });

    it("rejects javascript: with leading whitespace and case mix", () => {
      const result = sanitizePostBody(`<a href="  JaVaScRiPt:alert(1)">x</a>`);
      expect(result).not.toContain("javascript");
      expect(result).not.toContain("JaVaScRiPt");
      expect(result).not.toContain("alert");
    });

    it("strips <style> blocks (CSS-based attacks)", () => {
      const result = sanitizePostBody(
        "<style>body{background:url('javascript:alert(1)')}</style><p>x</p>",
      );
      expect(result).not.toContain("style");
      expect(result).not.toContain("javascript");
      expect(result).toContain("<p>x</p>");
    });

    it("strips <object> and <embed>", () => {
      const result = sanitizePostBody('<object data="evil"></object><embed src="evil">x');
      expect(result).not.toContain("object");
      expect(result).not.toContain("embed");
      expect(result).toContain("x");
    });

    it("strips <meta http-equiv=refresh>", () => {
      const result = sanitizePostBody('<meta http-equiv="refresh" content="0;url=evil"><p>x</p>');
      expect(result).not.toContain("meta");
      expect(result).not.toContain("refresh");
    });

    it("strips arbitrary attributes from allowed tags", () => {
      const result = sanitizePostBody(`<p class="evil" id="evil" data-x="evil">x</p>`);
      expect(result).toBe("<p>x</p>");
    });

    it("strips disallowed style values (e.g. position absolute clickjack)", () => {
      const result = sanitizePostBody(
        `<p style="position: absolute; top: 0; text-align: center">x</p>`,
      );
      expect(result).toContain("text-align:center");
      expect(result).not.toContain("position");
      expect(result).not.toContain("absolute");
    });
  });

  describe("Allowlist - what survives", () => {
    it("preserves StarterKit block tags", () => {
      const html = "<p>p</p><h2>h2</h2><h3>h3</h3><blockquote>q</blockquote>";
      expect(sanitizePostBody(html)).toBe(html);
    });

    it("preserves lists", () => {
      const html = "<ul><li>a</li><li>b</li></ul><ol><li>1</li><li>2</li></ol>";
      expect(sanitizePostBody(html)).toBe(html);
    });

    it("preserves inline formatting", () => {
      const html = "<p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code> <br /></p>";
      const out = sanitizePostBody(html);
      for (const tag of ["<strong>", "<em>", "<u>", "<s>", "<code>", "<br"]) {
        expect(out).toContain(tag);
      }
    });

    it("preserves text-align style", () => {
      const html = `<p style="text-align: center">x</p><h2 style="text-align: right">y</h2>`;
      const out = sanitizePostBody(html);
      expect(out).toContain("text-align:center");
      expect(out).toContain("text-align:right");
    });

    it("rejects bogus text-align values", () => {
      const out = sanitizePostBody(`<p style="text-align: url(x)">x</p>`);
      expect(out).toBe("<p>x</p>");
    });

    it("preserves http and https links and hardens rel/target", () => {
      const out = sanitizePostBody('<a href="https://example.org">link</a>');
      expect(out).toContain('href="https://example.org"');
      expect(out).toContain('rel="noopener noreferrer nofollow"');
      expect(out).toContain('target="_blank"');
    });

    it("preserves mailto: links", () => {
      const out = sanitizePostBody('<a href="mailto:imam@example.org">mail</a>');
      expect(out).toContain('href="mailto:imam@example.org"');
    });
  });

  describe("Plain-text bodies (legacy posts)", () => {
    it("wraps a single line in <p>", () => {
      expect(sanitizePostBody("Selam alejkum.")).toBe("<p>Selam alejkum.</p>");
    });

    it("splits on blank lines into separate paragraphs", () => {
      expect(sanitizePostBody("Prva.\n\nDruga.\n\nTreća.")).toBe(
        "<p>Prva.</p><p>Druga.</p><p>Treća.</p>",
      );
    });

    it("converts single line breaks within a paragraph to <br>", () => {
      expect(sanitizePostBody("Prva\ndruga.")).toBe("<p>Prva<br />druga.</p>");
    });

    it("escapes < and & in plain text instead of allowing tags", () => {
      const out = sanitizePostBody("M&M < N");
      expect(out).toContain("M&amp;M");
      expect(out).toContain("&lt; N");
      expect(out).not.toContain("<n");
    });

    it("strips HTML masquerading as plain text by virtue of leading whitespace", () => {
      // If the first non-whitespace character is `<`, we treat the body
      // as HTML and the sanitizer takes over.
      const out = sanitizePostBody("   <script>alert(1)</script><p>ok</p>");
      expect(out).toBe("<p>ok</p>");
    });
  });

  describe("Edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizePostBody("")).toBe("");
      expect(sanitizePostBody("   \n  ")).toBe("");
    });

    it("normalises non-breaking spaces", () => {
      expect(sanitizePostBody("a\u00A0b")).toBe("<p>a b</p>");
      expect(sanitizePostBody("<p>a&nbsp;b</p>")).toBe("<p>a b</p>");
    });

    it("is idempotent (safe to re-sanitize)", () => {
      const once = sanitizePostBody("<p>hi <strong>world</strong></p>");
      expect(sanitizePostBody(once)).toBe(once);
    });
  });
});
