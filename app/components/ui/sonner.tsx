import { useEffect, useRef } from "react";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

import { cn } from "#app/lib/cn";
import {
  resolveToastTone,
  ToastSchema,
  type Toast as ToastPayload,
  type ToastInput,
  type ToastTone,
} from "#app/lib/toast";

const BASE_TOAST_CLASSNAME =
  "relative overflow-hidden rounded-2xl border bg-popover/95 text-popover-foreground shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']";

const TOAST_TONE_STYLES: Record<ToastTone, string> = {
  neutral: "border-border/70 before:bg-border/80",
  primary:
    "border-primary/15 before:bg-primary shadow-[0_18px_40px_rgba(0,0,0,0.08),inset_0_1px_0_hsl(var(--primary)/0.07)]",
  secondary:
    "border-secondary/20 before:bg-secondary shadow-[0_18px_40px_rgba(0,0,0,0.08),inset_0_1px_0_hsl(var(--secondary)/0.09)]",
  destructive:
    "border-destructive/15 before:bg-destructive shadow-[0_18px_40px_rgba(0,0,0,0.08),inset_0_1px_0_hsl(var(--destructive)/0.08)]",
};

const TOAST_ICON_CLASSES: Record<ToastTone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary",
  destructive: "text-destructive",
};

/**
 * Thin wrapper around sonner's Toaster. The shadcn default pulls `useTheme`
 * from next-themes; we're not running next-themes (dark mode lands later
 * via a `.dark` class flip on <html>), so sonner is told to inherit from
 * the `dark` class directly via `theme="system"` + `richColors={false}`
 * while still respecting our CSS tokens for surface colours.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

function showToast(toastInput?: ToastInput | null) {
  if (!toastInput) return;

  const parsed = ToastSchema.parse(toastInput);
  const tone = resolveToastTone(parsed);
  const method =
    parsed.type === "success"
      ? toast.success
      : parsed.type === "error"
        ? toast.error
        : toast.message;

  return method(parsed.title ?? parsed.description, {
    id: parsed.id,
    description: parsed.title ? parsed.description : undefined,
    className: cn(BASE_TOAST_CLASSNAME, TOAST_TONE_STYLES[tone]),
    classNames: {
      title: "text-sm font-semibold text-foreground",
      description: "text-muted-foreground text-sm leading-relaxed",
      icon: TOAST_ICON_CLASSES[tone],
    },
  });
}

function useToast(toastInput?: ToastPayload | null) {
  const lastToastId = useRef<string | null>(null);

  useEffect(() => {
    if (!toastInput || toastInput.id === lastToastId.current) return;

    showToast(toastInput);
    lastToastId.current = toastInput.id;
  }, [toastInput]);
}

export { Toaster, showToast, useToast };
