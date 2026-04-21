import { describe, expect, it } from "vitest";

import {
  createActionToast,
  getToastToneForAction,
  getToastTypeForAction,
  resolveToastTone,
  ToastSchema,
  type ToastAction,
} from "#app/lib/toast";

describe("toast helpers", () => {
  it("creates primary success toasts for create and update actions", () => {
    const created = createActionToast({
      action: "create",
      description: "Objava je uspješno kreirana.",
    });
    const updated = createActionToast({
      action: "update",
      description: "Objava je uspješno ažurirana.",
    });

    expect(created.type).toBe("success");
    expect(created.tone).toBe("primary");
    expect(updated.type).toBe("success");
    expect(updated.tone).toBe("primary");
  });

  it("uses secondary tone for feature actions", () => {
    const featured = createActionToast({
      action: "feature",
      description: "Objava istaknuta.",
    });

    expect(featured.type).toBe("success");
    expect(featured.tone).toBe("secondary");
  });

  it("uses destructive tone for delete and error actions", () => {
    const deleted = createActionToast({
      action: "delete",
      description: "Objava obrisana.",
    });
    const errored = createActionToast({
      action: "error",
      description: "Dogodila se greška.",
    });

    expect(deleted.type).toBe("success");
    expect(deleted.tone).toBe("destructive");
    expect(errored.type).toBe("error");
    expect(errored.tone).toBe("destructive");
  });

  it("falls back to tone by type when tone is omitted", () => {
    const neutral = ToastSchema.parse({ description: "Poruka." });
    const success = ToastSchema.parse({ type: "success", description: "Uspjeh." });
    const error = ToastSchema.parse({ type: "error", description: "Greška." });

    expect(resolveToastTone(neutral)).toBe("neutral");
    expect(resolveToastTone(success)).toBe("primary");
    expect(resolveToastTone(error)).toBe("destructive");
  });

  it("keeps action toasts serializable through the schema", () => {
    const toast = createActionToast({
      action: "pin",
      description: "Objava je stavljena na vrh.",
    });

    expect(ToastSchema.parse(structuredClone(toast))).toEqual(toast);
  });
});

describe("getToastToneForAction", () => {
  it("returns the matching tone for every action", () => {
    expect(getToastToneForAction("message")).toBe("neutral");
    expect(getToastToneForAction("error")).toBe("destructive");
    expect(getToastToneForAction("create")).toBe("primary");
    expect(getToastToneForAction("update")).toBe("primary");
    expect(getToastToneForAction("feature")).toBe("secondary");
    expect(getToastToneForAction("pin")).toBe("primary");
    expect(getToastToneForAction("activate")).toBe("primary");
    expect(getToastToneForAction("delete")).toBe("destructive");
  });
});

describe("getToastTypeForAction", () => {
  it("maps message and error actions to their own type", () => {
    expect(getToastTypeForAction("message")).toBe("message");
    expect(getToastTypeForAction("error")).toBe("error");
  });

  it("maps every other action to success", () => {
    const successActions: ToastAction[] = [
      "create",
      "update",
      "feature",
      "pin",
      "activate",
      "delete",
    ];
    for (const action of successActions) {
      expect(getToastTypeForAction(action)).toBe("success");
    }
  });
});

describe("ToastSchema defaults", () => {
  it("defaults type to 'message' and generates an id when omitted", () => {
    const parsed = ToastSchema.parse({ description: "Poruka." });
    expect(parsed.type).toBe("message");
    // crypto.randomUUID() returns a hex/dash string in both Node and happy-dom.
    expect(parsed.id).toMatch(/^[\da-f-]+$/i);
    expect(parsed.id.length).toBeGreaterThanOrEqual(16);
  });

  it("preserves an explicitly provided id", () => {
    const parsed = ToastSchema.parse({ id: "abc-123", description: "x" });
    expect(parsed.id).toBe("abc-123");
  });

  it("requires a description", () => {
    expect(ToastSchema.safeParse({}).success).toBe(false);
  });
});

describe("resolveToastTone overrides", () => {
  it("respects an explicit tone over the type-derived default", () => {
    expect(resolveToastTone({ type: "error", tone: "primary" })).toBe("primary");
    expect(resolveToastTone({ type: "success", tone: "neutral" })).toBe("neutral");
    expect(resolveToastTone({ type: "message", tone: "destructive" })).toBe("destructive");
  });
});
