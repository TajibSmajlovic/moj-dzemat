import type { AdminQuestionTab } from "#app/features/qa/qa.server";

export function parseAdminQuestionTab(value: string | null): AdminQuestionTab {
  return value === "odgovorena" ? "odgovorena" : "neodgovorena";
}
