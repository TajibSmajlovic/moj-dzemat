import {
  RouterContextProvider,
  createContext,
  href,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { describe, expect, it } from "vitest";

import { callAction, callLoader, testUrl } from "../helpers/route";

describe("route test helpers", () => {
  it("uses a RouterContextProvider and defaults the pattern to the request pathname", () => {
    const result = callLoader(
      ({ context, pattern, url }: LoaderFunctionArgs) => ({
        context,
        pattern,
        pathname: url.pathname,
        search: url.search,
      }),
      { url: testUrl("/objave/testna-objava?preview=1") },
    );

    expect(result.context).toBeInstanceOf(RouterContextProvider);
    expect(result.pattern).toBe("/objave/testna-objava");
    expect(result.pathname).toBe("/objave/testna-objava");
    expect(result.search).toBe("?preview=1");
  });

  it("passes an explicit route pattern and caller-provided context to actions", async () => {
    const actorContext = createContext<string>();
    const context = new RouterContextProvider();
    context.set(actorContext, "admin-123");

    const formData = new FormData();
    formData.set("intent", "update");

    const result = await callAction(
      async ({ context, params, pattern, request }: ActionFunctionArgs) => {
        const submittedFormData = await request.formData();

        return {
          actor: context.get(actorContext),
          id: params.id,
          intent: submittedFormData.get("intent"),
          pattern,
        };
      },
      {
        url: testUrl(href("/admin/objave/:id", { id: "post-123" })),
        formData,
        params: { id: "post-123" },
        pattern: "/admin/objave/:id",
        context,
      },
    );

    expect(result).toEqual({
      actor: "admin-123",
      id: "post-123",
      intent: "update",
      pattern: "/admin/objave/:id",
    });
  });
});
