import { href, Link } from "react-router";

import { ArrowRight } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { QaAccordion } from "#app/features/qa/components/qa-accordion";
import type { PublicQuestion } from "#app/features/qa/qa.server";
import { PublicTransitionLink } from "#app/features/view-transitions/public-transition-link";

type QaHomePreviewProps = {
  questions: PublicQuestion[];
};

export function QaHomePreview({ questions }: QaHomePreviewProps) {
  return (
    <section
      aria-labelledby="qa-home-preview-heading"
      className="border-border/60 mt-8 border-t border-b py-8 sm:mt-10 sm:py-10"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_2fr] lg:gap-8">
        <div className="space-y-3">
          <p className="text-secondary text-xs font-semibold tracking-[0.14em] uppercase">
            Odgovori na vaša pitanja
          </p>
          <h2
            id="qa-home-preview-heading"
            className="font-display text-foreground text-2xl leading-tight font-semibold text-balance sm:text-3xl"
          >
            Pitanja i odgovori
          </h2>
          <p className="text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
            Pogledajte najnovije odgovore na pitanja ili{" "}
            <Link
              to={`${href("/pitanja-i-odgovori")}#postavi-pitanje`}
              prefetch="intent"
              className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
            >
              postavite
            </Link>{" "}
            svoje pitanje.
          </p>
        </div>

        {questions.length > 0 ? (
          <QaAccordion questions={questions} />
        ) : (
          <div className="border-border/60 bg-card rounded-lg border p-5 shadow-xs">
            <p className="text-muted-foreground text-sm leading-6">
              Još nema odgovora. Pitanja se objavljuju nakon što admin pripremi odgovor. Ako imate
              pitanje, slobodno ga{" "}
              <Link
                to={`${href("/pitanja-i-odgovori")}#postavi-pitanje`}
                prefetch="intent"
                className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
              >
                postavite
              </Link>{" "}
              i mi ćemo u najkraćem mogućem roku pripremiti odgovor.
            </p>
          </div>
        )}
      </div>

      {questions.length > 0 ? (
        <div className="mt-6 flex justify-center sm:mt-8">
          <Button asChild size="lg" className="rounded-full px-6 shadow-sm">
            <PublicTransitionLink to={href("/pitanja-i-odgovori")} prefetch="intent">
              Pogledaj sva pitanja
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PublicTransitionLink>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
