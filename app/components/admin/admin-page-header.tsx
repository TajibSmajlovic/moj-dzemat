import type { ReactNode } from "react";

import { BackLink } from "#app/components/ui/back-link";
import { cn } from "#app/lib/cn";

type AdminPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("mb-8 space-y-4", className)}>
      {backTo ? <BackLink to={backTo} label={backLabel} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-foreground text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}
