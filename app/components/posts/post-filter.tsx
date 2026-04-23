import { Link } from "react-router";

import { Sparkles, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "#app/lib/cn";
import {
  POST_TYPES,
  POST_TYPE_ICON,
  POST_TYPE_LABEL_PLURAL,
  type PostTypeValue,
} from "#app/lib/post-type";

type PostFilterProps = {
  active: PostTypeValue | "all";
};

type Tab = { value: PostTypeValue | "all"; label: string; Icon: LucideIcon };

const ALL: Tab = { value: "all", label: "Sve", Icon: Sparkles };

export function PostFilter({ active }: PostFilterProps) {
  const tabs: Tab[] = [
    ALL,
    ...POST_TYPES.map((value) => ({
      value,
      label: POST_TYPE_LABEL_PLURAL[value],
      Icon: POST_TYPE_ICON[value],
    })),
  ];

  return (
    <nav
      aria-label="Filter objava"
      className="-mx-4 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max min-w-full gap-2 sm:w-auto sm:min-w-0 sm:flex-wrap">
        {tabs.map((tab) => {
          const href = tab.value === "all" ? "/" : `/?vrsta=${encodeURIComponent(tab.value)}`;
          const isActive = active === tab.value;
          const { Icon } = tab;

          return (
            <motion.div key={tab.value} whileTap={{ scale: 0.95 }} className="shrink-0">
              <Link
                preventScrollReset
                to={href}
                prefetch="intent"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-balance transition-all sm:px-4 sm:py-2",
                  "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                {tab.label}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
}
