"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { inView, rise, stagger } from "@/lib/motion";

/** Section shell: consistent rhythm, max width and reveal behaviour (EPK pattern). */
export function Section({
  id,
  index,
  title,
  kicker,
  children,
  className = "",
}: {
  id: string;
  index: string;
  title: React.ReactNode;
  kicker?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative mx-auto w-full max-w-[1320px] scroll-mt-16 px-5 py-20 sm:px-8 md:py-28 ${className}`}
    >
      <motion.div variants={stagger()} initial="hidden" whileInView="show" viewport={inView}>
        <motion.header variants={rise} className="mb-10 md:mb-14">
          <div className="mb-4 flex items-baseline gap-4">
            <span className="numeral text-xl leading-none text-ink">{index}</span>
            <span className="h-px flex-1 bg-rule" />
            {kicker ? (
              <span className="label text-[11px] text-ink">{kicker}</span>
            ) : null}
          </div>
          <h2 id={`${id}-title`} className="display ink-worn text-[clamp(2.4rem,7vw,5.2rem)] text-ink">
            {title}
          </h2>
        </motion.header>
        {children}
      </motion.div>
    </section>
  );
}

/** Marks any value that is not confirmed yet. */
export function Pending({ children = "Por confirmar" }: { children?: string }) {
  return (
    <span className="label ml-2 inline-block border border-rule px-1.5 py-0.5 align-middle text-[9px] text-graphite">
      {children}
    </span>
  );
}

const ctaBase =
  "label inline-flex min-h-11 items-center justify-center gap-2 px-6 text-[12px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40";

export function CTA({
  href,
  children,
  variant = "solid",
  onClick,
  className = "",
  disabled,
  ariaLabel,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-ink text-paper hover:bg-ink/80"
      : "border border-rule text-ink hover:border-ink";
  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={`${ctaBase} ${styles} ${className}`}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${ctaBase} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Magnetic hover — reserved for the primary purchase CTAs only.
 * Disabled for touch pointers and reduced motion.
 */
export function Magnetic({ children, strength = 0.28 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x, y }} className="inline-block">
      {children}
    </motion.div>
  );
}
