import { Eye, EyeOff } from "lucide-react";

import { Badge } from "#app/components/ui/badge";
import { POST_STATUS_LABEL, type PostStatusValue } from "#app/features/posts/post-status";
import { cn } from "#app/lib/cn";

type PostStatusBadgeProps = {
  status: PostStatusValue;
  className?: string;
};

export function PostStatusBadge({ status, className }: PostStatusBadgeProps) {
  const published = status === "published";
  const Icon = published ? Eye : EyeOff;

  return (
    <Badge
      className={cn(
        published
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground ring-border ring-1 ring-inset",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {POST_STATUS_LABEL[status]}
    </Badge>
  );
}
