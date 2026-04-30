export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvariantError.prototype);
  }
}

export function invariant(condition: unknown, message: string | (() => string)): asserts condition {
  if (!condition) {
    throw new InvariantError(typeof message === "function" ? message() : message);
  }
}

export function invariantResponse(
  condition: unknown,
  message: string | (() => string),
  responseInit?: ResponseInit,
): asserts condition {
  if (!condition) {
    throw new Response(typeof message === "function" ? message() : message, {
      status: 400,
      ...responseInit,
    });
  }
}
