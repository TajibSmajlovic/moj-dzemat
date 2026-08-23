import { MessageCircleQuestion } from "lucide-react";

import { JsonLdScript } from "#app/components/seo/json-ld-script";
import { ShareButton } from "#app/components/share-button";
import { QaAccordion } from "#app/features/qa/components/qa-accordion";
import { qaQuestionHref } from "#app/features/qa/qa-routes";
import { qaSingleQuestionJsonLd } from "#app/features/qa/qa-seo";
import type { PublicQuestion } from "#app/features/qa/qa.server";
import { formatDateShort, toIsoDate } from "#app/lib/date";

type QaDetailArticleProps = {
  question: PublicQuestion;
  related: PublicQuestion[];
};

export function QaDetailArticle({ question, related }: QaDetailArticleProps) {
  return (
    <>
      <JsonLdScript
        value={qaSingleQuestionJsonLd({
          question: question.question,
          answer: question.answer,
        })}
      />

      <article className="border-border bg-card rounded-lg border p-5 shadow-sm sm:p-7">
        <div className="text-primary mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
          <MessageCircleQuestion className="size-4" aria-hidden="true" />
          Pitanje
        </div>

        <h1 className="font-display text-foreground text-2xl leading-tight font-semibold text-balance sm:text-4xl">
          {question.question}
        </h1>

        <time
          dateTime={toIsoDate(question.answeredAt)}
          className="text-muted-foreground mt-3 block text-sm"
        >
          Odgovoreno {formatDateShort(question.answeredAt)}
        </time>

        <div className="bg-border my-6 h-px" />

        <div className="text-foreground/90 text-base leading-8 whitespace-pre-wrap">
          {question.answer}
        </div>

        <div className="mt-6">
          <ShareButton path={qaQuestionHref(question.id)} />
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-10 space-y-4" aria-labelledby="related-qa-heading">
          <div className="space-y-1">
            <h2
              id="related-qa-heading"
              className="font-display text-foreground text-xl font-semibold sm:text-2xl"
            >
              Ostala pitanja
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Još nekoliko javno odgovorenih pitanja iz iste rubrike.
            </p>
          </div>

          <QaAccordion questions={related} />
        </section>
      ) : null}
    </>
  );
}
