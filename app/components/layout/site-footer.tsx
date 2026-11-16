import { Fragment } from "react";

import { Code2, ContactRound, ExternalLink, GitPullRequest } from "lucide-react";

import { SiteLogo } from "#app/components/icons/site-logo";
import { Button } from "#app/components/ui/button";
import { dzemat, PRODUCT_NAME } from "#app/lib/branding";

const GITHUB_REPOSITORY_URL = "https://github.com/TajibSmajlovic/moj-dzemat";

const CONTRIBUTION_CONTACTS = [
  {
    name: "Tajib",
    href: "https://www.linkedin.com/in/tajibsmajlovic/",
  },
  {
    name: "Hasan",
    href: "https://www.linkedin.com/in/hasan-smajlovi%C4%87/",
  },
  {
    name: "Mustafa",
    href: "https://www.linkedin.com/in/mustafa-omerbegovi%C4%87-341015284/",
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-border/60 mt-8 border-t sm:mt-10">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <ContributionSection />

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-start">
          <SiteLogo className="h-14 sm:h-12" />

          <div className="min-w-0 space-y-1.5 text-center sm:text-left">
            <p className="font-display text-foreground text-sm leading-tight sm:text-base">
              <span className="font-bold">&copy; {PRODUCT_NAME}</span>
              <span className="text-muted-foreground mx-1.5 font-medium" aria-hidden="true">
                ·
              </span>
              <span className="text-primary font-semibold">{dzemat.name}</span>
            </p>

            <p className="text-muted-foreground max-w-full text-xs leading-relaxed lg:whitespace-nowrap">
              Džemat <span className="text-foreground/80 font-medium">{dzemat.name}</span> djeluje u
              okviru{" "}
              {dzemat.organizations.map((organization, index) => (
                <Fragment key={organization.name}>
                  {index > 0 ? (
                    <>
                      {" "}
                      <span className="text-primary/50" aria-hidden="true">
                        /
                      </span>{" "}
                    </>
                  ) : null}
                  {organization.url ? (
                    <a
                      href={organization.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:text-primary/80 focus-visible:ring-ring rounded-sm font-medium underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      {organization.nameGenitive}
                    </a>
                  ) : (
                    <span className="text-foreground/80 font-medium">
                      {organization.nameGenitive}
                    </span>
                  )}
                </Fragment>
              ))}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ContributionSection() {
  return (
    <section
      aria-label="Doprinos projektu"
      className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
    >
      <div className="border-secondary/30 bg-accent/30 border-t-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="bg-background/80 text-primary mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase shadow-xs">
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              Open Source
            </span>

            <p className="text-muted-foreground mt-2 text-sm leading-6 text-pretty">
              Ako želite pomoći u razvoju, prijaviti grešku ili predložiti novu funkcionalnost, sve
              tehničke upute, način pokretanja projekta i pravila za doprinos nalaze se na GitHubu.
            </p>
          </div>

          <Button asChild className="w-full rounded-full px-5 shadow-sm sm:w-auto">
            <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noreferrer noopener">
              <GitPullRequest className="h-4 w-4" aria-hidden="true" />
              Upute na GitHubu
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </a>
          </Button>
        </div>

        <div className="border-border/70 mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs font-medium">
            Za pitanja ili dogovor možete se javiti:
          </p>

          <div className="flex flex-wrap gap-1">
            {CONTRIBUTION_CONTACTS.map((contact) => (
              <a
                key={contact.href}
                href={contact.href}
                target="_blank"
                rel="noreferrer noopener"
                className="border-border bg-background/75 text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <ContactRound className="text-primary h-3.5 w-3.5" aria-hidden="true" />
                {contact.name}
                <ExternalLink className="h-2 w-2 opacity-60" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
