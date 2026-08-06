import { ChevronDown } from "lucide-react";

import { Accordion } from "#app/components/ui/accordion";
import { ShareButton } from "#app/features/posts/components/share-button";
import { qaQuestionHref } from "#app/features/qa/qa-routes";
import { PublicTransitionLink } from "#app/features/view-transitions/public-transition-link";
import { cn } from "#app/lib/cn";

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
  if (questions.length === 0) return null;

  return (
    <Accordion
      items={questions}
      getItemId={(item) => item.id}
      className={className}
      itemClassName="group border-border bg-card rounded-lg border px-4 py-3 shadow-xs transition-[border-color,background-color,box-shadow] duration-300 ease-out data-[open=true]:shadow-sm"
      triggerClassName="flex w-full cursor-pointer items-start gap-3 text-left"
      contentClassName={({ isOpen }) =>
        cn(
          "text-muted-foreground mt-3 space-y-3 pl-5 transition-transform duration-300 ease-out motion-reduce:transition-none",
          isOpen ? "translate-y-0" : "-translate-y-1",
        )
      }
      renderTrigger={({ item }) => (
        <>
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
        </>
      )}
      renderContent={({ item, isOpen }) => {
        const href = qaQuestionHref(item.id);

        return (
          <>
            <p className="text-sm leading-6 whitespace-pre-wrap sm:text-base">{item.answer}</p>
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton path={href} tabIndex={isOpen ? undefined : -1} />
              <PublicTransitionLink
                to={href}
                prefetch="intent"
                tabIndex={isOpen ? undefined : -1}
                className="text-primary inline-flex h-8 items-center px-1 text-sm font-medium hover:underline"
              >
                Otvori
              </PublicTransitionLink>
            </div>
          </>
        );
      }}
    />
  );
}
