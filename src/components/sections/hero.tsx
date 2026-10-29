"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { MicroPrint, Orb, Presents, Stamps } from "@/components/flyer";
import { HeroGL } from "@/components/three/gl-root";
import { Magnetic } from "@/components/ui";
import { event } from "@/content/trascendental";
import { rise, stagger, wipeLine } from "@/lib/motion";

function useCountdown(target: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start ticking only after hydration
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return null;
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

/** Countdown set like the flyer's date: Didone numerals, wide-caps captions. */
function Countdown() {
  const left = useCountdown(event.startsAt);
  const units = [
    { label: "Días", value: left?.days },
    { label: "Horas", value: left?.hours },
    { label: "Min", value: left?.minutes },
    { label: "Seg", value: left?.seconds },
  ];
  return (
    <div role="timer" aria-label="Cuenta regresiva para Trascendental IV" className="flex justify-center gap-6 sm:gap-10">
      {units.map((u, i) => (
        <div key={u.label} className="min-w-[3.4rem] text-center" aria-hidden={i === 3 ? true : undefined}>
          <div className="numeral text-[clamp(2rem,4.6vw,3.4rem)] leading-none tabular-nums text-ink">
            {u.value === undefined ? "--" : String(u.value).padStart(2, "0")}
          </div>
          <div className="label mt-2 text-[9px] text-graphite">{u.label}</div>
        </div>
      ))}
      {left ? (
        <span className="sr-only">
          Faltan {left.days} días, {left.hours} horas y {left.minutes} minutos.
        </span>
      ) : null}
    </div>
  );
}

/** The flyer's orb linework — the only mouse-parallax layer on the site. */
function ParallaxOrb() {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 18 });
  const sy = useSpring(my, { stiffness: 40, damping: 18 });
  const x = useTransform(sx, (v) => v * -26);
  const y = useTransform(sy, (v) => v * -16);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, mx, my]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[30%] w-[min(150vw,1500px)] -translate-x-1/2 text-rule"
      style={{ x, y }}
    >
      <Orb className="orb-drift h-auto w-full opacity-70" />
    </motion.div>
  );
}

/**
 * Hero = the flyer, live: lockup → giant worn TRASCENDENTAL → the central
 * artwork (figure, portals, ascending silhouettes) → serif IV + date →
 * wide caption → countdown/CTAs, with the flyer's corner furniture.
 */
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      <HeroGL className="absolute inset-0" />
      <ParallaxOrb />

      <motion.div
        variants={stagger(0.12)}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex w-full max-w-[1320px] flex-col items-center px-5 pb-16 pt-28 text-center sm:px-8 md:pt-32"
      >
        <motion.div variants={rise}>
          <Presents />
        </motion.div>

        <h1 id="hero-title" className="relative z-10 mt-4 w-full">
          {/* Vertical stretch on the wrapper (the flyer's ultra-condensed cut); motion owns the inner transform. */}
          <span className="block origin-top scale-y-[1.22]">
            <motion.span
              variants={wipeLine}
              className="display ink-worn block text-[clamp(3.4rem,12.4vw,13.6rem)] leading-[0.86] text-ink"
            >
              {event.title}
            </motion.span>
          </span>
          <span className="sr-only">
            {event.edition} — {event.dateLabel}
          </span>
        </h1>

        {/* The flyer's central artwork, multiplied into the paper. */}
        <motion.div
          variants={rise}
          className="relative -mt-[2%] w-[min(100%,820px)] mix-blend-multiply"
          style={{
            // Fade every edge so the artwork dissolves into the paper (no visible rectangle).
            WebkitMaskImage:
              "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 74%, transparent)",
            WebkitMaskComposite: "source-in",
            maskImage:
              "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 74%, transparent)",
            maskComposite: "intersect",
          }}
        >
          <Image
            src="/images/flyer-art.jpg"
            alt=""
            width={720}
            height={338}
            priority
            sizes="(min-width: 860px) 820px, 100vw"
            className="h-auto w-full"
          />
        </motion.div>

        <motion.p variants={rise} aria-hidden className="numeral -mt-2 text-[clamp(3.2rem,7vw,5.6rem)] leading-none text-ink">
          {event.edition}
        </motion.p>
        <motion.p variants={rise} className="numeral mt-3 text-[clamp(2.4rem,5.4vw,4.4rem)] leading-none text-ink">
          <time dateTime={event.startsAt}>{event.dateLabel}</time>
        </motion.p>
        <motion.p variants={rise} className="label mt-3 text-[11px] text-ink sm:text-[13px]">
          {event.venue.city} · {event.doorsLabel}
        </motion.p>

        <motion.div variants={rise} className="mt-12">
          <Countdown />
        </motion.div>

        <motion.div variants={rise} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <a
              href="#tickets"
              className="label inline-flex min-h-12 items-center justify-center bg-ink px-9 text-[12px] text-paper transition-colors hover:bg-ink/80"
            >
              Comprar tickets
            </a>
          </Magnetic>
          <a
            href="#merch"
            className="label inline-flex min-h-12 items-center justify-center gap-2 border border-ink px-7 text-[12px] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Merch oficial <ArrowDown className="size-3.5" aria-hidden />
          </a>
        </motion.div>

        {/* Flyer corner furniture */}
        <div className="mt-16 flex w-full flex-col items-center justify-between gap-6 sm:flex-row sm:items-end">
          <MicroPrint className="text-left" />
          <Stamps />
        </div>
      </motion.div>
    </section>
  );
}
