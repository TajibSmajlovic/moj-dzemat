import type { ComponentPropsWithoutRef } from "react";

import { cn } from "#app/lib/cn";

type PageMainProps = ComponentPropsWithoutRef<"main">;

export function PageMain({ className, ...props }: PageMainProps) {
  return (
    <main className={cn("mx-auto w-full max-w-5xl px-4 pt-6 sm:pt-8", className)} {...props} />
  );
}
