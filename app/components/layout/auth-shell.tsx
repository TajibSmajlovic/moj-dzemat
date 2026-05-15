import type { ReactNode } from "react";

import { motion } from "motion/react";

import { SiteFooter } from "#app/components/layout/site-footer";
import { SiteHeader } from "#app/components/layout/site-header";
import { AnnouncementBar } from "#app/features/announcements/components/announcement-bar";
import { sectionReveal, softFade } from "#app/lib/motion";

type PublicAuthShellProps = {
  announcement: { message: string } | null;
  isAdminLoggedIn: boolean;
  eyebrow: string;
  title: string;
  description: ReactNode;
  panelTitle: string;
  panelDescription?: ReactNode;
  details?: {
    icon: ReactNode;
    title: string;
    description: ReactNode;
  }[];
  children: ReactNode;
};

export function PublicAuthShell({
  announcement,
  isAdminLoggedIn,
  eyebrow,
  title,
  description,
  panelTitle,
  panelDescription,
  details = [],
  children,
}: PublicAuthShellProps) {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <AnnouncementBar announcement={announcement} />
      <SiteHeader isAdminLoggedIn={isAdminLoggedIn} />

      <main className="flex flex-1 flex-col">
        <section className="border-border/50 from-cream-dark/45 via-background to-background sm:from-cream-dark/55 flex flex-1 border-b bg-linear-to-b">
          <div className="mx-auto grid w-full max-w-5xl content-start gap-4 px-4 py-5 sm:gap-8 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,440px)] lg:items-center lg:py-16">
            <motion.div {...softFade} className="space-y-4 self-start sm:space-y-6">
              <div className="max-w-2xl space-y-2.5 sm:space-y-4">
                <p className="text-secondary text-[0.68rem] font-semibold tracking-[0.14em] uppercase sm:text-xs">
                  {eyebrow}
                </p>
                <h1 className="font-display text-foreground max-w-2xl text-[1.75rem] leading-[1.08] font-semibold text-balance sm:text-5xl sm:leading-tight">
                  {title}
                </h1>
                <p className="text-muted-foreground max-w-xl text-sm leading-6 text-pretty sm:text-lg sm:leading-7">
                  {description}
                </p>
              </div>

              {details.length > 0 ? (
                <div className="hidden max-w-2xl gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-1">
                  {details.map((detail) => (
                    <div
                      key={detail.title}
                      className="border-border/60 bg-card/80 flex gap-3 rounded-lg border p-4 shadow-xs"
                    >
                      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                        {detail.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-semibold">{detail.title}</p>
                        <p className="text-muted-foreground mt-1 text-sm leading-6">
                          {detail.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>

            <motion.div
              {...sectionReveal}
              className="border-border/70 bg-card self-start rounded-lg border p-4 shadow-lg sm:p-6"
            >
              <div className="mb-4 space-y-1.5 sm:mb-6 sm:space-y-2">
                <h2 className="font-display text-foreground text-xl leading-tight font-semibold sm:text-2xl">
                  {panelTitle}
                </h2>
                {panelDescription ? (
                  <p className="text-muted-foreground hidden text-sm leading-6 sm:block">
                    {panelDescription}
                  </p>
                ) : null}
              </div>

              {children}
            </motion.div>
          </div>
        </section>
      </main>

      <div className="hidden sm:block">
        <SiteFooter />
      </div>
    </div>
  );
}
