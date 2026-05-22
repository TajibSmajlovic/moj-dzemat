import { expect } from "vitest";

/**
   React Router's `data()` helper returns an envelope in route unit tests,
   while redirects are plain `Response` objects. Normalize both shapes so
   integration tests can assert status + payload without repeating casts.
 */
export function statusOf(result: unknown): number {
  if (result instanceof Response) return result.status;

  const init = (result as { init?: ResponseInit | null }).init;
  return init?.status ?? 200;
}

export function payloadOf<T = unknown>(result: unknown): T {
  if (result instanceof Response) {
    throw new TypeError("Response results do not carry a data payload");
  }

  return (result as { data: T }).data;
}

export function expectData<T>(result: T): Exclude<T, Response> {
  expect(result).not.toBeInstanceOf(Response);

  return result as Exclude<T, Response>;
}

export function expectResponse(error: unknown, status: number): asserts error is Response {
  expect(error).toBeInstanceOf(Response);
  expect((error as Response).status).toBe(status);
}
