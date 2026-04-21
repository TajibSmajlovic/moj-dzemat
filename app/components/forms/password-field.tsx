import { useState, type ComponentProps } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Input } from "#app/components/ui/input";
import { Label } from "#app/components/ui/label";
import { cn } from "#app/lib/cn";

type PasswordFieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  inputProps: ComponentProps<typeof Input>;
};

/**
 * Password input with an inline visibility toggle. Mirrors our `Field`
 * accessibility wiring (label + aria-describedby) so screen readers
 * still announce validation errors. The toggle button is `type="button"`
 * so it doesn't submit the surrounding form.
 */
export function PasswordField({ label, hint, errors, inputProps }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  const id = inputProps.id ?? inputProps.name;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">
        <Input
          {...inputProps}
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={describedBy}
          className={cn("pr-10", errorId && "border-destructive", inputProps.className)}
        />

        <button
          type="button"
          onClick={() => setShown((value) => !value)}
          aria-label={shown ? "Sakrij lozinku" : "Prikaži lozinku"}
          aria-pressed={shown}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-0.5 transition-colors focus:outline-none focus-visible:ring-2"
        >
          {shown ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

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
