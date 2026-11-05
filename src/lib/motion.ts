import type { Transition, Variants } from "motion/react";

/**
 * MOTION TOKENS — three families only (inherited from the EPK).
 *   RISE  : content arrives from below with a soft decelerate (entrances)
 *   WIPE  : clip-path reveal for display type and media (headlines, images)
 *   DRIFT : slow continuous movement (marquee, parallax, shader, turntable)
 */

export const easeRise = [0.16, 1, 0.3, 1] as const;
export const easeWipe = [0.65, 0, 0.35, 1] as const;

export const transitions = {
  rise: { duration: 0.7, ease: easeRise } satisfies Transition,
  wipe: { duration: 0.9, ease: easeWipe } satisfies Transition,
  fast: { duration: 0.22, ease: easeRise } satisfies Transition,
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: transitions.rise },
};

export const wipe: Variants = {
  hidden: { opacity: 0, clipPath: "inset(0 0 100% 0)" },
  show: { opacity: 1, clipPath: "inset(0 0 0% 0)", transition: transitions.wipe },
};

/** WIPE for display lines: a mask that opens upward over the letterforms. */
export const wipeLine: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)", y: "18%" },
  show: { clipPath: "inset(0% 0 0 0)", y: "0%", transition: { duration: 1.1, ease: easeWipe } },
};

/** Parent that staggers RISE children. */
export const stagger = (delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren } },
});

/**
 * Shared viewport config so every section reveals at the same threshold.
 * Margin-based (not `amount`): a ratio threshold never fires on sections taller
 * than ~4 viewports (the edition history on mobile stayed blank).
 */
export const inView = { once: true, margin: "0px 0px -12% 0px" } as const;
