import { useEffect, useState } from "react";
import { data, href, Link, redirect } from "react-router";

import { parseWithZod } from "@conform-to/zod/v4";
import { ChevronDown, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

import { PageMain } from "#app/components/layout/page-main";
import { Button } from "#app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#app/components/ui/sheet";
import { QaAccordion } from "#app/features/qa/components/qa-accordion";
import { QaPageJsonLd } from "#app/features/qa/components/qa-page-json-ld";
import { QaQuestionForm } from "#app/features/qa/components/qa-question-form";
import { qaListHref } from "#app/features/qa/qa-routes";
import { QaSubmitSchema } from "#app/features/qa/qa-schema";
import {
  QA_PAGE_SIZE,
  countPublicAnsweredQuestions,
  getPublicAnsweredQuestions,
} from "#app/features/qa/qa.server";
import { useSuppressPublicRouteMotion } from "#app/features/view-transitions/public-view-transition-provider";
import { formatPageTitle, getRootSiteName, getRootSiteUrl } from "#app/lib/branding";
import { sectionReveal, softFade } from "#app/lib/motion";
import { getLoadMorePaginationState, parsePageParam } from "#app/lib/pagination";
import {
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  buildPublicPageMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { absoluteUrl } from "#app/lib/url";
import { prisma } from "#app/server/db.server";
import { assertHoneypot, honeypotToken } from "#app/server/honeypot.server";
import { logger } from "#app/server/logger.server";
import { getClientIp, qaQuestionLimiter } from "#app/server/rate-limit.server";

import type { Route } from "./+types/_public.pitanja-i-odgovori._index";

const QA_ASK_HASH = "postavi-pitanje";

export function meta({ matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);
  const siteUrl = getRootSiteUrl(matches);
  const title = formatPageTitle("Pitanja i odgovori", siteName);
  const description =
    "Pošaljite svoje pitanje ili pogledajte odgovore na ranija pitanja džematlija.";
  const canonical = siteUrl
    ? absoluteUrl(siteUrl, href("/pitanja-i-odgovori"))
    : href("/pitanja-i-odgovori");

  return buildPublicPageMeta({
    title,
    description,
    canonical,
    siteName,
    imageUrl: getDefaultSocialImageUrl(siteUrl),
    imageAlt: formatDefaultSocialImageAlt(siteName),
    robots: ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  });
}

export async function loader({ url }: Route.LoaderArgs) {
  const page = parsePageParam(url.searchParams.get("page"));
  const totalQuestions = await countPublicAnsweredQuestions();
  const pagination = getLoadMorePaginationState({
    page,
    pageSize: QA_PAGE_SIZE,
    totalItems: totalQuestions,
  });

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    return redirect(qaListHref({ page: pagination.totalPages }));
  }

  const questions =
    totalQuestions > 0 ? await getPublicAnsweredQuestions({ take: pagination.take }) : [];

  return { honeypot: honeypotToken(), questions, pagination };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  assertHoneypot(formData);

  const ip = getClientIp(request);
  const limit = qaQuestionLimiter.check(ip);
  if (!limit.ok) {
    logger.warn("qa submission rate limited");
    return data({ result: null, ok: false, rateLimited: true } as const, { status: 429 });
  }

  const submission = parseWithZod(formData, { schema: QaSubmitSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply(), ok: false, rateLimited: false } as const, {
      status: 400,
    });
  }

  await prisma.question.create({
    data: { question: submission.value.question },
  });

  logger.info({ ip, length: submission.value.question.length }, "qa question submitted");

  return redirect(href("/pitanja-i-odgovori/hvala"), { status: 303 });
}

export default function QaIndexPage({ actionData, loaderData }: Route.ComponentProps) {
  const { questions, pagination } = loaderData;
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const suppressRouteMotion = useSuppressPublicRouteMotion();

  useEffect(() => {
    const shouldOpen =
      globalThis.location.hash === `#${QA_ASK_HASH}` || Boolean(actionData && !actionData.ok);
    const isMobile = globalThis.matchMedia("(max-width: 1023px)").matches;
    if (!shouldOpen || !isMobile) return;

    const frame = requestAnimationFrame(() => setMobileFormOpen(true));

    return () => cancelAnimationFrame(frame);
  }, [actionData]);

  return (
    <>
      <QaPageJsonLd items={questions} />

      <PageMain>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] lg:items-start">
          <motion.section
            {...softFade}
            initial={suppressRouteMotion ? false : softFade.initial}
            className="space-y-6"
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-secondary text-xs font-semibold tracking-[0.14em] uppercase">
                  Pitanja džematlija
                </p>
                <h1 className="font-display text-foreground text-2xl leading-tight font-semibold text-balance sm:text-3xl">
                  Pitanja i odgovori
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                  Pošaljite svoje pitanje ili pogledajte odgovore na ranija pitanja džematlija.
                </p>
              </div>

              <div className="border-border/60 bg-card/70 hidden gap-4 rounded-lg border p-4 shadow-xs sm:grid sm:grid-cols-2">
                <div className="flex gap-3">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                    <MessageCircleQuestion className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-sm font-semibold">Jedno pitanje</h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      Forma prima samo tekst pitanja, bez imena, e-maila ili drugih podataka.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-secondary/10 text-secondary flex size-9 shrink-0 items-center justify-center rounded-md">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-sm font-semibold">Pregled prije objave</h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      Odgovor postaje javan tek kada ga admin pregleda i objavi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {questions.length > 0 ? (
              <section aria-label="Odgovorena pitanja" className="space-y-5">
                <QaAccordion questions={questions} />

                {pagination.hasNextPage ? (
                  <div className="flex justify-center pt-1">
                    <Button asChild size="lg" className="rounded-full px-6 shadow-sm">
                      <Link
                        to={qaListHref({ page: pagination.page + 1 })}
                        preventScrollReset
                        prefetch="intent"
                      >
                        Učitaj još
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : (
              <div className="border-border/60 bg-card rounded-lg border p-6 text-center shadow-xs sm:p-8">
                <p className="text-muted-foreground text-sm leading-6 sm:text-base">
                  Još nema odgovorenih pitanja. Budite prvi koji će postaviti pitanje.
                </p>
              </div>
            )}
          </motion.section>

          <motion.aside
            {...sectionReveal}
            initial={suppressRouteMotion ? false : sectionReveal.initial}
            id={QA_ASK_HASH}
            className="border-border/70 bg-card hidden max-h-[calc(100svh-7rem)] scroll-mt-24 overflow-y-auto rounded-lg border p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:block"
          >
            <div className="mb-4 space-y-1.5">
              <h2 className="font-display text-foreground text-xl leading-tight font-semibold">
                Postavite pitanje
              </h2>
              <p className="text-muted-foreground text-sm leading-6">
                Kratko i jasno pitanje najlakše je pregledati i odgovoriti.
              </p>
            </div>

            <QaQuestionForm
              honeypot={loaderData.honeypot}
              lastResult={actionData?.result ?? null}
              rateLimited={actionData?.rateLimited ?? false}
            />
          </motion.aside>
        </div>
      </PageMain>

      <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-full shadow-lg"
          onClick={() => setMobileFormOpen(true)}
        >
          <MessageCircleQuestion className="size-4" aria-hidden="true" />
          Postavi pitanje
        </Button>
      </div>

      <Sheet open={mobileFormOpen} onOpenChange={setMobileFormOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl p-0 lg:hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="border-border border-b px-5 py-4 text-left">
            <SheetTitle className="font-display text-xl">Postavite pitanje</SheetTitle>
            <SheetDescription>
              Kratko i jasno pitanje najlakše je pregledati i odgovoriti.
            </SheetDescription>
          </SheetHeader>
          <div className="border-border/60 bg-muted/30 mx-5 mt-4 grid gap-3 rounded-lg border p-3">
            <div className="flex gap-3">
              <MessageCircleQuestion
                className="text-primary mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p className="text-muted-foreground text-sm leading-5">
                Forma prima samo tekst pitanja, bez imena, e-maila ili drugih podataka.
              </p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="text-secondary mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="text-muted-foreground text-sm leading-5">
                Odgovor postaje javan tek kada ga admin pregleda i objavi.
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <QaQuestionForm
              formId="qa-submit-form-mobile"
              honeypot={loaderData.honeypot}
              lastResult={actionData?.result ?? null}
              rateLimited={actionData?.rateLimited ?? false}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
