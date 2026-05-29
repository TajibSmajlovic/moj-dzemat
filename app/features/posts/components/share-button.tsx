import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";
import { shareOnFacebook } from "#app/lib/share";

type ShareButtonProps = {
  path?: string;
  className?: string;
  tabIndex?: number;
};

export function ShareButton({ path, className, tabIndex }: ShareButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      tabIndex={tabIndex}
      onClick={() => shareOnFacebook(path)}
      className={cn("gap-2", className)}
    >
      <FacebookIcon className="h-4 w-4" />
      Podijeli
    </Button>
  );
}
