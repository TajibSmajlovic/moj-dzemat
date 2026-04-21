import crypto from "node:crypto";

import { HONEYPOT_FIELD, HONEYPOT_TIMESTAMP_FIELD, type HoneypotToken } from "#app/lib/honeypot";
import { env } from "#app/utils/env.server";

/**
 * Simple anti-spam honeypot.
 *
 * Every write form ships two hidden fields:
 *   `website__hp` - must stay empty. Bots auto-fill every input.
 *   `website__hp_ts` - timestamp + HMAC, ensures bots can't just submit
 *                      stale/crafted forms. Verified on submit.
 *
 * Failing any of the checks throws - route actions should let the error
 * bubble up so Express turns it into a 400.
 */

const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const MIN_AGE_MS = 500; // discourage instant-submit bots

function sign(value: string): string {
  return crypto.createHmac("sha256", env().HONEYPOT_SECRET).update(value).digest("base64url");
}

/**
 * Generate the hidden field values. Call in the loader of any page that
 * renders a write form and pass the result through to the component.
 */
export function honeypotToken(): HoneypotToken {
  const timestamp = Date.now().toString();
  const signature = sign(timestamp);
  return {
    [HONEYPOT_FIELD]: "",
    [HONEYPOT_TIMESTAMP_FIELD]: `${timestamp}.${signature}`,
  };
}

/**
 * Validate the submitted fields. Throws with a generic message so we
 * don't leak which check failed to would-be attackers.
 */
export function assertHoneypot(formData: FormData): void {
  const hp = formData.get(HONEYPOT_FIELD);
  const ts = formData.get(HONEYPOT_TIMESTAMP_FIELD);

  if (typeof hp !== "string" || hp !== "") {
    throw new Response("Invalid submission", { status: 400 });
  }
  if (typeof ts !== "string") {
    throw new Response("Invalid submission", { status: 400 });
  }

  const [timestampStr, signature] = ts.split(".");
  if (!timestampStr || !signature) {
    throw new Response("Invalid submission", { status: 400 });
  }

  const expected = sign(timestampStr);
  // constant-time compare
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Response("Invalid submission", { status: 400 });
  }

  const age = Date.now() - Number(timestampStr);
  const shouldSkipMinAge = env().HONEYPOT_SKIP_MIN_AGE;
  if (!Number.isFinite(age) || (!shouldSkipMinAge && age < MIN_AGE_MS) || age > MAX_AGE_MS) {
    throw new Response("Invalid submission", { status: 400 });
  }
}
