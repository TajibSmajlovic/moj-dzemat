import { Form } from "react-router";

import {
  getFormProps,
  getInputProps,
  getTextareaProps,
  useForm,
  type SubmissionResult,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";

import { Field } from "#app/components/forms/field";
import { FormActions } from "#app/components/forms/form-actions";
import { Button } from "#app/components/ui/button";
import { Checkbox } from "#app/components/ui/checkbox";
import { Label } from "#app/components/ui/label";
import { Textarea } from "#app/components/ui/textarea";
import type { ImportantDateRow } from "#app/features/important-dates/admin/components/important-date-list";
import { ImportantDateIntents } from "#app/features/important-dates/admin/important-date-intents";
import {
  DESCRIPTION_MAX,
  ImportantDateFormSchema,
  TITLE_MAX,
} from "#app/features/important-dates/important-date-schema";
import { cn } from "#app/lib/cn";
import { dateToYmd } from "#app/lib/date";
import { IntentInput } from "#app/lib/intent";

type Props = {
  importantDate: ImportantDateRow | null;
  lastResult: SubmissionResult<string[]> | null;
  submitting: boolean;
  onCancel: VoidFunction;
};

export function ImportantDateForm({ importantDate, lastResult, submitting, onCancel }: Props) {
  const [form, fields] = useForm({
    id: importantDate ? `important-date-${importantDate.id}` : "important-date-new",
    lastResult,
    defaultValue: importantDate
      ? {
          title: importantDate.title,
          date: dateToYmd(importantDate.date),
          description: importantDate.description ?? "",
          recursYearly: importantDate.recursYearly ? "on" : undefined,
        }
      : undefined,
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ImportantDateFormSchema });
    },
  });

  const descriptionErrorId = fields.description.errors?.length
    ? `${fields.description.id}-error`
    : undefined;

  return (
    <Form method="post" {...getFormProps(form)} className="flex h-full flex-col">
      <IntentInput
        intent={importantDate ? ImportantDateIntents.Update : ImportantDateIntents.Create}
      />
      {importantDate ? <input type="hidden" name="id" value={importantDate.id} /> : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <Field
          label="Naslov"
          errors={fields.title.errors}
          inputProps={{
            ...getInputProps(fields.title, { type: "text" }),
            maxLength: TITLE_MAX,
            placeholder: "npr. Bajram namaz",
          }}
        />

        <Field
          label="Datum"
          errors={fields.date.errors}
          inputProps={getInputProps(fields.date, { type: "date" })}
        />

        <div className="space-y-1.5">
          <Label htmlFor={fields.description.id}>Opis (nije obavezno)</Label>
          <Textarea
            {...getTextareaProps(fields.description)}
            maxLength={DESCRIPTION_MAX}
            rows={4}
            placeholder="Kratak opis koji se prikazuje uz datum…"
            aria-invalid={descriptionErrorId ? true : undefined}
            aria-describedby={descriptionErrorId}
            className={cn(descriptionErrorId && "border-destructive")}
          />
          {descriptionErrorId ? (
            <p id={descriptionErrorId} className="text-destructive text-xs">
              {fields.description.errors?.[0]}
            </p>
          ) : null}
        </div>

        <div className="border-border/70 flex items-start gap-3 rounded-xl border p-3.5">
          <Checkbox
            id={fields.recursYearly.id}
            name={fields.recursYearly.name}
            value="on"
            defaultChecked={fields.recursYearly.initialValue === "on"}
            aria-describedby={`${fields.recursYearly.id}-description`}
          />
          <div className="space-y-1">
            <Label htmlFor={fields.recursYearly.id} className="cursor-pointer text-sm font-medium">
              Ponavlja se svake godine
            </Label>
            <p
              id={`${fields.recursYearly.id}-description`}
              className="text-muted-foreground text-xs leading-5"
            >
              Prikazuje se istog dana i mjeseca svake godine, počevši od odabrane godine.
            </p>
          </div>
        </div>
      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Odustani
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Spremanje…" : importantDate ? "Spremi izmjene" : "Sačuvaj"}
        </Button>
      </FormActions>
    </Form>
  );
}
