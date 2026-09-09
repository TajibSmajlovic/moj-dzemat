import { useId, type ReactNode } from "react";

import { cn } from "#app/lib/cn";

type AccordionProps<TItem> = {
  items: TItem[];
  getItemId: (item: TItem) => string;
  renderTrigger: (item: TItem) => ReactNode;
  renderContent: (item: TItem) => ReactNode;
  className?: string;
  itemClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
};

export function Accordion<TItem>({
  items,
  getItemId,
  renderTrigger,
  renderContent,
  className,
  itemClassName,
  triggerClassName,
  contentClassName,
}: AccordionProps<TItem>) {
  const accordionId = useId();

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const itemId = getItemId(item);
        const triggerId = `${accordionId}-${itemId}-trigger`;

        return (
          <details key={itemId} name={accordionId} className={itemClassName}>
            <summary
              id={triggerId}
              className={cn(
                "focus-visible:ring-ring list-none rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden",
                triggerClassName,
              )}
            >
              {renderTrigger(item)}
            </summary>

            <div role="region" aria-labelledby={triggerId} className={contentClassName}>
              {renderContent(item)}
            </div>
          </details>
        );
      })}
    </div>
  );
}
