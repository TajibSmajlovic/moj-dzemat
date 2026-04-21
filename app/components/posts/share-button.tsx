import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { Button } from "#app/components/ui/button";
import { shareOnFacebook } from "#app/lib/share";

type ShareButtonProps = {
  title: string;
  path?: string;
};

/**
 * Lightweight wrapper around the FB sharer. We keep it in its own
 * component so the server-rendered route file doesn't need to know
 * about `window` — `shareOnFacebook` only touches the DOM once the
 * user clicks.
 */
export function ShareButton({ title, path }: ShareButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={() => shareOnFacebook(title, path)}
      className="gap-2"
    >
      <FacebookIcon className="h-4 w-4" />
      Podijeli
    </Button>
  );
}
