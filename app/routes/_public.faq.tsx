import { Link } from "react-router";

import { ChevronRight } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { Label } from "#app/components/ui/label";
import { Textarea } from "#app/components/ui/textarea";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";

import type { Route } from "./+types/_public.faq";

const PREVIEW_COUNT = 5;

const MOCK_QUESTIONS = [
  {
    id: "mock-1",
    question: "Kada su namazi u dzamiji tokom sedmice?",
    answer: "Namazi se obavljaju po vaktiji. Tacan raspored objavljujemo sedmicno.",
  },
  {
    id: "mock-2",
    question: "Kako se mogu prijaviti kao clan dzemata?",
    answer: "Prijava je moguca licno u kancelariji dzemata ili putem nase stranice.",
  },
  {
    id: "mock-3",
    question: "Da li dzamija ima prostorije za dzenaze?",
    answer: "Dzamija raspolaze s prostorom za dzenaze. Kontaktirajte imama za detalje.",
  },
  {
    id: "mock-4",
    question: "Postoji li mekteb za djecu?",
    answer: "Mekteb se odrzava vikendom. Raspored dobijete nakon prijave.",
  },
  {
    id: "mock-5",
    question: "Kako mogu kontaktirati imama dzemata?",
    answer: "Imama mozete kontaktirati telefonom ili preko kontakt forme.",
  },
];

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: formatPageTitle("Cesta pitanja", getRootSiteName(matches)) }];
}
export default function FaqPage() {
  const displayQuestions = MOCK_QUESTIONS.slice(0, PREVIEW_COUNT);
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-8 space-y-2">
        <h1 className="font-display text-foreground text-3xl font-semibold sm:text-4xl">
          Cesta
          <span className="text-primary block">pitanja</span>
        </h1>

        <p className="text-muted-foreground pt-2 text-sm sm:text-base">
          Pronadite odgovore na najcesca pitanja ili nam postavite novo pitanje.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <section className="space-y-4">
          {displayQuestions.length > 0 ? (
            <div className="space-y-3">
              {displayQuestions.map((item, index) => (
                <details
                  key={item.id}
                  className="border-border/60 bg-card group rounded-lg border p-4 shadow-sm"
                  open={index === 0}
                >
                  <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold sm:text-base">
                    <span className="flex items-center gap-2">
                      <span className="bg-primary/70 mt-1 size-1.5 rounded-full" />
                      {item.question}
                    </span>
                    <ChevronRight className="text-muted-foreground size-4 transition group-open:rotate-90" />
                  </summary>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Trenutno nema objavljenih odgovora.</p>
          )}

          <Button type="button" className="w-full">
            <Link
              to="/faq/sve"
              className="flex h-15 items-center justify-center gap-2 text-sm font-medium"
            >
              Pogledajte sva pitanja
            </Link>
          </Button>
        </section>

        <section className="border-border/60 bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-4 space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Postavite pitanje
            </p>
            <h2 className="text-foreground text-lg font-semibold">Niste pronasli odgovor?</h2>
            <p className="text-muted-foreground text-sm">
              Vase pitanje ce pregledati administrator prije objave.
            </p>
          </div>

          <form className="space-y-4 pt-1">
            <div className="space-y-1.5f">
              <Label htmlFor="faq-question" className="pb-1 text-sm font-medium">
                Pitanje
              </Label>
              <Textarea
                className="h-41 pt-2 pl-1 text-sm"
                id="faq-question"
                name="question"
                placeholder="Upisite pitanje koje zelite postaviti."
              />
            </div>

            <Button type="button" className="w-full">
              Posalji pitanje
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
