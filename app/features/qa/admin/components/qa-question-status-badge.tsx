import type { ReactNode } from "react";

import { Eye, EyeOff, MessageCircle } from "lucide-react";

import { Badge } from "#app/components/ui/badge";
import type { AdminQuestionRow } from "#app/features/qa/qa.server";
import { cn } from "#app/lib/cn";

type QuestionStatus = "pending" | "answered" | "hidden";

export function QaQuestionStatusBadge({ question }: { question: AdminQuestionRow }) {
  const status: QuestionStatus =
    question.answer === null ? "pending" : question.isHidden ? "hidden" : "answered";
  const statusMap = {
    pending: {
      label: "Na čekanju",
      icon: <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />,
      className: "bg-secondary/10 text-gold-foreground",
    },
    answered: {
      label: "Odgovoreno",
      icon: <Eye className="h-3.5 w-3.5" aria-hidden="true" />,
      className: "bg-primary/10 text-primary",
    },
    hidden: {
      label: "Sakriveno",
      icon: <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />,
      className: "bg-muted text-muted-foreground ring-border ring-1 ring-inset",
    },
  } satisfies Record<QuestionStatus, { label: string; icon: ReactNode; className: string }>;
  const config = statusMap[status];

  return (
    <Badge className={cn(config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
