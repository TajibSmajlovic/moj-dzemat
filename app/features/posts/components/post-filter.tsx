import { useCallback, useEffect, useRef, useState } from "react";
import { href, Link } from "react-router";

import { Sparkles, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import {
  POST_TYPES,
  POST_TYPE_ICON,
  POST_TYPE_LABEL_PLURAL,
  type PostTypeValue,
} from "#app/features/posts/post-type";
import { cn } from "#app/lib/cn";
import { motionTransitions } from "#app/lib/motion";

type PostFilterProps = {
  active: PostTypeValue | "all";
  destination?: "home" | "archive";
};

type Tab = { value: PostTypeValue | "all"; label: string; Icon: LucideIcon };

const ALL: Tab = { value: "all", label: "Sve", Icon: Sparkles };

export function PostFilter({ active, destination = "home" }: PostFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edgeFade, setEdgeFade] = useState({ left: false, right: false });
  const basePath = destination === "archive" ? href("/objave") : href("/");

  const tabs: Tab[] = [
    ALL,
    ...POST_TYPES.map((value) => ({
      value,
      label: POST_TYPE_LABEL_PLURAL[value],
      Icon: POST_TYPE_ICON[value],
    })),
  ];

  const updateEdgeFade = useCallback(() => {
    const node = scrollRef.current;

    if (!node) return;

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setEdgeFade({
      left: node.scrollLeft > 2,
      right: maxScrollLeft - node.scrollLeft > 2,
    });
  }, []);

  useEffect(() => {
    updateEdgeFade();

    const node = scrollRef.current;
    if (!node) return;
    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(updateEdgeFade);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [updateEdgeFade]);

  return (
    <nav aria-label="Filtriranje objava" className="relative -mx-4 sm:mx-0">
      <div
        ref={scrollRef}
        onScroll={updateEdgeFade}
        className="[scrollbar-width:none] overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max min-w-full gap-2 sm:w-auto sm:min-w-0 sm:flex-wrap">
          {tabs.map((tab) => {
            const targetHref =
              tab.value === "all" ? basePath : `${basePath}?vrsta=${encodeURIComponent(tab.value)}`;
            const isActive = active === tab.value;
            const { Icon } = tab;

            return (
              <motion.div
                key={tab.value}
                whileTap={{ scale: 0.97, transition: motionTransitions.hover }}
                className="shrink-0"
              >
                <Link
                  preventScrollReset
                  to={targetHref}
                  prefetch="intent"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-balance transition-[background-color,color,box-shadow] sm:px-4 sm:py-2",
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
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-linear-to-r to-transparent transition-opacity duration-200 sm:hidden",
          edgeFade.left ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l to-transparent transition-opacity duration-200 sm:hidden",
          edgeFade.right ? "opacity-100" : "opacity-0",
        )}
      />
    </nav>
  );
}
