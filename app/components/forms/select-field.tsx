import type { ComponentProps, ReactNode } from "react";

import { Label } from "#app/components/ui/label";
import { Select } from "#app/components/ui/select";
import { cn } from "#app/lib/cn";

type SelectFieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  selectProps: ComponentProps<typeof Select>;
  children: ReactNode;
};

export function SelectField({ label, hint, errors, selectProps, children }: SelectFieldProps) {
  const id = selectProps.id ?? selectProps.name;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      <Select
        {...selectProps}
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={describedBy}
        className={cn(errorId && "border-destructive", selectProps.className)}
      >
        {children}
      </Select>

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
