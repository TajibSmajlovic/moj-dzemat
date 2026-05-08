import type { ComponentProps, ReactNode } from "react";

import { cn } from "#app/lib/cn";

type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  heading?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  heading,
  description,
  action,
  children,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn("border-border bg-card rounded-2xl border p-12 text-center", className)}
      {...props}
    >
      {children ?? (
        <div className="mx-auto max-w-md space-y-3">
          {heading ? (
            <h2 className="font-display text-foreground text-xl font-semibold">{heading}</h2>
          ) : null}
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      )}
    </div>
  );
}
