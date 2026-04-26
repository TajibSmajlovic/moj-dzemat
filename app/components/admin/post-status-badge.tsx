import { Eye, EyeOff } from "lucide-react";

import { cn } from "#app/lib/cn";
import { POST_STATUS_LABEL, type PostStatusValue } from "#app/lib/post-status";

type PostStatusBadgeProps = {
  status: PostStatusValue;
  className?: string;
};

export function PostStatusBadge({ status, className }: PostStatusBadgeProps) {
  const published = status === "published";
  const Icon = published ? Eye : EyeOff;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        published
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground ring-border ring-1 ring-inset",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {POST_STATUS_LABEL[status]}
    </span>
  );
}
