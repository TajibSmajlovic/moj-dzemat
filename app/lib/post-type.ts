import { BookOpenText, HandHeart, Megaphone, Moon, type LucideIcon } from "lucide-react";

/**
 * Human-facing labels for the four post kinds. Kept here (not in the
 * schema) because localisation is presentation-layer concern - the DB
 * only knows the canonical enum identifier.
 */
export const POST_TYPES = ["obavijest", "hutba", "sergija", "smrtovnica"] as const;

export type PostTypeValue = (typeof POST_TYPES)[number];

export const POST_TYPE_LABEL: Record<PostTypeValue, string> = {
  obavijest: "Obavijest",
  smrtovnica: "Smrtovnica",
  sergija: "Sergija",
  hutba: "Hutba",
};

export const POST_TYPE_LABEL_PLURAL: Record<PostTypeValue, string> = {
  obavijest: "Obavijesti",
  smrtovnica: "Smrtovnice",
  sergija: "Sergije",
  hutba: "Hutbe",
};

/**
 * Lucide glyph that fronts each category badge and filter chip. Using
 * real SVG icons instead of emoji so rendering is identical across
 * browsers/OSes, stroke/colour follow the current text colour, and we
 * never ship Unicode surprises.
 */
export const POST_TYPE_ICON: Record<PostTypeValue, LucideIcon> = {
  obavijest: Megaphone,
  smrtovnica: Moon,
  sergija: HandHeart,
  hutba: BookOpenText,
};

export function formatPostArchiveTitle(type: PostTypeValue | "all"): string {
  if (type === "all") return "Sve objave";

  return `Sve ${POST_TYPE_LABEL_PLURAL[type].toLocaleLowerCase("bs-BA")}`;
}

export function isPostType(value: unknown): value is PostTypeValue {
  return typeof value === "string" && (POST_TYPES as readonly string[]).includes(value);
}
