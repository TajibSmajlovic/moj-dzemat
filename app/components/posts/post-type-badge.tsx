import { cn } from "#app/lib/cn";
import { POST_TYPE_ICON, POST_TYPE_LABEL, type PostTypeValue } from "#app/lib/post-type";

type PostTypeBadgeProps = {
  type: PostTypeValue;
  className?: string;
  /**
   * `overlay` is meant to sit on top of a thumbnail. It uses a
   * translucent cream background + drop shadow so colour-coded text
   * still reads against arbitrary imagery underneath.
   */
  variant?: "default" | "overlay";
};

/**
 * Colour-coded chip that telegraphs which post kind a card represents.
 * Colours are mapped to semantic tokens so the `.dark` palette flips
 * without touching the component.
 */
const TYPE_STYLES: Record<PostTypeValue, string> = {
  obavijest: "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary",
  smrtovnica: "bg-foreground/8 text-foreground/60 dark:bg-muted dark:text-muted-foreground",
  sergija:
    "bg-[hsl(var(--emerald-glow)/0.18)] text-[hsl(var(--emerald-deep))] dark:bg-[hsl(var(--emerald-glow)/0.22)]",
  hutba:
    "bg-secondary/15 text-[hsl(var(--gold-foreground))] dark:bg-secondary/20 dark:text-secondary",
  price: "bg-accent text-accent-foreground dark:bg-accent dark:text-accent-foreground",
};

/**
 * When the badge floats on a photo we drop the tinted background and
 * rely on a soft chip with just the accent-coloured label.
 */
const TYPE_OVERLAY: Record<PostTypeValue, string> = {
  obavijest: "text-primary dark:text-primary-foreground",
  smrtovnica: "text-foreground/60 dark:text-primary-foreground/70",
  sergija: "text-[hsl(var(--emerald-deep))] dark:text-primary-foreground",
  hutba: "text-[hsl(var(--gold-foreground))] dark:text-secondary-foreground",
  price: "text-accent-foreground dark:text-accent-foreground",
};

export function PostTypeBadge({ type, className, variant = "default" }: PostTypeBadgeProps) {
  const Icon = POST_TYPE_ICON[type];
  if (variant === "overlay") {
    return (
      <span
        className={cn(
          "bg-background/95 ring-foreground/5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 backdrop-blur-md",
          "dark:bg-foreground/90 dark:ring-background/20",
          TYPE_OVERLAY[type],
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {POST_TYPE_LABEL[type]}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        TYPE_STYLES[type],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {POST_TYPE_LABEL[type]}
    </span>
  );
}
