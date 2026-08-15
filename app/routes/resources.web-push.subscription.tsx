import {
  deletePushSubscription,
  parseBrowserSubscription,
  readLimitedJson,
  requireExactOrigin,
  upsertPushSubscription,
} from "#app/features/web-push/subscription.server";
import { env } from "#app/server/env.server";
import { getClientIp, webPushSubscriptionLimiter } from "#app/server/rate-limit.server";

import type { Route } from "./+types/resources.web-push.subscription";

const RESPONSE_HEADERS = { "Cache-Control": "no-store" };

export async function action({ request }: Route.ActionArgs) {
  requireExactOrigin(request);

  const rateLimit = webPushSubscriptionLimiter.check(getClientIp(request));
  if (!rateLimit.ok) {
    return new Response("Previše zahtjeva. Pokušajte ponovo kasnije.", {
      status: 429,
      headers: {
        ...RESPONSE_HEADERS,
        "Retry-After": String(Math.max(1, Math.ceil(rateLimit.resetInMs / 1000))),
      },
    });
  }

  if (request.method === "PUT") {
    if (!env().WEB_PUSH_ENABLED) {
      return new Response("Web Push trenutno nije dostupan.", {
        status: 503,
        headers: RESPONSE_HEADERS,
      });
    }
    const body = await readLimitedJson(request);
    const subscription = parseBrowserSubscription(body);
    await upsertPushSubscription(subscription);

    return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
  }

  if (request.method === "DELETE") {
    const body = await readLimitedJson(request);
    const endpointHash =
      body && typeof body === "object" ? (body as Record<string, unknown>).endpointHash : null;
    await deletePushSubscription(endpointHash);

    return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
  }

  return new Response("Metoda nije podržana.", {
    status: 405,
    headers: { ...RESPONSE_HEADERS, Allow: "PUT, DELETE" },
  });
}
