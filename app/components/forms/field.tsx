import type { ComponentProps } from "react";

import { Input } from "#app/components/ui/input";
import { Label } from "#app/components/ui/label";
import { cn } from "#app/lib/cn";

type FieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  inputProps: ComponentProps<typeof Input>;
};

/**
 * Glue between a shadcn `Input` and Conform's field metadata. Wires up
 * label + hint + error-message text ids with aria-describedby so screen
 * readers announce validation problems immediately.
 */
export function Field({ label, hint, errors, inputProps }: FieldProps) {
  const id = inputProps.id ?? inputProps.name;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      <Input
        {...inputProps}
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={describedBy}
        className={cn(errorId && "border-destructive", inputProps.className)}
      />

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
