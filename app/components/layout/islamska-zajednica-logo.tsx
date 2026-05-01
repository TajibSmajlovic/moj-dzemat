import { cn } from "#app/lib/cn";

export function IslamskaZajednicaLogo({ className }: { className?: string }) {
  return (
    <div className="shrink-0">
      <img
        src="/logo.svg?v=7"
        alt=""
        width={40}
        height={40}
        className={cn("inline-block h-9 w-auto sm:h-10", className)}
        aria-hidden="true"
      />
      <span className="sr-only">Logo Islamske zajednice</span>
    </div>
  );
}
