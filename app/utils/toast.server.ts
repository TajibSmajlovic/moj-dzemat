import { createCookieSessionStorage, redirect } from "react-router";

import { ToastSchema, type ToastInput } from "#app/lib/toast";
import { env } from "#app/utils/env.server";

const toastKey = "toast";

const toastSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "mdz_toast",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: env().SESSION_SECRET,
    secure: env().NODE_ENV === "production",
  },
});

type HeaderInput = ConstructorParameters<typeof Headers>[0];

function combineHeaders(...headersList: (HeaderInput | null | undefined)[]) {
  const combined = new Headers();

  for (const headersInit of headersList) {
    if (!headersInit) continue;
    const headers = new Headers(headersInit);
    for (const [key, value] of headers.entries()) {
      if (key.toLowerCase() === "set-cookie") {
        combined.append(key, value);
      } else {
        combined.set(key, value);
      }
    }
  }

  return combined;
}

async function createToastHeaders(toastInput: ToastInput) {
  const session = await toastSessionStorage.getSession();
  const toast = ToastSchema.parse(toastInput);
  session.flash(toastKey, toast);
  const cookie = await toastSessionStorage.commitSession(session);

  return new Headers({ "Set-Cookie": cookie });
}

export async function redirectWithToast(url: string, toast: ToastInput, init?: ResponseInit) {
  return redirect(url, {
    ...init,
    headers: combineHeaders(init?.headers, await createToastHeaders(toast)),
  });
}

export async function getToast(request: Request) {
  const session = await toastSessionStorage.getSession(request.headers.get("Cookie"));
  const result = ToastSchema.safeParse(session.get(toastKey));
  const toast = result.success ? result.data : null;

  return {
    toast,
    headers: toast
      ? new Headers({ "Set-Cookie": await toastSessionStorage.destroySession(session) })
      : null,
  };
}
