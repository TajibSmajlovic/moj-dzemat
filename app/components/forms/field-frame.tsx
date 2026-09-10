import { useId, type AriaAttributes, type ReactNode } from "react";

import { Label } from "#app/components/ui/label";

type ControlDescription = Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & {
  id: string;
};

type FieldFrameProps = {
  id?: string;
  label: string;
  hint?: string;
  errors?: string[];
  describedBy?: string;
  invalid?: AriaAttributes["aria-invalid"];
  children: (description: ControlDescription) => ReactNode;
};

export function FieldFrame({
  id,
  label,
  hint,
  errors,
  describedBy,
  invalid,
  children,
}: FieldFrameProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = errors?.length ? `${controlId}-error` : undefined;
  const descriptions = [
    ...new Set(
      [describedBy, hintId, errorId].filter(Boolean).join(" ").split(/\s+/).filter(Boolean),
    ),
  ];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={controlId}>{label}</Label>
      {children({
        id: controlId,
        "aria-invalid": errorId ? true : invalid,
        "aria-describedby": descriptions.join(" ") || undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <p id={errorId} className="text-destructive text-xs">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}
