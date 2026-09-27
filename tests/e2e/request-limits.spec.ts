import { expect, test } from "@playwright/test";
import http from "node:http";

import { MAX_REQUEST_BYTES } from "../../app/server/limits.server";

function oversizedRequest(baseURL: string, declared: boolean): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      new URL("/prijava", baseURL),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(declared
            ? { "Content-Length": MAX_REQUEST_BYTES + 1 }
            : { "Transfer-Encoding": "chunked" }),
        },
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode));
      },
    );
    request.on("error", reject);
    request.setTimeout(10_000, () => request.destroy(new Error("No early body-limit response")));
    // Deliberately omit end(): rejection must not wait for the rest of the body.
    if (declared) {
      request.flushHeaders();
    } else {
      request.write(Buffer.alloc(MAX_REQUEST_BYTES + 1, "a"));
    }
  });
}

for (const declared of [true, false]) {
  test(`rejects an oversized ${declared ? "declared" : "chunked"} body before it finishes`, async ({
    baseURL,
  }) => {
    expect(await oversizedRequest(baseURL!, declared)).toBe(413);
  });
}
