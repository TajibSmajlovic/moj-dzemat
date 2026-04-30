import type { ReactNode } from "react";

import { motion } from "motion/react";

import { cn } from "#app/lib/cn";
import { sectionReveal } from "#app/lib/motion";

type MaxWidth = "sm" | "md";

const MAX_WIDTH_CLASSES: Record<MaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
};

type AuthPageShellProps = {
  maxWidth?: MaxWidth;
  gap?: "gap-4" | "gap-6";
  className?: string;
  children: ReactNode;
};

export function AuthPageShell({
  maxWidth = "md",
  gap = "gap-6",
  className,
  children,
}: AuthPageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto flex flex-col px-4 py-12",
        MAX_WIDTH_CLASSES[maxWidth],
        gap,
        className,
      )}
    >
      {children}
    </main>
  );
}

type AuthCardShellProps = {
  maxWidth?: MaxWidth;
  className?: string;
  beforeCard?: ReactNode;
  children: ReactNode;
};

export function AuthCardShell({
  maxWidth = "sm",
  className,
  beforeCard,
  children,
}: AuthCardShellProps) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        {...sectionReveal}
        className={cn("w-full", MAX_WIDTH_CLASSES[maxWidth], className)}
      >
        {beforeCard}
        <div className="border-border bg-card rounded-2xl border p-8 shadow-lg">{children}</div>
      </motion.div>
    </main>
  );
}

type AuthHeaderProps = {
  title: string;
  description?: ReactNode;
  className?: string;
};

export function AuthHeader({ title, description, className }: AuthHeaderProps) {
  return (
    <header className={cn("space-y-2 text-center", className)}>
      <h1 className="text-3xl">{title}</h1>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
    </header>
  );
}
