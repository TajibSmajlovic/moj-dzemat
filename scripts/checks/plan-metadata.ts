import { withoutCodeFences } from "./markdown";

type PlanFinding = {
  kind: string;
  impact: string;
  fix: string;
};

export function checkPlanMetadata(contents: string): {
  updated: string | null;
  findings: PlanFinding[];
} {
  const findings: PlanFinding[] = [];
  const metadata =
    withoutCodeFences(contents).replaceAll("\r\n", "\n").split(/^##\s/mu, 1)[0] ?? "";
  if (!/^Status:[\t ]*active[\t ]*$/mu.test(metadata)) {
    findings.push({
      kind: "invalid-active-plan-status",
      impact: "Active-plan ownership and completion state are ambiguous.",
      fix: "Add an exact `Status: active` line or move a completed plan to completed/.",
    });
  }
  if (!/^Owner:[\t ]*\S[^\n]*$/mu.test(metadata)) {
    findings.push({
      kind: "missing-active-plan-owner",
      impact: "The active plan has no accountable owner.",
      fix: "Add `Owner: person or agent role` before the plan sections.",
    });
  }

  const updated = /^Updated:[\t ]*(\d{4}-\d{2}-\d{2})[\t ]*$/mu.exec(metadata)?.[1];
  if (!updated) {
    findings.push({
      kind: "missing-active-plan-date",
      impact: "Plan freshness cannot be determined.",
      fix: "Add `Updated: YYYY-MM-DD` and refresh it after meaningful work sessions.",
    });
    return { updated: null, findings };
  }

  const date = new Date(`${updated}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== updated) {
    findings.push({
      kind: "invalid-active-plan-date",
      impact: `The Updated date is not a real calendar date: ${updated}.`,
      fix: "Use a real UTC calendar date in YYYY-MM-DD form.",
    });
    return { updated: null, findings };
  }
  return { updated, findings };
}
