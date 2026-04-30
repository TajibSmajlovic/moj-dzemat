import { Info } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "#app/lib/cn";
import { motionTransitions } from "#app/lib/motion";

type AnnouncementBarProps = {
  announcement: {
    message: string;
  } | null;
  className?: string;
};

export function AnnouncementBar({ announcement, className }: AnnouncementBarProps) {
  if (!announcement) return null;

  return (
    <motion.div
      key="announcement-bar"
      role="region"
      aria-label="Obavijest zajednice"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransitions.micro}
      className={cn("bg-secondary text-secondary-foreground z-9999", className)}
    >
      <div className="z-9999 mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 sm:gap-2.5 sm:py-2.5">
        <Info className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
        <span className="truncate text-xs font-medium text-balance sm:text-sm">
          {announcement.message}
        </span>
      </div>
    </motion.div>
  );
}
