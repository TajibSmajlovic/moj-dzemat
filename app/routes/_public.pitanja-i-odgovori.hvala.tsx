import { href } from "react-router";

import { CheckCircle2, Home, MessageCirclePlus } from "lucide-react";

import { PageMain } from "#app/components/layout/page-main";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { buildNoindexMeta } from "#app/lib/seo";
import { PublicTransitionLink } from "#app/platform/view-transitions/public-transition-link";

import type { Route } from "./+types/_public.pitanja-i-odgovori.hvala";

export function meta({ matches }: Route.MetaArgs) {
  return buildNoindexMeta(formatPageTitle("Pitanje poslano", getRootSiteName(matches)));
}

export default function QaThankYouPage() {
  return (
    <PageMain className="min-h-page-centered flex items-center py-8 sm:py-12">
      <section className="border-border/70 bg-card mx-auto w-full max-w-xl rounded-lg border p-5 text-center shadow-sm sm:p-7">
        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-lg">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-2">
          <h1 className="font-display text-foreground text-2xl font-semibold text-balance">
            Vaše pitanje je poslano.
          </h1>
          <p className="text-muted-foreground text-sm leading-6 sm:text-base">
            Admin će pregledati pitanje i objaviti odgovor čim bude u mogućnosti.
          </p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button asChild className="gap-2">
            <PublicTransitionLink to={href("/pitanja-i-odgovori")}>
              <MessageCirclePlus className="h-4 w-4" aria-hidden="true" />
              Postavi još jedno pitanje
            </PublicTransitionLink>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <PublicTransitionLink to={href("/")}>
              <Home className="h-4 w-4" aria-hidden="true" />
              Nazad na početnu
            </PublicTransitionLink>
          </Button>
        </div>
      </section>
    </PageMain>
  );
}
