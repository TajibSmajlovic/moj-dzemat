import type { ComponentProps, ReactNode } from "react";

import { FieldFrame } from "#app/components/forms/field-frame";
import { Select } from "#app/components/ui/select";
import { cn } from "#app/lib/cn";

type SelectFieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  selectProps: ComponentProps<typeof Select>;
  children?: ReactNode;
  placeholder?: string;
};
export function SelectField({
  label,
  hint,
  errors,
  selectProps,
  children,
  placeholder,
}: SelectFieldProps) {
  return (
    <FieldFrame
      id={selectProps.id}
      label={label}
      hint={hint}
      errors={errors}
      describedBy={selectProps["aria-describedby"]}
      invalid={selectProps["aria-invalid"]}
    >
      {(description) => (
        <Select
          {...selectProps}
          {...description}
          className={cn(errors?.length && "border-destructive", selectProps.className)}
          placeholder={placeholder}
        >
          {children}
        </Select>
      )}
    </FieldFrame>
  );
}
