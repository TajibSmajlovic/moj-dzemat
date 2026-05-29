import { z } from "zod";

import { requiredString } from "#app/lib/form-schema";

export const QuestionFieldSchema = requiredString("Pitanje je obavezno.")
  .min(5, "Pitanje mora imati najmanje 5 znakova.")
  .max(1000, "Pitanje može imati najviše 1000 znakova.");

export const AnswerFieldSchema = requiredString("Odgovor je obavezan.")
  .min(5, "Odgovor mora imati najmanje 5 znakova.")
  .max(5000, "Odgovor može imati najviše 5000 znakova.");

export const QaSubmitSchema = z.object({ question: QuestionFieldSchema });
export const QaAnswerSchema = z.object({ answer: AnswerFieldSchema });
