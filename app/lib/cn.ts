import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
   Combine class name inputs with clsx and resolve Tailwind conflicts.
   Every component uses this rather than template-string concatenation so
   className props from callers win predictably.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
