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
 * Colour-coded chip that telegraphs which of the four post kinds a card
 * represents. Colours are mapped to our semantic tokens so the `.dark`
 * palette flips without touching this file.
 */
const TYPE_STYLES: Record<PostTypeValue, string> = {
  obavijest: "bg-primary/10 text-primary",
  smrtovnica: "bg-foreground/8 text-foreground/60",
  sergija: "bg-[hsl(var(--emerald-glow)/0.18)] text-[hsl(var(--emerald-deep))]",
  hutba: "bg-secondary/15 text-[hsl(var(--gold-foreground))]",
  price: "bg-[hsl(var(--indigo-glow)/0.15)] text-[hsl(var(--indigo-deep))]",
};

/**
 * When the badge floats on a photo we drop the tinted background and
 * rely on a soft cream chip with just the accent-coloured label.
 */
const TYPE_OVERLAY: Record<PostTypeValue, string> = {
  obavijest: "text-primary",
  smrtovnica: "text-foreground/60",
  sergija: "text-[hsl(var(--emerald-deep))]",
  hutba: "text-[hsl(var(--gold-foreground))]",
  price: "text-[hsl(var(--indigo-deep))]",
};

export function PostTypeBadge({ type, className, variant = "default" }: PostTypeBadgeProps) {
  const Icon = POST_TYPE_ICON[type];
  if (variant === "overlay") {
    return (
      <span
        className={cn(
          "bg-background/95 ring-foreground/5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 backdrop-blur-md",
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
