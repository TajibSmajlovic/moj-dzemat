import type { ReactNode } from "react";
import { Link } from "react-router";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "#app/components/ui/button";

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
    <div className="border-border flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">{summary}</p>

      <nav aria-label={ariaLabel} className="flex items-center gap-2 self-end sm:self-auto">
        <PaginationLink to={previousHref} disabled={!hasPreviousPage} label="Prethodna stranica">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Prethodna
        </PaginationLink>

        <span className="text-muted-foreground min-w-28 text-center text-sm">
          Stranica {page} od {totalPages}
        </span>

        <PaginationLink to={nextHref} disabled={!hasNextPage} label="Sljedeća stranica">
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
  children,
}: {
  to: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <Link to={to} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
