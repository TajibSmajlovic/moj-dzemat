import { useId, useState, type ReactNode } from "react";

import { cn } from "#app/lib/cn";

type AccordionRenderArgs<TItem> = {
  item: TItem;
  isOpen: boolean;
  panelId: string;
  triggerId: string;
};

type ClassNameValue<TItem> =
  string | ((args: AccordionRenderArgs<TItem>) => string | undefined) | undefined;

type AccordionProps<TItem> = {
  items: TItem[];
  getItemId: (item: TItem) => string;
  renderTrigger: (args: AccordionRenderArgs<TItem>) => ReactNode;
  renderContent: (args: AccordionRenderArgs<TItem>) => ReactNode;
  className?: string;
  itemClassName?: ClassNameValue<TItem>;
  triggerClassName?: ClassNameValue<TItem>;
  panelClassName?: ClassNameValue<TItem>;
  contentClassName?: ClassNameValue<TItem>;
};

export function Accordion<TItem>({
  items,
  getItemId,
  renderTrigger,
  renderContent,
  className,
  itemClassName,
  triggerClassName,
  panelClassName,
  contentClassName,
}: AccordionProps<TItem>) {
  const accordionId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const itemId = getItemId(item);
        const isOpen = openId === itemId;
        const triggerId = `${accordionId}-${itemId}-trigger`;
        const panelId = `${accordionId}-${itemId}-panel`;
        const renderArgs = { item, isOpen, panelId, triggerId };

        return (
          <article
            key={itemId}
            data-open={isOpen ? "true" : undefined}
            className={resolveClassName(itemClassName, renderArgs)}
          >
            <button
              id={triggerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              className={resolveClassName(triggerClassName, renderArgs)}
              onClick={() => setOpenId((current) => (current === itemId ? null : itemId))}
            >
              {renderTrigger(renderArgs)}
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              aria-hidden={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0",
                resolveClassName(panelClassName, renderArgs),
              )}
            >
              <div className="overflow-hidden">
                <div className={resolveClassName(contentClassName, renderArgs)}>
                  {renderContent(renderArgs)}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function resolveClassName<TItem>(
  className: ClassNameValue<TItem>,
  args: AccordionRenderArgs<TItem>,
) {
  return typeof className === "function" ? className(args) : className;
}
