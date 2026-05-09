import sanitizeHtml from "sanitize-html";

import { normalizeNonBreakingSpaces } from "#app/lib/post-excerpt";

/**
 * Server-side HTML sanitizer for post bodies.
 *
 * The admin rich-text editor (Tiptap StarterKit + Underline + Link +
 * TextAlign + Typography) emits a constrained tag/attribute set. This
 * sanitizer is the canonical write-time gate: every body is normalised
 * here before it touches the DB, so renderers can trust the stored HTML
 * without doing any further filtering.
 *
 * Why server-side:
 *   - the Tiptap Link extension already restricts `javascript:` etc. on
 *     the client, but a malicious admin (or anyone bypassing the editor
 *     via curl/devtools) could still POST raw HTML.
 *   - sanitising at write means a single canonical representation in the
 *     database; render paths just `dangerouslySetInnerHTML` the trusted
 *     value with no regex post-processing.
 *
 * What we accept:
 *   - block: p, h2, h3, blockquote, ul, ol, li, hr, pre
 *   - inline formatting: strong, em, u, s, code, br
 *   - links: a (http/https/mailto only, with rel hardening)
 *   - inline style on block tags is filtered down to `text-align` only
 *     (Tiptap TextAlign emits `style="text-align: ..."`).
 *
 * Plain-text legacy bodies (created before the rich editor existed) are
 * detected by the absence of a leading `<` and converted to paragraphs
 * before sanitisation, so the DB ends up holding HTML in every case.
 */

const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "blockquote",
  "ul",
  "ol",
  "li",
  "hr",
  "pre",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "br",
  "a",
];

const ALLOWED_LINK_SCHEMES = ["http", "https", "mailto"];
const TEXT_ALIGN_VALUE_RE = /^(left|right|center|justify)$/;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    // `style` must be allow-listed at the attribute level for the
    // `allowedStyles` filter below to even run; without this every
    // style attribute is dropped before its value is inspected.
    "*": ["style"],
  },
  allowedSchemes: ALLOWED_LINK_SCHEMES,
  allowedSchemesAppliedToAttributes: ["href"],
  // Reject any link whose href slips through as a protocol-relative
  // URL (e.g. `//evil.example`); we want explicit http/https/mailto.
  allowProtocolRelative: false,
  allowedStyles: {
    "*": {
      "text-align": [TEXT_ALIGN_VALUE_RE],
    },
  },
  // Wrap every surviving anchor with rel="noopener noreferrer nofollow"
  // and force target="_blank" so a stored XSS via a typo'd href can't
  // hijack the parent window.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    }),
  },
  // Strip script/style/iframe content entirely instead of leaving the
  // text node behind (default sanitize-html behaviour).
  nonTextTags: ["script", "style", "iframe", "noscript", "template"],
  // Default: attribute values are encoded; turn off self-closing on void
  // elements is unnecessary because allowedTags already excludes <img>.
};

const PLAINTEXT_PARAGRAPH_SPLIT_RE = /\n{2,}/;

function looksLikeHtml(value: string): boolean {
  return value.trimStart().startsWith("<");
}

function plainTextToHtml(value: string): string {
  const paragraphs = value
    .split(PLAINTEXT_PARAGRAPH_SPLIT_RE)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`);

  return paragraphs.join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Canonicalise + sanitize a post body. Returns HTML safe to pass
 * directly to `dangerouslySetInnerHTML`.
 */
export function sanitizePostBody(rawBody: string): string {
  const normalized = normalizeNonBreakingSpaces(rawBody).trim();
  if (!normalized) return "";

  const html = looksLikeHtml(normalized) ? normalized : plainTextToHtml(normalized);

  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}
