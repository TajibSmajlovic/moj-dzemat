import type { Meta, StoryObj } from "@storybook/react-vite";

import { QaAdminList } from "#app/features/qa/admin/components/qa-admin-list";
import { QaAnswerForm } from "#app/features/qa/admin/components/qa-answer-form";
import { QaQuestionStatusBadge } from "#app/features/qa/admin/components/qa-question-status-badge";

import { question, pagination } from "../fixtures/content";
const meta = {
  title: "Admin/Questions",
  parameters: { demo: { path: "/admin/pitanja-i-odgovori" } },
} satisfies Meta;
export default meta;
export const PendingList: StoryObj = {
  render: () => (
    <QaAdminList
      questions={[{ ...question, answer: null }]}
      tab="neodgovorena"
      pagination={pagination}
      deletingId={null}
      getPageHref={(page) => "?page=" + page}
    />
  ),
};
export const AnsweredList: StoryObj = {
  render: () => (
    <QaAdminList
      questions={[question, { ...question, id: "hidden", isHidden: true }]}
      tab="odgovorena"
      pagination={pagination}
      deletingId={null}
      getPageHref={(page) => "?page=" + page}
    />
  ),
};
export const Empty: StoryObj = {
  render: () => (
    <QaAdminList
      questions={[]}
      tab="neodgovorena"
      pagination={pagination}
      deletingId={null}
      getPageHref={(page) => "?page=" + page}
    />
  ),
};
export const Answer: StoryObj = {
  render: () => (
    <QaAnswerForm
      question={question}
      lastResult={null}
      submitting={false}
      cancelTo="/admin/pitanja-i-odgovori"
    />
  ),
};
export const Saving: StoryObj = {
  render: () => (
    <QaAnswerForm
      question={question}
      lastResult={null}
      submitting
      cancelTo="/admin/pitanja-i-odgovori"
    />
  ),
};
export const Statuses: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <QaQuestionStatusBadge question={question} />
      <QaQuestionStatusBadge question={{ ...question, answer: null }} />
      <QaQuestionStatusBadge question={{ ...question, isHidden: true }} />
    </div>
  ),
};
