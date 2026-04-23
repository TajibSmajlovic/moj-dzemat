import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";
import { shareOnFacebook } from "#app/lib/share";

type ShareButtonProps = {
  title: string;
  path?: string;
  className?: string;
};

export function ShareButton({ title, path, className }: ShareButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={() => shareOnFacebook(title, path)}
      className={cn("gap-2", className)}
    >
      <FacebookIcon className="h-4 w-4" />
      Podijeli
    </Button>
  );
}
