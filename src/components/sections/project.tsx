"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { GalleryCarousel } from "@/components/gallery-carousel";
import { Section } from "@/components/ui";
import { editions, event, gallery, project } from "@/content/trascendental";
import { inView, rise, stagger, wipe } from "@/lib/motion";

/** Opacity steps of the flyer's ascending figures (I → III; IV is solid). */
const ASCENT = [0.22, 0.42, 0.66];

export function Project() {
  return (
    <Section id="proyecto" index="IV" title={project.title} kicker="Trascendental I → IV">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <motion.div variants={rise}>
          <p className="text-[clamp(1.25rem,2.2vw,1.75rem)] leading-snug text-ink">{project.lead}</p>
          {project.body.map((p) => (
            <p key={p} className="mt-5 max-w-xl text-graphite">
              {p}
            </p>
          ))}
          <blockquote className="numeral mt-10 border-l-2 border-ink pl-5 text-2xl italic text-ink">
            “{event.tagline}”
          </blockquote>
        </motion.div>
        <motion.dl variants={stagger(0.1)} className="grid grid-cols-3 gap-px self-end border border-rule bg-rule">
          {project.stats.map((s) => (
            <motion.div key={s.label} variants={rise} className="bg-paper p-5">
              <dt className="label text-[10px] text-graphite">{s.label}</dt>
              <dd className="display mt-3 text-[clamp(1.8rem,4vw,3rem)] text-ink">{s.value}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>

      {/* Ascension ladder — the flyer's silhouettes fading in as they rise toward IV */}
      <motion.div variants={rise} aria-hidden className="mt-20 flex items-end justify-between border-b border-rule pb-6">
        {["I", "II", "III"].map((n, i) => (
          <span key={n} className="numeral text-[clamp(3rem,10vw,9rem)] leading-none text-ink" style={{ opacity: ASCENT[i] }}>
            {n}
          </span>
        ))}
        <span className="relative numeral text-[clamp(4rem,14vw,12rem)] leading-none text-ink">
          {event.edition}
        </span>
      </motion.div>

      {/* Historial — timeline I–III + IV. Reveals on its own trigger: it sits far below the section header. */}
      <div className="mt-16 flex items-baseline gap-4">
        <h3 id="historial" className="label scroll-mt-20 text-[11px] text-ink">Historial · Ediciones pasadas</h3>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <motion.ol
        variants={stagger(0.12)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-labelledby="historial"
      >
        {editions.map((ed) => (
          <motion.li key={ed.numeral} variants={rise} className="registered group flex flex-col border border-rule bg-card/60">
            <motion.div variants={wipe} className="relative aspect-square overflow-hidden">
              <Image
                src={ed.artwork}
                alt={`Arte de Trascendental ${ed.numeral}`}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </motion.div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-baseline justify-between">
                <span className="numeral text-5xl text-ink">
                  {ed.numeral}
                </span>
                <span className="label text-[10px] text-graphite">{ed.date}</span>
              </div>
              <p className="label mt-4 text-[11px] text-ink">{ed.status}</p>
              <p className="mt-3 flex-1 text-sm text-graphite">{ed.description}</p>
              <a
                href={ed.listen}
                target="_blank"
                rel="noreferrer"
                className="label mt-5 inline-flex min-h-11 items-center gap-2 text-[10px] text-ink hover:text-graphite"
              >
                Escuchar álbum {ed.numeral} <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </motion.li>
        ))}
        <motion.li variants={rise} className="relative flex flex-col overflow-hidden border border-ink bg-card/60">
          <div className="relative aspect-square">
            <Image
              src="/images/flyer-iv.jpg"
              alt="Flyer de Trascendental IV: Héctor Chaparro presents, 26.12.26"
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover object-top"
            />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-baseline justify-between">
              <span className="numeral text-5xl text-ink">{event.edition}</span>
              <span className="label text-[10px] text-graphite">{event.dateLabel}</span>
            </div>
            <p className="label mt-4 text-[11px] text-ink">Siguiente capítulo</p>
            <p className="mt-3 flex-1 text-sm text-graphite">{event.intro}</p>
            <a href="#tickets" className="label mt-5 inline-flex min-h-11 items-center text-[10px] text-ink">
              Comprar tickets →
            </a>
          </div>
        </motion.li>
      </motion.ol>

      {/* Galería — fotos y videos de ediciones pasadas */}
      <div className="mt-20 flex items-baseline gap-4">
        <h3 id="galeria" className="label scroll-mt-20 text-[11px] text-ink">Galería · Así se vive Trascendental</h3>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <motion.div initial="hidden" whileInView="show" viewport={inView} className="mt-6">
        <GalleryCarousel items={gallery} label="Fotos y videos de ediciones pasadas de Trascendental" />
      </motion.div>
    </Section>
  );
}
