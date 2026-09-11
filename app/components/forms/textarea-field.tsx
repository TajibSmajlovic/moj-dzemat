import type { ComponentProps } from "react";

import { FieldFrame } from "#app/components/forms/field-frame";
import { Textarea } from "#app/components/ui/textarea";
import { cn } from "#app/lib/cn";

type TextareaFieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  textareaProps: ComponentProps<typeof Textarea>;
};

export function TextareaField({ label, hint, errors, textareaProps }: TextareaFieldProps) {
  return (
    <FieldFrame
      id={textareaProps.id}
      label={label}
      hint={hint}
      errors={errors}
      describedBy={textareaProps["aria-describedby"]}
      invalid={textareaProps["aria-invalid"]}
    >
      {(description) => (
        <Textarea
          {...textareaProps}
          {...description}
          className={cn(errors?.length && "border-destructive", textareaProps.className)}
        />
      )}
    </FieldFrame>
  );
}
