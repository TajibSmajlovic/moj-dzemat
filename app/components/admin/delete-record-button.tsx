import type { ReactNode } from "react";
import { Form } from "react-router";

import { Trash2 } from "lucide-react";

import { IconActionButton } from "#app/components/admin/icon-action-button";
import { ConfirmAction } from "#app/components/ui/confirm-action";

type DeleteRecordButtonProps = {
  /** Record id submitted as the `id` field. */
  id: string;
  /** Used to derive a unique form id (`${formIdPrefix}-${id}`). */
  formIdPrefix: string;
  /** Form `intent` value. Defaults to `"delete"`. */
  intent?: string;
  /** Confirm-dialog title. */
  title: string;
  /** Confirm-dialog description. */
  description: ReactNode;
  /** Label on the destructive confirm button. */
  confirmLabel: string;
  /** aria-label / title for the trash icon button itself. */
  iconLabel: string;
};

/**
 * Hidden-form + `ConfirmAction` + destructive `IconActionButton` combo
 * used by admin record rows. Submits `intent` (default `"delete"`) and
 * `id`; the parent route's `action` handles the actual deletion and
 * (typically) returns a toast envelope handled via `useActionToast`.
 */
export function DeleteRecordButton({
  id,
  formIdPrefix,
  intent = "delete",
  title,
  description,
  confirmLabel,
  iconLabel,
}: DeleteRecordButtonProps) {
  const formId = `${formIdPrefix}-${id}`;

  return (
    <Form id={formId} method="post" className="inline">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />

      <ConfirmAction
        form={formId}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
      >
        <IconActionButton label={iconLabel} tone="destructive">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </IconActionButton>
      </ConfirmAction>
    </Form>
  );
}
