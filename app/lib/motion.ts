import type { MotionProps } from "motion/react";

type MotionTransition = NonNullable<MotionProps["transition"]>;
type MotionPreset = Pick<
  MotionProps,
  "animate" | "exit" | "initial" | "transition" | "variants" | "viewport" | "whileInView"
>;

const motionEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

export const motionTransitions = {
  page: { duration: 0.24, ease: motionEase },
  section: { duration: 0.36, ease: motionEase },
  item: { duration: 0.32, ease: motionEase },
  micro: { duration: 0.22, ease: motionEase },
  hover: { duration: 0.18, ease: motionEase },
  lightbox: { duration: 0.18, ease: motionEase },
} satisfies Record<string, MotionTransition>;

const motionOffset = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

const motionViewport = {
  once: true,
  margin: "0px 0px -10% 0px",
} satisfies NonNullable<MotionProps["viewport"]>;

export const softFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: motionTransitions.page,
} satisfies MotionPreset;

export const sectionReveal = {
  initial: { opacity: 0, y: motionOffset.md },
  animate: { opacity: 1, y: 0 },
  transition: motionTransitions.section,
} satisfies MotionPreset;

export const scrollReveal = {
  initial: { opacity: 0, y: motionOffset.md },
  whileInView: { opacity: 1, y: 0 },
  viewport: motionViewport,
  transition: motionTransitions.section,
} satisfies MotionPreset;

export const cardReveal = {
  initial: { opacity: 0, y: motionOffset.sm },
  whileInView: { opacity: 1, y: 0 },
  viewport: motionViewport,
  transition: motionTransitions.item,
} satisfies MotionPreset;

export const featuredHeroReveal = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.52, ease: motionEase },
} satisfies MotionPreset;

export const featuredHeroEyebrowReveal = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: 0.18, duration: 0.36, ease: motionEase },
} satisfies MotionPreset;

export const featuredHeroTitleReveal = {
  initial: { opacity: 0, y: motionOffset.sm },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.26, duration: 0.36, ease: motionEase },
} satisfies MotionPreset;

export const featuredHeroExcerptReveal = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay: 0.36, duration: 0.34, ease: motionEase },
} satisfies MotionPreset;

export const featuredHeroMetaReveal = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay: 0.44, duration: 0.34, ease: motionEase },
} satisfies MotionPreset;

function withMotionDelay(transition: MotionTransition, delay: number) {
  if (delay <= 0) return transition;

  return { ...transition, delay } satisfies MotionTransition;
}

export function sectionRevealWithDelay(delay: number) {
  return {
    ...sectionReveal,
    transition: withMotionDelay(sectionReveal.transition, delay),
  } satisfies MotionPreset;
}
