import { env } from "#app/utils/env.server";
import { logger } from "#app/utils/logger.server";

/**
 * Outbound email. Production uses the Resend HTTP API (so we avoid a
 * heavy SDK); development captures the last N emails in-process for the
 * `/dev/last-email` route that Playwright + manual QA hit.
 */

const RESEND_URL = "https://api.resend.com/emails";
const DEV_BUFFER_SIZE = 10;

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type CapturedEmail = SendArgs & { capturedAt: Date };

const devInbox: CapturedEmail[] = [];

export async function sendEmail(args: SendArgs): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM, NODE_ENV } = env();

  if (NODE_ENV !== "production" || !RESEND_API_KEY) {
    devInbox.unshift({ ...args, capturedAt: new Date() });
    while (devInbox.length > DEV_BUFFER_SIZE) devInbox.pop();
    logger.info({ to: args.to, subject: args.subject }, "email captured in dev inbox");
    return;
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "<unreadable>");
    logger.error({ status: response.status, body, to: args.to }, "Resend failed");
    throw new Error(`Email send failed: ${response.status}`);
  }

  logger.info({ to: args.to, subject: args.subject }, "email sent");
}

export function getLastCapturedEmail(): CapturedEmail | undefined {
  return devInbox[0];
}
