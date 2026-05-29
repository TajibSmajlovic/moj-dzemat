import { Form, useNavigation } from "react-router";

import { getFormProps, getTextareaProps, useForm, type SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { Send } from "lucide-react";

import { HoneypotInputs } from "#app/components/forms/honeypot";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { Label } from "#app/components/ui/label";
import { Textarea } from "#app/components/ui/textarea";
import { QaSubmitSchema } from "#app/features/qa/qa-schema";
import { cn } from "#app/lib/cn";
import type { HoneypotToken } from "#app/lib/honeypot";

type QaQuestionFormProps = {
  honeypot: HoneypotToken;
  lastResult: SubmissionResult<string[]> | null;
  rateLimited?: boolean;
  formId?: string;
};

export function QaQuestionForm({
  honeypot,
  lastResult,
  rateLimited = false,
  formId = "qa-submit-form",
}: QaQuestionFormProps) {
  const navigation = useNavigation();
  const [form, fields] = useForm({
    id: formId,
    lastResult,
    shouldValidate: "onInput",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: QaSubmitSchema });
    },
  });

  const submitting = navigation.state !== "idle";
  const questionErrors = fields.question.errors;
  const questionErrorId = questionErrors?.length ? `${fields.question.id}-error` : undefined;
  const questionHintId = `${fields.question.id}-hint`;

  return (
    <div className="space-y-4">
      {rateLimited ? (
        <Alert>
          <AlertDescription>
            Previše pokušaja iz vaše mreže. Pokušajte ponovo za sat vremena.
          </AlertDescription>
        </Alert>
      ) : null}

      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors[0]}</AlertDescription>
        </Alert>
      ) : null}

      <Form method="post" {...getFormProps(form)} className="space-y-4">
        <HoneypotInputs token={honeypot} />

        <div className="space-y-1.5">
          <Label htmlFor={fields.question.id}>Vaše pitanje</Label>
          <Textarea
            {...getTextareaProps(fields.question)}
            maxLength={1000}
            placeholder="Upišite pitanje koje želite postaviti."
            aria-describedby={[questionHintId, questionErrorId].filter(Boolean).join(" ")}
            className={cn(
              "min-h-36 resize-y text-sm leading-6",
              questionErrorId && "border-destructive",
            )}
          />

          <p id={questionHintId} className="text-muted-foreground text-xs leading-5">
            Pitanja prolaze pregled administratora prije objave.
          </p>

          {questionErrorId ? (
            <p id={questionErrorId} className="text-destructive text-xs">
              {questionErrors?.[0]}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full gap-2" disabled={submitting}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Slanje…" : "Pošalji pitanje"}
        </Button>
      </Form>
    </div>
  );
}
