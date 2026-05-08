import { Link, useLocation, useNavigate } from "react-router";

import { ArrowLeft } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";

const BACK_LINK_CLASSES =
  "text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors";

type BackLinkProps = {
  to: string;
  label?: string;
  className?: string;
};

export function BackLink({ to, label = "Nazad", className }: BackLinkProps) {
  return (
    <Link to={to} className={cn(BACK_LINK_CLASSES, className)}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

type BackButtonProps = {
  /** Where to navigate when there's no in-app history to pop. */
  fallback: string;
  label?: string;
  /**
   * Boolean key on `location.state`; when truthy, `navigate(-1)` is
   * used instead of `fallback`. The list pages currently set
   * `state={{ fromList: true }}` on outbound links, so the default
   * matches that contract.
   */
  stateKey?: string;
  className?: string;
};

/**
 * History-aware back action. Pops the in-app history when the user
 * arrived via a known entry point (signalled by `location.state`),
 * otherwise navigates to a safe fallback so direct loads / shared
 * links still go somewhere sensible.
 */
export function BackButton({
  fallback,
  label = "Nazad",
  stateKey = "fromList",
  className,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as Record<string, unknown> | null;
  const canPop = Boolean(state?.[stateKey]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => (canPop ? void navigate(-1) : void navigate(fallback))}
      className={cn(BACK_LINK_CLASSES, "-ml-3", className)}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
