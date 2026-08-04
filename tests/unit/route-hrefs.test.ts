import { describe, expect, it } from "vitest";

import { passwordResetHref } from "#app/features/auth/auth-routes";
import {
  adminPostHref,
  adminPostPreviewHref,
  postHref,
  postImageHref,
} from "#app/features/posts/post-routes";
import { adminQaAnswerHref, qaQuestionHref } from "#app/features/qa/qa-routes";

describe("dynamic route href helpers", () => {
  it("generates post paths from registered React Router patterns", () => {
    expect(adminPostHref("post-123")).toBe("/admin/objave/post-123");
    expect(adminPostPreviewHref("post-123")).toBe("/admin/objave/post-123/pregled");
    expect(postHref("ramazanska-objava")).toBe("/objave/ramazanska-objava");
    expect(postImageHref("image-123")).toBe("/slike/image-123");
  });

  it("generates Q&A paths and preserves the optional admin source tab", () => {
    expect(qaQuestionHref("question-123")).toBe("/pitanja-i-odgovori/question-123");
    expect(adminQaAnswerHref("question-123")).toBe("/admin/pitanja/question-123");
    expect(adminQaAnswerHref("question-123", { from: "odgovorena" })).toBe(
      "/admin/pitanja/question-123?from=odgovorena",
    );
  });

  it("encodes password reset tokens as path parameters", () => {
    expect(passwordResetHref('<token>"&x=1')).toBe("/nova-lozinka/%3Ctoken%3E%22&x=1");
  });
});
