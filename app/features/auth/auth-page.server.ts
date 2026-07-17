import { getActiveAnnouncement } from "#app/features/announcements/site-announcement.server";

export async function getAuthPage() {
  const announcement = await getActiveAnnouncement();

  return {
    announcement,
  };
}
