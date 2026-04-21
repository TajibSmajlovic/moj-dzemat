import { cn } from "#app/lib/cn";

type BrandMosqueMarkProps = {
  /** Primary header tile vs smaller footer/admin variant. */
  variant: "tile" | "inline";
  className?: string;
};

/**
 * Brand mark for Moj Dzemat.
 *
 * Kept intentionally simple so it reads cleanly even at favicon size:
 * emerald tile, small crescent, and a mosque silhouette with one mihrab
 * arch in the centre.
 */
export function BrandMosqueMark({ variant, className }: BrandMosqueMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none",
        variant === "tile" ? "h-10 w-10" : "h-6 w-6",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" fill="none" className="size-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="60" height="60" rx="18" fill="#174D3A" />
        <rect
          x="5"
          y="5"
          width="54"
          height="54"
          rx="15"
          stroke="#F6E7C8"
          strokeOpacity="0.18"
          strokeWidth="1.5"
        />

        <circle cx="43" cy="14" r="6" fill="#E7B85C" />
        <circle cx="45.8" cy="14" r="5.2" fill="#174D3A" />

        <rect x="15" y="24" width="6" height="22" rx="3" fill="#F7F3EA" />
        <rect x="43" y="24" width="6" height="22" rx="3" fill="#F7F3EA" />
        <path
          d="M18 19C16.6 19 15.5 20.1 15.5 21.5V24H20.5V21.5C20.5 20.1 19.4 19 18 19Z"
          fill="#E7B85C"
        />
        <path
          d="M46 19C44.6 19 43.5 20.1 43.5 21.5V24H48.5V21.5C48.5 20.1 47.4 19 46 19Z"
          fill="#E7B85C"
        />

        <path d="M20 46V34C20 25.7 25.4 20 32 20C38.6 20 44 25.7 44 34V46H20Z" fill="#F7F3EA" />
        <path
          d="M26.5 46V37.3C26.5 33.7 28.9 30.7 32 30.7C35.1 30.7 37.5 33.7 37.5 37.3V46H26.5Z"
          fill="#174D3A"
        />
        <path d="M19 49H45" stroke="#E7B85C" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
