import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { IntentInput, assertUnreachable, parseIntent } from "#app/lib/intent";

const TestIntents = {
  Save: "save",
  Delete: "delete",
} as const;

function expectIntentResponse(fn: VoidFunction, expectedMessage: string) {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(Response);
  expect((thrown as Response).status).toBe(400);
  return expect((thrown as Response).text()).resolves.toBe(expectedMessage);
}

describe("intent helpers", () => {
  it("parses a known intent from form data", () => {
    const formData = new FormData();
    formData.set("intent", TestIntents.Delete);

    expect(parseIntent(formData, TestIntents)).toBe(TestIntents.Delete);
  });

  it("supports custom intent field names", () => {
    const formData = new FormData();
    formData.set("_action", TestIntents.Save);

    expect(parseIntent(formData, TestIntents, "_action")).toBe(TestIntents.Save);
  });

  it("throws a 400 response for missing or unknown intents", async () => {
    await expectIntentResponse(
      () => parseIntent(new FormData(), TestIntents),
      "Unsupported intent",
    );

    const formData = new FormData();
    formData.set("intent", "archive");
    await expectIntentResponse(() => parseIntent(formData, TestIntents), "Unsupported intent");
  });

  it("throws a 400 response for unreachable switch branches", async () => {
    await expectIntentResponse(
      () => assertUnreachable("archive" as never),
      "Unsupported intent: archive",
    );
  });

  it("renders a typed hidden input for the intent value", () => {
    const html = renderToStaticMarkup(<IntentInput intent={TestIntents.Delete} />);

    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="intent"');
    expect(html).toContain('value="delete"');
  });

  it("renders custom intent field names", () => {
    const html = renderToStaticMarkup(<IntentInput intent={TestIntents.Save} field="_action" />);

    expect(html).toContain('name="_action"');
    expect(html).toContain('value="save"');
  });
});
