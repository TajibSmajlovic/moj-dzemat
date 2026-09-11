import type { ComponentProps } from "react";

import { FieldFrame } from "#app/components/forms/field-frame";
import { Input } from "#app/components/ui/input";
import { cn } from "#app/lib/cn";

type FieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  inputProps: ComponentProps<typeof Input>;
};
export function Field({ label, hint, errors, inputProps }: FieldProps) {
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
        <Input
          {...inputProps}
          {...description}
          className={cn(errors?.length && "border-destructive", inputProps.className)}
        />
      )}
    </FieldFrame>
  );
}
