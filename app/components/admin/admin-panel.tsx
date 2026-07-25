import type { ComponentProps } from "react";

import { cn } from "#app/lib/cn";

export function AdminPanel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-border bg-card overflow-clip rounded-2xl border shadow-sm", className)}
      {...props}
    />
  );
}
