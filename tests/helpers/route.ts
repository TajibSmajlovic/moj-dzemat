import { RouterContextProvider } from "react-router";

/**
   Thin wrappers that build a `Request` and invoke a route's `loader`
   or `action` in tests. Keeps the boilerplate (`{ request, url, pattern,
   params, context } as LoaderArgs`) in one place so individual integration
   tests stay focused on the assertion they're making.

   The `as Parameters<F>[0]` cast is intentional: React Router's
   generated `LoaderArgs` / `ActionArgs` contain route-specific parameter
   types that a generic helper cannot reproduce. Runtime arguments still use
   React Router's real v8 context provider. Tests for dynamic routes can pass
   their registered route pattern separately from the concrete request URL.
 */

type RouteFn = (args: never) => unknown;

export function testUrl(path: string) {
  return `http://localhost${path}`;
}

type CallRouteOptions = {
  url: string;
  cookie?: string;
  headers?: HeadersInit;
  params?: Record<string, string>;
  pattern?: string;
  context?: RouterContextProvider;
};

type CallLoaderOptions = CallRouteOptions;

function requestHeaders(headersInit: HeadersInit | undefined, cookie: string | undefined) {
  const headers = new Headers(headersInit);
  if (cookie) headers.set("Cookie", cookie);

  return headers;
}

function routeArgs(request: Request, options: CallRouteOptions) {
  const url = new URL(request.url);

  return {
    request,
    url,
    pattern: options.pattern ?? url.pathname,
    params: options.params ?? {},
    context: options.context ?? new RouterContextProvider(),
  };
}

export function callLoader<F extends RouteFn>(
  loader: F,
  options: CallLoaderOptions,
): ReturnType<F> {
  const headers = requestHeaders(options.headers, options.cookie);
  const request = new Request(options.url, { headers });
  const args = routeArgs(request, options);

  return loader(args as Parameters<F>[0]) as ReturnType<F>;
}

type CallActionOptions = CallRouteOptions & {
  formData: FormData;
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
  const args = routeArgs(request, options);

  return action(args as Parameters<F>[0]) as ReturnType<F>;
}
