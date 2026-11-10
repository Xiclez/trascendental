"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Eyes, Orb } from "@/components/flyer";
import { SnapControls, trackClass, useSnapTrack } from "@/components/snap-track";
import { Section } from "@/components/ui";
import { event, lineupCopy, lineupSlots, slotName, type Artist } from "@/content/trascendental";
import { rise } from "@/lib/motion";

/** Portrait or, until the photo arrives, the flyer's engraved orb with the name set in ink. */
export function ArtistPortrait({ artist, sizes, priority }: { artist: Artist; sizes: string; priority?: boolean }) {
  if (artist.photo) {
    return (
      <Image
        src={artist.photo}
        alt={artist.name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-card">
      <Orb className="pointer-events-none absolute left-1/2 top-1/2 w-[150%] -translate-x-1/2 -translate-y-1/2 text-rule" />
      <span className="label relative text-[10px] text-graphite">{lineupCopy.noPhoto}</span>
    </div>
  );
}

/** Portrait, name and "Ver detalles". `paired` = one half of a B2B box: smaller type, role shown by the box. */
function ArtistCard({ artist, paired, sizes }: { artist: Artist; paired?: boolean; sizes: string }) {
  const headliner = artist.billing === "headliner";
  return (
    <div className="flex h-full min-w-0 flex-col border border-rule bg-paper">
      <div className={`relative overflow-hidden border-b border-rule bg-ink ${paired ? "aspect-[2/3]" : "aspect-[4/5]"}`}>
        <ArtistPortrait artist={artist} priority={headliner} sizes={sizes} />
        {paired ? null : (
          <span className="label absolute left-3 top-3 bg-paper px-2 py-1 text-[9px] text-ink">{artist.role}</span>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${paired ? "p-3 sm:p-4" : "p-5"}`}>
        <h3
          className={`display ink-worn mb-4 break-words text-ink ${
            headliner
              ? "text-[clamp(2.2rem,4.4vw,3.6rem)]"
              : paired
                ? "text-[clamp(1.25rem,2.4vw,2rem)]"
                : "text-[clamp(1.7rem,3vw,2.4rem)]"
          }`}
        >
          {headliner ? (
            <span className="mb-3 block">
              <Eyes className="text-[1.4rem]" />
            </span>
          ) : null}
          {artist.name}
        </h3>
        <Link
          href={`/lineup/${artist.slug}`}
          className={`label mt-auto inline-flex min-h-11 items-center gap-2 whitespace-nowrap border border-ink pt-px text-ink transition-colors hover:bg-ink hover:text-paper ${
            paired ? "w-full justify-center px-2 text-[9px] sm:w-fit sm:px-3 sm:text-[10px]" : "w-fit px-4 text-[11px]"
          }`}
        >
          {lineupCopy.details}
          <ArrowUpRight className={`size-3.5 ${paired ? "hidden sm:block" : ""}`} aria-hidden />
          <span className="sr-only">de {artist.name}</span>
        </Link>
      </div>
    </div>
  );
}

/** One slide: a solo card, or a B2B pair boxed together — artist 1 · B2B · artist 2. */
function Slot({ slot, index, total }: { slot: Artist[]; index: number; total: number }) {
  const [a, b] = slot;
  const headliner = a.billing === "headliner";
  return (
    <li
      data-index={index}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} de ${total}: ${slotName(slot)}`}
      className={`shrink-0 snap-start ${
        b
          ? "w-[94%] sm:w-[78%] lg:w-[62%]"
          : headliner
            ? "w-[86%] sm:w-[58%] lg:w-[40%]"
            : "w-[74%] sm:w-[42%] lg:w-[28%]"
      }`}
    >
      {b ? (
        <div className="flex h-full flex-col border border-ink p-2 sm:p-3">
          <p className="label px-1 pb-2 text-[9px] text-ink sm:pb-3">{a.role}</p>
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch">
            <ArtistCard artist={a} paired sizes="(min-width: 1024px) 29vw, (min-width: 640px) 37vw, 45vw" />
            <div aria-hidden className="flex flex-col items-center px-1.5 sm:px-3">
              <span className="w-px flex-1 bg-rule" />
              <span className="numeral py-3 text-lg leading-none text-ink sm:text-2xl">B2B</span>
              <span className="w-px flex-1 bg-rule" />
            </div>
            <ArtistCard artist={b} paired sizes="(min-width: 1024px) 29vw, (min-width: 640px) 37vw, 45vw" />
          </div>
        </div>
      ) : (
        <ArtistCard
          artist={a}
          sizes={headliner ? "(min-width: 1024px) 40vw, (min-width: 640px) 58vw, 86vw" : "(min-width: 1024px) 28vw, (min-width: 640px) 42vw, 74vw"}
        />
      )}
    </li>
  );
}

export function Lineup() {
  const { track, visible, active, go, onKeyDown } = useSnapTrack(lineupSlots.length);
  const marquee = [...lineupSlots.map(slotName), `${event.title} ${event.edition}`, event.dateLabel];

  return (
    <div id="lineup" className="relative scroll-mt-16">
      {/* DRIFT — marquee (static under reduced motion) */}
      <div aria-hidden className="overflow-hidden border-y border-rule py-6">
        <div className="marquee-track flex w-max">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {marquee.map((n, i) => (
                <span key={`${dup}-${i}`} className="display flex items-center whitespace-nowrap px-6 text-[clamp(2.5rem,6vw,5rem)] text-ink">
                  {n}
                  <Eyes className="ml-12 text-[2rem]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Section id="lineup-list" index="I" title={`Line-up ${event.edition}`} kicker={lineupCopy.kicker}>
        <motion.div variants={rise} role="region" aria-roledescription="carousel" aria-label={`Line-up ${event.title} ${event.edition}`}>
          <ul ref={track} tabIndex={0} onKeyDown={onKeyDown} className={`${trackClass} items-stretch`}>
            {lineupSlots.map((slot, i) => (
              <Slot key={slot[0].slug} slot={slot} index={i} total={lineupSlots.length} />
            ))}
          </ul>
          <SnapControls active={active} visible={visible} go={go} count={lineupSlots.length} />
        </motion.div>
      </Section>
    </div>
  );
}
