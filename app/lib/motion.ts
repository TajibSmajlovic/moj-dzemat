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

const featuredHeroChildTransition = {
  duration: 0.44,
  ease: motionEase,
} satisfies MotionTransition;

const featuredHeroChildReveal = {
  variants: {
    hidden: { opacity: 0, y: motionOffset.sm },
    show: { opacity: 1, y: 0, transition: featuredHeroChildTransition },
  },
} satisfies MotionPreset;

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
  initial: "hidden",
  animate: "show",
  variants: {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        delayChildren: 0.1,
        duration: 0.6,
        ease: motionEase,
        staggerChildren: 0.075,
      },
    },
  },
} satisfies MotionPreset;

export const featuredHeroEyebrowReveal = featuredHeroChildReveal;

export const featuredHeroTitleReveal = featuredHeroChildReveal;

export const featuredHeroExcerptReveal = featuredHeroChildReveal;

export const featuredHeroMetaReveal = featuredHeroChildReveal;
