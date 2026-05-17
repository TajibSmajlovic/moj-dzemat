import * as React from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "#app/lib/cn";

type SelectProps = React.ComponentPropsWithoutRef<"select"> & {
  placeholder?: string;
};

export default function Select({ placeholder, className, children, ...rest }: SelectProps) {
  const shouldDefaultToPlaceholder =
    placeholder && rest.value == null && rest.defaultValue == null ? "" : undefined;

  return (
    <div className="relative">
      <select
        {...rest}
        defaultValue={shouldDefaultToPlaceholder ?? rest.defaultValue}
        className={cn(
          "selection:bg-primary selection:text-primary-foreground file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 h-9 w-full min-w-0 appearance-none rounded-md border bg-transparent px-3 py-1 pr-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
      />
    </div>
  );
}

export { Select };
