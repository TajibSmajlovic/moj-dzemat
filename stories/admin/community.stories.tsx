import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { AnnouncementForm } from "#app/features/announcements/admin/components/announcement-form";
import { AnnouncementList } from "#app/features/announcements/admin/components/announcement-list";
import { ContactForm } from "#app/features/contact/admin/components/contact-form";
import { ImportantDateForm } from "#app/features/important-dates/admin/components/important-date-form";
import { ImportantDateList } from "#app/features/important-dates/admin/components/important-date-list";

import { announcement, importantDate, contact } from "../fixtures/content";
const meta = { title: "Admin/Community", parameters: { demo: { path: "/admin" } } } satisfies Meta;
export default meta;
export const Announcements: StoryObj = {
  render: () => (
    <AnnouncementList
      announcements={[announcement, { ...announcement, id: "inactive", isActive: false }]}
      deletingId={null}
      onEdit={fn()}
    />
  ),
};
export const EmptyAnnouncements: StoryObj = {
  render: () => <AnnouncementList announcements={[]} deletingId={null} onEdit={fn()} />,
};
export const NewAnnouncement: StoryObj = {
  render: () => (
    <AnnouncementForm announcement={null} lastResult={null} submitting={false} onCancel={fn()} />
  ),
};
export const EditAnnouncement: StoryObj = {
  render: () => (
    <AnnouncementForm
      announcement={announcement}
      lastResult={null}
      submitting={false}
      onCancel={fn()}
    />
  ),
};
export const Dates: StoryObj = {
  render: () => (
    <ImportantDateList
      importantDates={[
        importantDate,
        {
          ...importantDate,
          id: "past",
          title: "Završeno druženje",
          date: new Date("2025-01-01T00:00:00Z"),
          recursYearly: false,
        },
      ]}
      deletingId={null}
      getEditHref={(id) => "/admin/vazni-datumi/" + id}
    />
  ),
};
export const EmptyDates: StoryObj = {
  render: () => (
    <ImportantDateList
      importantDates={[]}
      deletingId={null}
      getEditHref={(id) => "/admin/vazni-datumi/" + id}
    />
  ),
};
export const NewDate: StoryObj = {
  render: () => (
    <ImportantDateForm importantDate={null} lastResult={null} submitting={false} onCancel={fn()} />
  ),
};
export const EditDate: StoryObj = {
  render: () => (
    <ImportantDateForm
      importantDate={importantDate}
      lastResult={null}
      submitting={false}
      onCancel={fn()}
    />
  ),
};
export const Contact: StoryObj = {
  render: () => <ContactForm info={contact} lastResult={null} submitting={false} />,
};
export const SavingContact: StoryObj = {
  render: () => <ContactForm info={contact} lastResult={null} submitting />,
};
