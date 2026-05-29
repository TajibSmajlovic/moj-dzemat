import { z } from "zod";

import { requiredString } from "#app/lib/form-schema";

export const QA_QUESTION_MIN_LENGTH = 5;
export const QA_QUESTION_MAX_LENGTH = 1000;
export const QA_ANSWER_MIN_LENGTH = 5;
export const QA_ANSWER_MAX_LENGTH = 5000;

export const QuestionFieldSchema = requiredString("Pitanje je obavezno.")
  .min(QA_QUESTION_MIN_LENGTH, `Pitanje mora imati najmanje ${QA_QUESTION_MIN_LENGTH} znakova.`)
  .max(QA_QUESTION_MAX_LENGTH, `Pitanje može imati najviše ${QA_QUESTION_MAX_LENGTH} znakova.`);

export const AnswerFieldSchema = requiredString("Odgovor je obavezan.")
  .min(QA_ANSWER_MIN_LENGTH, `Odgovor mora imati najmanje ${QA_ANSWER_MIN_LENGTH} znakova.`)
  .max(QA_ANSWER_MAX_LENGTH, `Odgovor može imati najviše ${QA_ANSWER_MAX_LENGTH} znakova.`);

export const QaSubmitSchema = z.object({ question: QuestionFieldSchema });
export const QaAnswerSchema = z.object({ answer: AnswerFieldSchema });
