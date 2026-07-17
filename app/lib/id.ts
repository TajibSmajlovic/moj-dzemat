import { invariantResponse } from "#app/lib/invariant";

type RequireIdOptions = {
  message?: string;
  responseInit?: ResponseInit;
};

export function requireId(value: unknown, options: RequireIdOptions = {}): string {
  invariantResponse(
    typeof value === "string" && value.length > 0,
    options.message ?? "Missing id",
    options.responseInit,
  );

  return value;
}
