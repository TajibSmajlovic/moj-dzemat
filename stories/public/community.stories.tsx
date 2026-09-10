import type { Meta, StoryObj } from "@storybook/react-vite";

import { AnnouncementBar } from "#app/features/announcements/components/announcement-bar";
import { ContactHomeTeaser } from "#app/features/contact/components/contact-home-teaser";
import { ContactPageContent } from "#app/features/contact/components/contact-page-content";
import { ImportantDatesHomeSection } from "#app/features/important-dates/components/important-dates-home-section";

import { announcement, importantDate, contact } from "../fixtures/content";
const meta = { title: "Public/Community" } satisfies Meta;
export default meta;
export const Announcement: StoryObj = {
  render: () => <AnnouncementBar announcement={announcement} />,
};
export const LongAnnouncement: StoryObj = {
  render: () => (
    <AnnouncementBar
      announcement={{
        message:
          "Pozivamo sve džematlije, njihove porodice i prijatelje da nam se pridruže na zajedničkom druženju i razgovoru o budućim aktivnostima našeg džemata.",
      }}
    />
  ),
};
export const ImportantDates: StoryObj = {
  render: () => (
    <ImportantDatesHomeSection
      dates={[
        importantDate,
        { ...importantDate, id: "second", title: "Razgovor za roditelje", description: null },
      ]}
    />
  ),
};
export const ContactPreview: StoryObj = { render: () => <ContactHomeTeaser info={contact} /> };
export const ContactDetails: StoryObj = { render: () => <ContactPageContent info={contact} /> };
export const MinimalContact: StoryObj = {
  render: () => (
    <ContactPageContent
      info={{ ...contact, showAbout: false, showBank: false, showImam: false, showBoard: false }}
    />
  ),
};
