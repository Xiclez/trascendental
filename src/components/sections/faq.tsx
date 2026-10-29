"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { contact, faq } from "@/content/trascendental";
import { inView, rise, stagger } from "@/lib/motion";

/** Reference pattern: answers on the left, oversized title pinned on the right (desktop). */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative mx-auto w-full max-w-[1320px] scroll-mt-16 px-5 py-20 sm:px-8 md:py-28">
      <motion.div
        variants={stagger()}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        className="grid gap-12 lg:grid-cols-[1fr_0.7fr]"
      >
        <div className="order-2 lg:order-1">
          {faq.map((item) => (
            <motion.details key={item.q} variants={rise} className="group border-b border-rule">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus aria-hidden className="size-4 shrink-0 text-ink transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-6 text-graphite">{item.a}</p>
            </motion.details>
          ))}
        </div>
        <motion.div variants={rise} className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-28">
            <span className="numeral text-xl leading-none text-ink">V</span>
            <h2 id="faq-title" className="display mt-4 text-[clamp(2.8rem,7vw,6rem)] text-ink">
              Preguntas frecuentes
            </h2>
            <p className="mt-6 text-graphite">
              ¿Algo más? Escríbenos a{" "}
              <a href={`mailto:${contact.email}`} className="text-ink underline underline-offset-4 hover:text-graphite">
                {contact.email}
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
