import { Form } from "react-router";

import { getFormProps, getInputProps, useForm, type SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";

import { Field } from "#app/components/forms/field";
import { FormActions } from "#app/components/forms/form-actions";
import { Button } from "#app/components/ui/button";
import { Checkbox } from "#app/components/ui/checkbox";
import { Label } from "#app/components/ui/label";
import { AnnouncementIntents } from "#app/features/announcements/admin/announcement-intents";
import type { AnnouncementRow } from "#app/features/announcements/admin/components/announcement-list";
import { AnnouncementFormSchema } from "#app/features/announcements/announcement-schema";
import { IntentInput } from "#app/lib/intent";

type Props = {
  announcement: AnnouncementRow | null;
  lastResult: SubmissionResult<string[]> | null;
  submitting: boolean;
  onCancel: VoidFunction;
};

export function AnnouncementForm({ announcement, lastResult, submitting, onCancel }: Props) {
  const [form, fields] = useForm({
    id: announcement ? `announcement-${announcement.id}` : "announcement-new",
    lastResult,
    defaultValue: announcement ? { message: announcement.message } : undefined,
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: AnnouncementFormSchema });
    },
  });

  return (
    <Form method="post" {...getFormProps(form)} className="flex h-full flex-col">
      <IntentInput
        intent={announcement ? AnnouncementIntents.Update : AnnouncementIntents.Create}
      />
      {announcement ? <input type="hidden" name="id" value={announcement.id} /> : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <Field
          label="Poruka"
          errors={fields.message.errors}
          inputProps={{
            ...getInputProps(fields.message, { type: "text" }),
            maxLength: 500,
            placeholder: "Kratka poruka za posjetioce…",
          }}
        />

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="announcement-isActive"
              name="isActive"
              defaultChecked={announcement?.isActive ?? false}
            />
            <Label htmlFor="announcement-isActive" className="text-sm font-normal">
              Aktivna
            </Label>
          </div>
          <p className="text-muted-foreground text-xs">
            Samo jedna poruka može biti aktivna. Aktiviranjem ove poruke automatski se deaktiviraju
            sve ostale.
          </p>
        </div>
      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Odustani
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Spremanje…" : announcement ? "Spremi izmjene" : "Sačuvaj"}
        </Button>
      </FormActions>
    </Form>
  );
}
