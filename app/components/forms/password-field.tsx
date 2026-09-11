import { useState, type ComponentProps } from "react";

import { Eye, EyeOff } from "lucide-react";

import { FieldFrame } from "#app/components/forms/field-frame";
import { Input } from "#app/components/ui/input";
import { cn } from "#app/lib/cn";

type PasswordFieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  inputProps: ComponentProps<typeof Input>;
};
export function PasswordField({ label, hint, errors, inputProps }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <FieldFrame
      id={inputProps.id}
      label={label}
      hint={hint}
      errors={errors}
      describedBy={inputProps["aria-describedby"]}
      invalid={inputProps["aria-invalid"]}
    >
      {(description) => (
        <div className="relative">
          <Input
            {...inputProps}
            {...description}
            type={shown ? "text" : "password"}
            className={cn("pr-10", errors?.length && "border-destructive", inputProps.className)}
          />
          <button
            type="button"
            disabled={inputProps.disabled}
            onClick={() => setShown((value) => !value)}
            aria-label={shown ? "Sakrij lozinku" : "Prikaži lozinku"}
            aria-pressed={shown}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-0.5 transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50"
          >
            {shown ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </FieldFrame>
  );
}
