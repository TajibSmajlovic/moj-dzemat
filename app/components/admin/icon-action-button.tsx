import type { ComponentProps, ReactNode } from "react";

import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";

type IconActionButtonTone = "default" | "primary" | "secondary" | "destructive";

const toneClasses: Record<
  IconActionButtonTone,
  {
    active: string;
    inactive: string;
  }
> = {
  default: {
    active: "bg-muted text-foreground hover:bg-muted",
    inactive: "text-muted-foreground hover:bg-muted hover:text-foreground",
  },
  primary: {
    active: "bg-primary/10 text-primary hover:bg-primary/10",
    inactive: "text-muted-foreground hover:bg-primary/10 hover:text-primary",
  },
  secondary: {
    active: "bg-secondary/10 text-secondary hover:bg-secondary/10",
    inactive: "text-muted-foreground hover:bg-secondary/10 hover:text-secondary",
  },
  destructive: {
    active: "bg-destructive/10 text-destructive hover:bg-destructive/10",
    inactive: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
  },
};

type IconActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size" | "children" | "title" | "aria-label"
> & {
  label: string;
  tone?: IconActionButtonTone;
  active?: boolean;
  children: ReactNode;
};

export function IconActionButton({
  label,
  tone = "default",
  active = false,
  className,
  children,
  type,
  ...props
}: IconActionButtonProps) {
  return (
    <Button
      {...props}
      type={props.asChild ? undefined : (type ?? "button")}
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      className={cn(active ? toneClasses[tone].active : toneClasses[tone].inactive, className)}
    >
      {children}
    </Button>
  );
}
