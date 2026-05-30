import { useMemo, useState } from "react";
import { Form, Link } from "react-router";

import { getFormProps, getTextareaProps, useForm, type SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { Save } from "lucide-react";

import { FormActions } from "#app/components/forms/form-actions";
import { Button } from "#app/components/ui/button";
import { Label } from "#app/components/ui/label";
import { Textarea } from "#app/components/ui/textarea";
import { QaQuestionStatusBadge } from "#app/features/qa/admin/components/qa-question-status-badge";
import { QA_ANSWER_MAX_LENGTH, QaAnswerSchema } from "#app/features/qa/qa-schema";
import type { AdminQuestionRow } from "#app/features/qa/qa.server";
import { cn } from "#app/lib/cn";
import { formatDateShort } from "#app/lib/date";

type QaAnswerFormProps = {
  question: AdminQuestionRow;
  lastResult: SubmissionResult<string[]> | null;
  submitting: boolean;
  cancelTo: string;
};

export function QaAnswerForm({ question, lastResult, submitting, cancelTo }: QaAnswerFormProps) {
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [form, fields] = useForm({
    id: `qa-answer-${question.id}`,
    lastResult,
    defaultValue: { answer: question.answer ?? "" },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: QaAnswerSchema });
    },
  });

  const answerErrors = fields.answer.errors;
  const answerErrorId = answerErrors?.length ? `${fields.answer.id}-error` : undefined;
  const answerHintId = `${fields.answer.id}-hint`;

  const { defaultValue: _defaultValue, ...answerTextareaProps } = useMemo(
    () => getTextareaProps(fields.answer),
    [fields.answer],
  );

  return (
    <Form method="post" {...getFormProps(form)} className="flex flex-col">
      <div className="space-y-5 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <QaQuestionStatusBadge question={question} />
          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
            Poslano {formatDateShort(question.createdAt)}
          </span>
        </div>

        <section className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Pitanje
          </p>
          <div className="border-border/70 bg-muted/40 text-foreground rounded-xl border px-4 py-3 text-sm leading-6 whitespace-pre-wrap">
            {question.question}
          </div>
        </section>

        <div className="space-y-1.5">
          <Label htmlFor={fields.answer.id}>Odgovor</Label>
          <Textarea
            {...answerTextareaProps}
            value={answer}
            maxLength={QA_ANSWER_MAX_LENGTH}
            placeholder="Upišite odgovor koji će biti prikazan javno."
            aria-describedby={[answerHintId, answerErrorId].filter(Boolean).join(" ")}
            onChange={(event) => setAnswer(event.currentTarget.value)}
            className={cn(
              "min-h-64 resize-y text-sm leading-6",
              answerErrorId && "border-destructive",
            )}
          />

          <div
            id={answerHintId}
            className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs leading-5"
          >
            <span>Odgovor se prikazuje kao običan tekst, s očuvanim prelomima redova.</span>
            <span className="font-medium tabular-nums">
              {answer.length}/{QA_ANSWER_MAX_LENGTH}
            </span>
          </div>

          {answerErrorId ? (
            <p id={answerErrorId} className="text-destructive text-xs">
              {answerErrors?.[0]}
            </p>
          ) : null}
        </div>
      </div>

      <FormActions>
        <Button type="button" variant="ghost" asChild>
          <Link to={cancelTo}>Odustani</Link>
        </Button>
        <Button type="submit" className="gap-2" disabled={submitting}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Spremanje…" : "Spremi odgovor"}
        </Button>
      </FormActions>
    </Form>
  );
}
