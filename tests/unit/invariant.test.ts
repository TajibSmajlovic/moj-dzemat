import { describe, expect, it } from "vitest";

import { InvariantError, invariant, invariantResponse } from "#app/lib/invariant";

describe("invariant", () => {
  it("does not throw when the condition is truthy", () => {
    expect(() => invariant(true, "boom")).not.toThrow();
    expect(() => invariant(1, "boom")).not.toThrow();
    expect(() => invariant("ok", "boom")).not.toThrow();
    expect(() => invariant({}, "boom")).not.toThrow();
  });

  it("throws InvariantError with the given message when the condition is falsy", () => {
    expect(() => invariant(false, "boom")).toThrow(InvariantError);
    expect(() => invariant(null, "boom")).toThrow("boom");
    expect(() => invariant(undefined, "boom")).toThrow("boom");
    expect(() => invariant(0, "boom")).toThrow("boom");
    expect(() => invariant("", "boom")).toThrow("boom");
  });

  it("supports a callback message that is only invoked on failure", () => {
    let called = 0;
    const message = () => {
      called += 1;
      return "lazy";
    };

    invariant(true, message);
    expect(called).toBe(0);

    expect(() => invariant(false, message)).toThrow("lazy");
    expect(called).toBe(1);
  });

  it("InvariantError is an Error subclass with the right name", () => {
    const error = new InvariantError("oops");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvariantError);
    expect(error.message).toBe("oops");
  });
});

describe("invariantResponse", () => {
  it("does not throw when the condition is truthy", () => {
    expect(() => invariantResponse(true, "boom")).not.toThrow();
    expect(() => invariantResponse("anything", "boom")).not.toThrow();
  });

  it("throws a 400 Response by default with the message as the body", async () => {
    let thrown: unknown;
    try {
      invariantResponse(false, "Neispravan zahtjev.");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Response);
    const response = thrown as Response;
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Neispravan zahtjev.");
  });

  it("honours a custom status and headers via responseInit", async () => {
    let thrown: unknown;
    try {
      invariantResponse(false, "Not found", {
        status: 404,
        headers: { "X-Test": "yes" },
      });
    } catch (error) {
      thrown = error;
    }

    const response = thrown as Response;
    expect(response.status).toBe(404);
    expect(response.headers.get("X-Test")).toBe("yes");
    expect(await response.text()).toBe("Not found");
  });

  it("supports a callback message that is only invoked on failure", () => {
    let called = 0;
    const message = () => {
      called += 1;
      return "lazy";
    };

    invariantResponse(true, message);
    expect(called).toBe(0);

    let thrown: unknown;
    try {
      invariantResponse(false, message);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect(called).toBe(1);
  });
});
