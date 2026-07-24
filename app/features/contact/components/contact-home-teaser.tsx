import { href, Link } from "react-router";

import { ArrowRight, ContactRound } from "lucide-react";

import { communityInfoHasContent, type CommunityInfoRecord } from "#app/features/contact/contact";

type Props = {
  info: CommunityInfoRecord;
};

export function ContactHomeTeaser({ info }: Props) {
  if (!communityInfoHasContent(info)) {
    return null;
  }

  return (
    <section aria-labelledby="contact-home-heading" className="border-border/60 border-b py-2">
      <Link
        to={href("/kontakt")}
        prefetch="intent"
        className="group focus-visible:ring-ring hover:bg-accent/35 -mx-2 flex min-h-24 min-w-0 items-center gap-3 rounded-xl px-2 py-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-4 sm:px-3"
      >
        <span className="border-primary/15 bg-primary/8 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full border sm:h-12 sm:w-12">
          <ContactRound className="h-5 w-5" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="text-secondary block text-xs font-semibold tracking-[0.14em] uppercase">
            Kontakt
          </span>
          <span
            id="contact-home-heading"
            role="heading"
            aria-level={2}
            className="font-display text-foreground mt-0.5 block text-xl leading-tight font-semibold text-balance sm:text-2xl"
          >
            Informacije o džematu
          </span>
          <span className="text-muted-foreground mt-1 block text-sm leading-5">
            Kontakt i javne informacije na jednom mjestu
          </span>
        </span>

        <span className="text-primary hidden shrink-0 text-sm font-semibold sm:inline">
          Pogledaj kontakt
        </span>
        <ArrowRight
          className="text-primary h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}
