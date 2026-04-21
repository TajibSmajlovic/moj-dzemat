import { Info } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "#app/lib/cn";

type AnnouncementBarData = {
  message: string;
};

type AnnouncementBarProps = {
  announcement: AnnouncementBarData | null;
  className?: string;
};

/**
 * Slim top-of-page strip for community-wide announcements.
 */
export function AnnouncementBar({ announcement, className }: AnnouncementBarProps) {
  if (!announcement) return null;

  return (
    <motion.div
      key="announcement-bar"
      role="region"
      aria-label="Obavijest zajednice"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.25 }}
      className={cn("bg-secondary text-secondary-foreground z-9999 overflow-hidden", className)}
    >
      <div className="z-9999 mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-2.5">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate text-sm font-medium text-balance">{announcement.message}</span>
      </div>
    </motion.div>
  );
}
