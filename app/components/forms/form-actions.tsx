import type { ComponentProps } from "react";

import { cn } from "#app/lib/cn";

export function FormActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-border bg-muted/40 flex items-center justify-end gap-2 border-t px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
