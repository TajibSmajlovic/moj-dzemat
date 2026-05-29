import { describe, expect, it } from "vitest";

import {
  AnswerFieldSchema,
  QaAnswerSchema,
  QaSubmitSchema,
  QuestionFieldSchema,
} from "#app/features/qa/qa-schema";

describe("Q&A schemas", () => {
  it("trims and accepts question length boundaries", () => {
    expect(QuestionFieldSchema.parse("  12345  ")).toBe("12345");
    expect(QaSubmitSchema.parse({ question: "  12345  " })).toEqual({ question: "12345" });
    expect(QaSubmitSchema.safeParse({ question: "a".repeat(1000) }).success).toBe(true);
  });

  it("rejects missing and out-of-range questions", () => {
    expect(QaSubmitSchema.safeParse({ question: "" }).success).toBe(false);
    expect(QaSubmitSchema.safeParse({ question: "    " }).success).toBe(false);
    expect(QaSubmitSchema.safeParse({ question: "1234" }).success).toBe(false);
    expect(QaSubmitSchema.safeParse({ question: "a".repeat(1001) }).success).toBe(false);
  });

  it("trims and accepts answer length boundaries", () => {
    expect(AnswerFieldSchema.parse("  12345  ")).toBe("12345");
    expect(QaAnswerSchema.parse({ answer: "  12345  " })).toEqual({ answer: "12345" });
    expect(QaAnswerSchema.safeParse({ answer: "a".repeat(5000) }).success).toBe(true);
  });

  it("rejects missing and out-of-range answers", () => {
    expect(QaAnswerSchema.safeParse({ answer: "" }).success).toBe(false);
    expect(QaAnswerSchema.safeParse({ answer: "    " }).success).toBe(false);
    expect(QaAnswerSchema.safeParse({ answer: "1234" }).success).toBe(false);
    expect(QaAnswerSchema.safeParse({ answer: "a".repeat(5001) }).success).toBe(false);
  });
});
