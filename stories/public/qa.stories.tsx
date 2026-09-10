import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { QaAccordion } from "#app/features/qa/components/qa-accordion";
import { QaDetailArticle } from "#app/features/qa/components/qa-detail-article";
import { QaHomePreview } from "#app/features/qa/components/qa-home-preview";
import { QaQuestionForm } from "#app/features/qa/components/qa-question-form";

import { question, honeypot } from "../fixtures/content";
const meta = { title: "Public/Questions" } satisfies Meta;
export default meta;
export const Answers: StoryObj = {
  render: () => (
    <QaAccordion
      questions={[
        question,
        {
          ...question,
          id: "second",
          question: "Mogu li učestvovati i najmlađi?",
          answer: "Da, program uključuje aktivnosti prilagođene djeci.",
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(question.question));
    await waitFor(() => expect(canvas.getByText(question.answer)).toBeVisible());
    await userEvent.click(canvas.getByText(question.question));
    await waitFor(() => expect(canvas.getByText(question.answer)).not.toBeVisible());
  },
};
export const HomePreview: StoryObj = { render: () => <QaHomePreview questions={[question]} /> };
export const EmptyHomePreview: StoryObj = { render: () => <QaHomePreview questions={[]} /> };
export const Detail: StoryObj = {
  render: () => <QaDetailArticle question={question} related={[]} />,
};
export const Ask: StoryObj = {
  render: () => (
    <div className="max-w-xl">
      <QaQuestionForm honeypot={honeypot} lastResult={null} />
    </div>
  ),
};
export const RateLimited: StoryObj = {
  render: () => (
    <div className="max-w-xl">
      <QaQuestionForm honeypot={honeypot} lastResult={null} rateLimited />
    </div>
  ),
};
