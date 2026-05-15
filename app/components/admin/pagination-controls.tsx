import type { ReactNode } from "react";
import { Link } from "react-router";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  summary: ReactNode;
  previousHref: string;
  nextHref: string;
  ariaLabel: string;
};

export function PaginationControls({
  page,
  totalPages,
  summary,
  previousHref,
  nextHref,
  ariaLabel,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <div className="border-border flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3">
      <p className="text-muted-foreground text-sm">{summary}</p>

      <nav
        aria-label={ariaLabel}
        className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[auto_auto_auto] sm:items-center"
      >
        <PaginationLink
          to={previousHref}
          disabled={!hasPreviousPage}
          label="Prethodna stranica"
          className="w-full justify-center sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Prethodna
        </PaginationLink>

        <span className="bg-muted text-muted-foreground order-3 col-span-2 justify-self-center rounded-full px-3 py-1 text-center text-xs font-medium sm:order-none sm:col-span-1 sm:min-w-28 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:font-normal">
          Stranica {page} od {totalPages}
        </span>

        <PaginationLink
          to={nextHref}
          disabled={!hasNextPage}
          label="Sljedeća stranica"
          className="w-full justify-center sm:w-auto"
        >
          Sljedeća
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PaginationLink>
      </nav>
    </div>
  );
}

function PaginationLink({
  to,
  disabled,
  label,
  className,
  children,
}: {
  to: string;
  disabled: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <Button type="button" variant="outline" size="sm" className={cn(className)} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" className={cn(className)} asChild>
      <Link to={to} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
