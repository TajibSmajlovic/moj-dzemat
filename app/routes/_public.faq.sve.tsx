import { Link } from "react-router";

import { Button } from "#app/components/ui/button";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { prisma } from "#app/utils/db.server";

import type { Route } from "./+types/_public.faq.sve";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: formatPageTitle("Sva pitanja", getRootSiteName(matches)) }];
}

export async function loader() {
  const questions = await prisma.faqQuestion.findMany({
    where: {
      isPublished: true,
      answer: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      question: true,
      answer: true,
      createdAt: true,
    },
  });

  return { questions };
}

export default function FaqAllPage({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-foreground text-2xl font-semibold sm:text-3xl">
            Sva pitanja
          </h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/faq">Nazad</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Pregled svih objavljenih pitanja i odgovora.
        </p>
      </header>

      {loaderData.questions.length > 0 ? (
        <div className="space-y-3">
          {loaderData.questions.map((item) => (
            <article
              key={item.id}
              className="border-border/60 bg-card rounded-lg border p-4 shadow-sm"
            >
              <h2 className="text-foreground text-sm font-semibold sm:text-base">
                {item.question}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.answer}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Trenutno nema objavljenih pitanja.</p>
      )}
    </main>
  );
}
