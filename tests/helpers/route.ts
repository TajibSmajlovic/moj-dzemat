/**
   Thin wrappers that build a `Request` and invoke a route's `loader`
   or `action` in tests. Keeps the boilerplate (`{ request, params,
   context: {} } as LoaderArgs`) in one place so individual integration
   tests stay focused on the assertion they're making.

   The `as Parameters<F>[0]` cast is intentional: React Router's
   generated `LoaderArgs` / `ActionArgs` types have framework-internal
   fields we don't reproduce in tests, but the loader/action body only
   touches `request` / `params` / `context`.
 */

type RouteFn = (args: never) => unknown;

export function testUrl(path: string) {
  return `http://localhost${path}`;
}

type CallLoaderOptions = {
  url: string;
  cookie?: string;
  headers?: HeadersInit;
  params?: Record<string, string>;
};

function requestHeaders(headersInit: HeadersInit | undefined, cookie: string | undefined) {
  const headers = new Headers(headersInit);
  if (cookie) headers.set("Cookie", cookie);

  return headers;
}

export function callLoader<F extends RouteFn>(
  loader: F,
  options: CallLoaderOptions,
): ReturnType<F> {
  const headers = requestHeaders(options.headers, options.cookie);
  const request = new Request(options.url, { headers });
  const args = { request, params: options.params ?? {}, context: {} };

  return loader(args as Parameters<F>[0]) as ReturnType<F>;
}

type CallActionOptions = {
  url: string;
  formData: FormData;
  cookie?: string;
  headers?: HeadersInit;
  params?: Record<string, string>;
};

export function callAction<F extends RouteFn>(
  action: F,
  options: CallActionOptions,
): ReturnType<F> {
  const headers = requestHeaders(options.headers, options.cookie);
  const request = new Request(options.url, {
    method: "POST",
    body: options.formData,
    headers,
  });
  const args = { request, params: options.params ?? {}, context: {} };

  return action(args as Parameters<F>[0]) as ReturnType<F>;
}
