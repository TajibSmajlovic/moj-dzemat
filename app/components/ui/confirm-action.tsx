"use client";

import type { ReactNode } from "react";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#app/components/ui/alert-dialog";
import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";

type ConfirmActionProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  children: ReactNode;
} & (
  | {
      form: string;
      onConfirm?: never;
    }
  | {
      form?: never;
      onConfirm: VoidFunction;
    }
);

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  cancelLabel = "Odustani",
  children,
  ...props
}: ConfirmActionProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="bg-destructive/10 text-destructive ring-destructive/10 mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" className="min-w-28">
              {cancelLabel}
            </Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            {"form" in props ? (
              <Button
                type="submit"
                form={props.form}
                variant="destructive"
                className={cn("min-w-32 shadow-sm")}
              >
                {confirmLabel}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className={cn("min-w-32 shadow-sm")}
                onClick={props.onConfirm}
              >
                {confirmLabel}
              </Button>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
