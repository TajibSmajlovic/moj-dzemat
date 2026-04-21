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

/**
 * URL-driven filter. Each tab is a `<Link>` so navigation works without
 * JS; React Router hijacks the click on the client. The active state is
 * derived on the server from the incoming `?vrsta=` param, which keeps
 * this component a pure render of props.
 */
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
    <nav aria-label="Filter objava" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href = tab.value === "all" ? "/" : `/?vrsta=${encodeURIComponent(tab.value)}`;
        const isActive = active === tab.value;
        const { Icon } = tab;

        return (
          <motion.div key={tab.value} whileTap={{ scale: 0.95 }}>
            <Link
              to={href}
              prefetch="intent"
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-balance transition-all",
                "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
