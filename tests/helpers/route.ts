/**
 * Thin wrappers that build a `Request` and invoke a route's `loader`
 * or `action` in tests. Keeps the boilerplate (`{ request, params,
 * context: {} } as LoaderArgs`) in one place so individual integration
 * tests stay focused on the assertion they're making.
 *
 * The `as Parameters<F>[0]` cast is intentional: React Router's
 * generated `LoaderArgs` / `ActionArgs` types have framework-internal
 * fields we don't reproduce in tests, but the loader/action body only
 * touches `request` / `params` / `context`.
 */

type RouteFn = (args: never) => unknown;

type CallLoaderOptions = {
  url: string;
  cookie?: string;
  params?: Record<string, string>;
};

export function callLoader<F extends RouteFn>(
  loader: F,
  options: CallLoaderOptions,
): ReturnType<F> {
  const headers = options.cookie ? { Cookie: options.cookie } : undefined;
  const request = new Request(options.url, { headers });
  const args = { request, params: options.params ?? {}, context: {} };

  return loader(args as Parameters<F>[0]) as ReturnType<F>;
}

type CallActionOptions = {
  url: string;
  formData: FormData;
  cookie?: string;
  params?: Record<string, string>;
};

export function callAction<F extends RouteFn>(
  action: F,
  options: CallActionOptions,
): ReturnType<F> {
  const headers = options.cookie ? { Cookie: options.cookie } : undefined;
  const request = new Request(options.url, {
    method: "POST",
    body: options.formData,
    headers,
  });
  const args = { request, params: options.params ?? {}, context: {} };

  return action(args as Parameters<F>[0]) as ReturnType<F>;
}
