"use client";

import { motion } from "motion/react";
import { Eyes } from "@/components/flyer";
import { Pending, Section } from "@/components/ui";
import { event, lineup } from "@/content/trascendental";
import { rise, stagger } from "@/lib/motion";

export function Lineup() {
  const names = lineup.filter((a) => a.confirmed).map((a) => a.name);
  const marquee = [...names, `${event.title} ${event.edition}`, event.dateLabel, "Line-up por anunciar"];

  return (
    <div id="lineup" className="relative scroll-mt-16">
      {/* DRIFT — marquee (static under reduced motion) */}
      <div aria-hidden className="overflow-hidden border-y border-rule py-6">
        <div className="marquee-track flex w-max">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {[...marquee, ...marquee].map((n, i) => (
                <span key={`${dup}-${i}`} className="display flex items-center whitespace-nowrap px-6 text-[clamp(2.5rem,6vw,5rem)] text-ink">
                  {n}
                  <Eyes className="ml-12 text-[2rem]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Section id="lineup-list" index="IV" title={`Line-up ${event.edition}`} kicker="Más nombres pronto">
        <motion.ul variants={stagger(0.08)} className="divide-y divide-rule border-y border-rule">
          {lineup.map((a, i) => {
            // Unannounced slots fade like the flyer's ascending silhouettes.
            const ghost = a.confirmed ? 1 : Math.max(0.16, 0.5 - (i - 1) * 0.11);
            return (
              <motion.li key={`${a.name}-${i}`} variants={rise} className="flex flex-wrap items-baseline justify-between gap-3 py-5">
                <span className="flex items-baseline">
                  <span
                    aria-hidden={!a.confirmed}
                    className="display ink-worn text-[clamp(1.8rem,4.5vw,3.4rem)] text-ink"
                    style={{ opacity: ghost }}
                  >
                    {a.name}
                  </span>
                  {!a.confirmed ? <Pending>Por anunciar</Pending> : null}
                </span>
                <span className="label text-[11px] text-graphite">{a.role}</span>
              </motion.li>
            );
          })}
        </motion.ul>
      </Section>
    </div>
  );
}
