import type { ComponentProps } from "react";

import { cn } from "#app/lib/cn";

type FormActionsProps = ComponentProps<"div"> & {
  sticky?: boolean;
};

export function FormActions({ className, sticky = false, ...props }: FormActionsProps) {
  return (
    <div
      className={cn(
        "border-border bg-muted/40 flex items-center justify-end gap-2 border-t px-5 py-3",
        sticky &&
          "bg-background/95 supports-backdrop-filter:bg-background/85 sticky bottom-3 z-20 rounded-xl border shadow-lg backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
