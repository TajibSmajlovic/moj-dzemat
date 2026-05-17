import crypto from "node:crypto";

import { HONEYPOT_FIELD, HONEYPOT_TIMESTAMP_FIELD, type HoneypotToken } from "#app/lib/honeypot";
import { invariantResponse } from "#app/lib/invariant";
import { MINUTE_MS } from "#app/lib/time";
import { env } from "#app/server/env.server";

/**
   Simple anti-spam honeypot.

   Every write form ships two hidden fields:
     `website__hp` - must stay empty. Bots auto-fill every input.
     `website__hp_ts` - timestamp + HMAC, ensures bots can't just submit
                        stale/crafted forms. Verified on submit.

   Failing any of the checks throws - route actions should let the error
   bubble up so Express turns it into a 400.
 */

const MAX_AGE_MS = 15 * MINUTE_MS;
const MIN_AGE_MS = 500; // discourage instant-submit bots

function sign(value: string): string {
  return crypto.createHmac("sha256", env().HONEYPOT_SECRET).update(value).digest("base64url");
}

/**
   Generate the hidden field values. Call in the loader of any page that
   renders a write form and pass the result through to the component.
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
   Validate the submitted fields. Throws with a generic message so we
   don't leak which check failed to would-be attackers.
 */
export function assertHoneypot(formData: FormData): void {
  const hp = formData.get(HONEYPOT_FIELD);
  const ts = formData.get(HONEYPOT_TIMESTAMP_FIELD);

  invariantResponse(typeof hp === "string" && hp === "", "Invalid submission");
  invariantResponse(typeof ts === "string", "Invalid submission");

  const [timestampStr, signature] = ts.split(".");
  invariantResponse(timestampStr && signature, "Invalid submission");

  const expected = sign(timestampStr);
  // constant-time compare
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  invariantResponse(a.length === b.length && crypto.timingSafeEqual(a, b), "Invalid submission");

  const age = Date.now() - Number(timestampStr);
  const shouldSkipMinAge = env().HONEYPOT_SKIP_MIN_AGE;
  invariantResponse(
    Number.isFinite(age) && (shouldSkipMinAge || age >= MIN_AGE_MS) && age <= MAX_AGE_MS,
    "Invalid submission",
  );
}
