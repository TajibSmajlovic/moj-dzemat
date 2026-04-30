import { vi } from "vitest";

import { honeypotToken } from "#app/utils/honeypot.server";

/**
 * The honeypot's `assertHoneypot` requires the form to be at least
 * `MIN_AGE_MS` (500ms) old. Mocking that constant would mean reaching
 * into module internals; instead we issue the token a second in the
 * "past" with fake timers, then jump back to "now" before submitting.
 * That keeps real wall-clock waits out of the suite.
 */
function freshHoneypotFields(): Record<string, string> {
  vi.useFakeTimers();
  const now = Date.now();

  // Issue the token 600ms in the past relative to whatever "now" is.
  vi.setSystemTime(now - 600);

  const token = honeypotToken();

  vi.setSystemTime(now);
  vi.useRealTimers();

  return token;
}

/**
 * Mutate `formData` in place by appending the hidden honeypot fields
 * needed to pass `assertHoneypot`. Returns the same `formData` so the
 * call can chain inline (`callAction(..., { formData: withHoneypot(fd), ... })`).
 */
export function withHoneypot(formData: FormData): FormData {
  for (const [key, value] of Object.entries(freshHoneypotFields())) {
    formData.set(key, value);
  }

  return formData;
}
