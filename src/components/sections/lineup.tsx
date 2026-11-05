"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Eyes, Orb } from "@/components/flyer";
import { SnapControls, trackClass, useSnapTrack } from "@/components/snap-track";
import { Section } from "@/components/ui";
import { artistName, event, lineup, lineupCopy, type Artist } from "@/content/trascendental";
import { rise } from "@/lib/motion";

/** Portrait or, until the photo arrives, the flyer's engraved orb with the name set in ink. */
export function ArtistPortrait({ artist, sizes, priority }: { artist: Artist; sizes: string; priority?: boolean }) {
  if (artist.photo) {
    return (
      <Image
        src={artist.photo}
        alt={artistName(artist)}
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

/** "B2B Alex Fierro" / "B2B · Por anunciar" (ghosted, like the flyer's unannounced silhouettes). */
export function B2B({ artist, className = "" }: { artist: Artist; className?: string }) {
  if (artist.b2b === undefined) return null;
  return (
    <span className={`block ${className}`}>
      <span className="label text-[0.32em] align-middle text-graphite">B2B</span>{" "}
      {artist.b2b ?? <span className="opacity-30">{lineupCopy.tba}</span>}
    </span>
  );
}

function Card({ artist, index, total }: { artist: Artist; index: number; total: number }) {
  const headliner = artist.billing === "headliner";
  return (
    <li
      data-index={index}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} de ${total}: ${artistName(artist)}`}
      className={`group flex shrink-0 snap-start flex-col border border-rule bg-paper ${
        headliner ? "w-[86%] sm:w-[58%] lg:w-[40%]" : "w-[74%] sm:w-[42%] lg:w-[28%]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden border-b border-rule bg-ink">
        <ArtistPortrait
          artist={artist}
          priority={headliner}
          sizes={headliner ? "(min-width: 1024px) 40vw, (min-width: 640px) 58vw, 86vw" : "(min-width: 1024px) 28vw, (min-width: 640px) 42vw, 74vw"}
        />
        <span className="label absolute left-3 top-3 bg-paper px-2 py-1 text-[9px] text-ink">{artist.role}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className={`display ink-worn text-ink ${headliner ? "text-[clamp(2.2rem,4.4vw,3.6rem)]" : "text-[clamp(1.7rem,3vw,2.4rem)]"}`}>
          {headliner ? (
            <span className="mb-3 block">
              <Eyes className="text-[1.4rem]" />
            </span>
          ) : null}
          {artist.name}
          <B2B artist={artist} />
        </h3>
        <Link
          href={`/lineup/${artist.slug}`}
          className="label mt-auto inline-flex min-h-11 w-fit items-center gap-2 border border-ink px-4 pt-px text-[11px] text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {lineupCopy.details}
          <ArrowUpRight className="size-3.5" aria-hidden />
          <span className="sr-only">de {artistName(artist)}</span>
        </Link>
      </div>
    </li>
  );
}

export function Lineup() {
  const { track, visible, active, go, onKeyDown } = useSnapTrack(lineup.length);
  const marquee = [...lineup.map(artistName), `${event.title} ${event.edition}`, event.dateLabel];

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

      <Section id="lineup-list" index="IV" title={`Line-up ${event.edition}`} kicker={lineupCopy.kicker}>
        <motion.div variants={rise} role="region" aria-roledescription="carousel" aria-label={`Line-up ${event.title} ${event.edition}`}>
          <ul ref={track} tabIndex={0} onKeyDown={onKeyDown} className={`${trackClass} items-stretch`}>
            {lineup.map((a, i) => (
              <Card key={a.slug} artist={a} index={i} total={lineup.length} />
            ))}
          </ul>
          <SnapControls active={active} visible={visible} go={go} count={lineup.length} />
        </motion.div>
      </Section>
    </div>
  );
}
