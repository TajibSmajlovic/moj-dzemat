import { data, href, useNavigation } from "react-router";

import { parseWithZod } from "@conform-to/zod/v4";

import { AdminPageHeader } from "#app/components/admin/admin-page-header";
import { AdminPanel } from "#app/components/admin/admin-panel";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { adminUserContext } from "#app/features/auth/auth-context";
import { QaAnswerForm } from "#app/features/qa/admin/components/qa-answer-form";
import { parseAdminQuestionTab } from "#app/features/qa/admin/qa-admin-tabs";
import { saveAdminQuestionAnswer } from "#app/features/qa/admin/qa-admin.server";
import { adminQaHref } from "#app/features/qa/qa-routes";
import { QaAnswerSchema } from "#app/features/qa/qa-schema";
import { getAdminQuestionById } from "#app/features/qa/qa.server";
import { requireId } from "#app/lib/id";
import { invariantResponse } from "#app/lib/invariant";
import { ROBOTS_NOINDEX_NOFOLLOW, buildNoindexMeta } from "#app/lib/seo";
import { createActionToast } from "#app/lib/toast";
import { redirectWithToast } from "#app/server/toast.server";

import type { Route } from "./+types/admin.pitanja.$id";

const QUESTION_ID_OPTIONS = {
  message: "Pitanje nije pronađeno.",
  responseInit: { status: 404 },
};

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.question?.answer
    ? "Uredi odgovor · Admin"
    : "Odgovori na pitanje · Admin";

  return buildNoindexMeta(title, ROBOTS_NOINDEX_NOFOLLOW);
}

export async function loader({ context, params, url }: Route.LoaderArgs) {
  context.get(adminUserContext);

  const id = requireId(params.id, QUESTION_ID_OPTIONS);
  const question = await getAdminQuestionById(id);

  invariantResponse(question, "Pitanje nije pronađeno.", { status: 404 });

  const fromTab = parseAdminQuestionTab(url.searchParams.get("from"));

  return {
    question,
    fromTab,
    backTo: adminQaHref({ tab: fromTab }),
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const user = context.get(adminUserContext);
  const id = requireId(params.id, QUESTION_ID_OPTIONS);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: QaAnswerSchema });

  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { wasAnswered } = await saveAdminQuestionAnswer({
    questionId: id,
    answer: submission.value.answer,
    userId: user.id,
  });

  return redirectWithToast(
    adminQaHref({ tab: "odgovorena" }),
    createActionToast({
      action: wasAnswered ? "update" : "create",
      description: wasAnswered ? "Odgovor je ažuriran." : "Odgovor je sačuvan i objavljen.",
    }),
  );
}

export default function AdminQaAnswerPage({ actionData, loaderData }: Route.ComponentProps) {
  const { question, backTo } = loaderData;
  const navigation = useNavigation();

  const submitting = navigation.state === "submitting";
  const answered = question.answer !== null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <AdminPageHeader
        className="mb-6"
        backTo={backTo}
        backLabel="Nazad na pitanja"
        title={answered ? "Uredi odgovor" : "Odgovori na pitanje"}
        description="Odgovor postaje javan tek kada ga sačuvate."
      />

      <AdminPanel>
        <QaAnswerForm
          question={question}
          lastResult={actionData && "result" in actionData ? actionData.result : null}
          submitting={submitting}
          cancelTo={backTo}
        />
      </AdminPanel>
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <SegmentErrorBoundary
      error={error}
      tone="admin"
      backTo={href("/admin/pitanja")}
      backLabel="Nazad na pitanja"
    />
  );
}
