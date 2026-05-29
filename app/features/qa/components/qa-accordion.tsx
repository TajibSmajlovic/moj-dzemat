import { useId, useState } from "react";
import { Link } from "react-router";

import { ChevronDown } from "lucide-react";

import { ShareButton } from "#app/features/posts/components/share-button";
import { cn } from "#app/lib/cn";
import { qaQuestionHref } from "#app/lib/routes";

type QaAccordionItem = {
  id: string;
  question: string;
  answer: string;
};

type QaAccordionProps = {
  questions: QaAccordionItem[];
  className?: string;
};

export function QaAccordion({ questions, className }: QaAccordionProps) {
  const accordionId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  if (questions.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {questions.map((item) => {
        const href = qaQuestionHref(item.id);
        const isOpen = openId === item.id;
        const panelId = `${accordionId}-${item.id}`;

        return (
          <article
            key={item.id}
            data-open={isOpen ? "true" : undefined}
            className="group border-border bg-card rounded-lg border px-4 py-3 shadow-xs transition-[border-color,background-color,box-shadow] duration-300 ease-out data-[open=true]:shadow-sm"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full cursor-pointer items-start gap-3 text-left"
              onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
            >
              <span
                aria-hidden="true"
                className="bg-primary mt-2 size-2 shrink-0 rounded-full transition-transform duration-300 ease-out group-data-[open=true]:scale-125"
              />
              <span className="text-foreground min-w-0 flex-1 text-sm leading-6 font-semibold text-pretty sm:text-base">
                {item.question}
              </span>
              <ChevronDown
                className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-300 ease-out group-data-[open=true]:rotate-180"
                aria-hidden="true"
              />
            </button>

            <div
              id={panelId}
              aria-hidden={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "text-muted-foreground mt-3 space-y-3 pl-5 transition-transform duration-300 ease-out motion-reduce:transition-none",
                    isOpen ? "translate-y-0" : "-translate-y-1",
                  )}
                >
                  <p className="text-sm leading-6 whitespace-pre-wrap sm:text-base">
                    {item.answer}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ShareButton path={href} tabIndex={isOpen ? undefined : -1} />
                    <Link
                      to={href}
                      prefetch="intent"
                      tabIndex={isOpen ? undefined : -1}
                      className="text-primary inline-flex h-8 items-center px-1 text-sm font-medium hover:underline"
                    >
                      Otvori
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
