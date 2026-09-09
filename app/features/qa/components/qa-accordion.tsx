import { ChevronDown } from "lucide-react";

import { ShareButton } from "#app/components/share-button";
import { Accordion } from "#app/components/ui/accordion";
import { qaQuestionHref } from "#app/features/qa/qa-routes";
import { PublicTransitionLink } from "#app/platform/view-transitions/public-transition-link";

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
      itemClassName="group border-border bg-card rounded-lg border px-4 py-3 shadow-xs transition-[border-color,background-color,box-shadow] duration-300 ease-out open:shadow-sm"
      triggerClassName="flex w-full cursor-pointer items-start gap-3 text-left"
      contentClassName="text-muted-foreground mt-3 flex flex-col gap-3 pl-5 motion-safe:group-open:animate-in motion-safe:group-open:fade-in-0 motion-safe:group-open:slide-in-from-top-1 motion-safe:group-open:duration-300"
      renderTrigger={(item) => (
        <>
          <span
            aria-hidden="true"
            className="bg-primary mt-2 size-2 shrink-0 rounded-full transition-transform duration-300 ease-out group-open:scale-125 motion-reduce:transition-none"
          />
          <span className="text-foreground min-w-0 flex-1 text-sm leading-6 font-semibold text-pretty sm:text-base">
            {item.question}
          </span>
          <ChevronDown
            className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-300 ease-out group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </>
      )}
      renderContent={(item) => {
        const href = qaQuestionHref(item.id);

        return (
          <>
            <p className="text-sm leading-6 whitespace-pre-wrap sm:text-base">{item.answer}</p>
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton path={href} />
              <PublicTransitionLink
                to={href}
                prefetch="intent"
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
