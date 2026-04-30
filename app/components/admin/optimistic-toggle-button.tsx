import type { ReactNode } from "react";
import { useFetcher } from "react-router";

import { IconActionButton } from "#app/components/admin/icon-action-button";
import { useFetcherToast } from "#app/lib/use-action-toast";

type IconActionButtonTone = "default" | "primary" | "secondary" | "destructive";

type OptimisticToggleIconButtonProps = {
  /** Form `intent` value submitted alongside the toggle. */
  intent: string;
  /** Record id submitted alongside the toggle. */
  id: string;
  /** Current persisted state. The button optimistically flips while pending. */
  active: boolean;
  tone: IconActionButtonTone;
  /** aria-label / title shown when the button is currently `active`. */
  activeLabel: string;
  /** aria-label / title when inactive. Defaults to `activeLabel`. */
  inactiveLabel?: string;
  /** Icon shown when the button is currently `active`. */
  activeIcon: ReactNode;
  /** Icon shown when inactive. Defaults to `activeIcon`. */
  inactiveIcon?: ReactNode;
};

/**
 * Submits `{ intent, id }` via a `useFetcher` form and renders an
 * `IconActionButton` whose pressed state, label and icon are flipped
 * optimistically while the request is in flight. Any toast returned by
 * the action is forwarded through `useFetcherToast`.
 */
export function OptimisticToggleIconButton({
  intent,
  id,
  active,
  tone,
  activeLabel,
  inactiveLabel,
  activeIcon,
  inactiveIcon,
}: OptimisticToggleIconButtonProps) {
  const fetcher = useFetcher();
  useFetcherToast(fetcher);

  const optimisticActive =
    fetcher.formData?.get("intent") === intent && fetcher.formData.get("id") === id
      ? !active
      : active;

  const label = optimisticActive ? activeLabel : (inactiveLabel ?? activeLabel);
  const icon = optimisticActive ? activeIcon : (inactiveIcon ?? activeIcon);

  return (
    <fetcher.Form method="post" className="inline">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />

      <IconActionButton
        type="submit"
        label={label}
        tone={tone}
        active={optimisticActive}
        aria-pressed={optimisticActive}
      >
        {icon}
      </IconActionButton>
    </fetcher.Form>
  );
}
