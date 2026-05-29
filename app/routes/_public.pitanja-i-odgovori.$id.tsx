import { PageMain } from "#app/components/layout/page-main";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { BreadcrumbListJsonLd } from "#app/components/seo/breadcrumb-list-json-ld";
import { BackLink } from "#app/components/ui/back-link";
import { QaDetailArticle } from "#app/features/qa/components/qa-detail-article";
import { qaExcerpt } from "#app/features/qa/qa-seo";
import { getPublicQuestionById, getRelatedPublicQuestions } from "#app/features/qa/qa.server";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { invariantResponse } from "#app/lib/invariant";
import { ROUTES, absoluteUrl, qaQuestionHref } from "#app/lib/routes";
import {
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  buildPublicPageMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { env } from "#app/server/env.server";

import type { Route } from "./+types/_public.pitanja-i-odgovori.$id";

export async function loader({ params }: Route.LoaderArgs) {
  const question = await getPublicQuestionById(params.id);
  invariantResponse(question, "Pitanje nije pronađeno.", { status: 404 });

  const related = await getRelatedPublicQuestions({ excludeId: question.id });

  return { question, related, siteUrl: env().APP_URL };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);

  if (!data) {
    return [{ title: formatPageTitle("Pitanje nije pronađeno", siteName) }];
  }

  const { question, siteUrl } = data;
  const title = formatPageTitle(qaExcerpt(question.question, 70), siteName);
  const description = qaExcerpt(question.answer, 160);
  const canonical = absoluteUrl(siteUrl, qaQuestionHref(question.id));

  return buildPublicPageMeta({
    title,
    description,
    canonical,
    siteName,
    imageUrl: getDefaultSocialImageUrl(siteUrl),
    imageAlt: formatDefaultSocialImageAlt(siteName),
    ogType: "article",
    robots: ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  });
}

export default function QaDetailPage({ loaderData }: Route.ComponentProps) {
  const { question, related, siteUrl } = loaderData;

  return (
    <PageMain className="max-w-3xl py-4 sm:py-6">
      <div className="mb-4">
        <BackLink to={ROUTES.qa} label="Sva pitanja" />
      </div>

      <QaDetailArticle question={question} related={related} />

      <BreadcrumbListJsonLd
        items={[
          { name: "Početna", url: absoluteUrl(siteUrl, ROUTES.home) },
          { name: "Pitanja i odgovori", url: absoluteUrl(siteUrl, ROUTES.qa) },
          {
            name: qaExcerpt(question.question, 70),
            url: absoluteUrl(siteUrl, qaQuestionHref(question.id)),
          },
        ]}
      />
    </PageMain>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <PageMain className="max-w-3xl py-4 sm:py-6">
      <SegmentErrorBoundary error={error} backTo={ROUTES.qa} backLabel="Pregled svih pitanja" />
    </PageMain>
  );
}
