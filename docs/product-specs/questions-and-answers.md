# Questions and Answers

The Q&A feature lets a visitor submit one question without an account or contact
details. An editor must answer and moderate it before it becomes public.

## Submission

- The public form accepts only question text. It does not request a name, email,
  account, or attachment.
- A question must contain 5 to 1,000 characters after normalization.
- The server verifies the signed honeypot and the Q&A-specific per-IP rate
  limit before storing a valid question.
- A successful submission creates an unanswered, visible-by-default moderation
  row and redirects to the thank-you page with status `303`.
- Validation and rate-limit failures keep an actionable form state. The mobile
  sheet reopens when a submitted form needs correction.

## Moderation

- Unanswered questions appear oldest first so the longest-waiting question is
  handled first.
- An answer must contain 5 to 5,000 characters.
- Saving an answer records a fresh `answeredAt` timestamp. Editing an answer is
  supported and refreshes that timestamp.
- Only answered questions can be hidden. An unanswered question cannot be
  toggled hidden.
- Editors may delete questions. Missing ids return not found instead of silently
  succeeding.

## Public visibility

A question is public only when it has both an answer and `isHidden = false`.
That same condition applies to lists, detail pages, related questions, home
preview, structured data, and sitemap entries.

Public questions sort by latest answer and then id. The list shows 10 at a time
through progressive "Učitaj još" links. A non-public or unknown detail id
returns not found and must not leak the stored question or answer.

## Acceptance evidence

- `tests/unit/qa/qa-schema.test.ts` owns input limits.
- Q&A integration tests own submission, moderation, pagination, visibility, and
  detail-route contracts.
- `tests/e2e/qa.spec.ts` owns the rendered desktop and mobile visitor/editor
  workflows.
- `tests/e2e/seo.spec.ts` owns public metadata and structured-data behavior.
