import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Eyes } from "@/components/flyer";
import { ArtistPortrait } from "@/components/sections/lineup";
import { event, lineup, lineupCopy, site } from "@/content/trascendental";

/** /lineup/[slug] — the "Ver detalles" page of each line-up card: photos, bio and socials. */

export const dynamicParams = false;
export const generateStaticParams = () => lineup.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = lineup.find((a) => a.slug === slug);
  if (!artist) return {};
  const name = artist.name;
  const title = `${name} · ${event.title} ${event.edition}`;
  const description =
    artist.bio[0] ?? `${name} · ${artist.role} en ${event.title} ${event.edition} · ${event.dateLabel} · ${event.venue.name}.`;
  // Artist portrait when there is one; otherwise the event card. Explicit twitter too, or it inherits the home page's.
  const image = artist.photo
    ? { url: artist.photo, alt: name }
    : { url: site.ogImage, width: 1200, height: 630, alt: site.ogImageAlt };
  const url = `/lineup/${artist.slug}`;
  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = lineup.findIndex((a) => a.slug === slug);
  if (i < 0) notFound();
  const artist = lineup[i];
  const prev = lineup[(i - 1 + lineup.length) % lineup.length];
  const next = lineup[(i + 1) % lineup.length];

  return (
    <main className="mx-auto w-full max-w-[1320px] px-5 pb-24 pt-8 sm:px-8">
      <Link href="/#lineup" className="label inline-flex min-h-11 items-center gap-2 text-[11px] text-ink hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden />
        {lineupCopy.back}
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
        <div className="group relative aspect-[4/5] overflow-hidden border border-rule bg-ink">
          <ArtistPortrait artist={artist} priority sizes="(min-width: 768px) 45vw, 100vw" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-baseline gap-4">
            <span className="numeral text-xl leading-none text-ink">{event.edition}</span>
            <span className="h-px flex-1 bg-rule" />
            <span className="label text-[11px] text-ink">{artist.role}</span>
          </div>
          <h1 className="display ink-worn mt-6 text-[clamp(2.8rem,8vw,6rem)] text-ink">
            {artist.billing === "headliner" ? (
              <span className="mb-4 block">
                <Eyes className="text-[1.8rem]" />
              </span>
            ) : null}
            {artist.name}
          </h1>
          {artist.genres ? <p className="label mt-4 text-[11px] text-ink">{artist.genres}</p> : null}
          <p className="numeral mt-4 text-2xl text-ink">
            {event.dateLabel} <span className="label align-middle text-[11px] text-graphite">· {event.venue.name}</span>
          </p>

          <div className="mt-8 max-w-prose space-y-4 text-ink/85">
            {artist.bio.length ? artist.bio.map((p) => <p key={p}>{p}</p>) : <p className="text-graphite">{lineupCopy.noBio}</p>}
          </div>

          {artist.highlights?.length ? (
            <dl className="mt-8 max-w-prose divide-y divide-rule border-y border-rule">
              {artist.highlights.map((h) => (
                <div key={h.label} className="py-4">
                  <dt className="label text-[10px] text-graphite">{h.label}</dt>
                  <dd className="mt-2 text-sm text-ink/85">{h.text}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {artist.socials.length ? (
            <ul className="mt-8 flex flex-wrap gap-2">
              {artist.socials.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label inline-flex min-h-11 items-center gap-2 border border-rule px-4 text-[11px] text-ink transition-colors hover:border-ink"
                  >
                    {s.label}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            href="/#tickets"
            className="label mt-10 inline-flex min-h-12 w-fit items-center bg-ink px-8 text-[12px] text-paper transition-colors hover:bg-ink/80"
          >
            Tickets {event.title} {event.edition}
          </Link>
        </div>
      </div>

      {artist.photos.length || artist.videos?.length ? (
        // Columns keep each piece at its own shape (portrait photos, square and vertical clips).
        <section aria-label={`Fotos y videos de ${artist.name}`} className="mt-16">
          <ul className="gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
            {artist.videos?.map((v) => (
              <li key={v.src} className="relative overflow-hidden border border-rule bg-ink" style={{ aspectRatio: v.aspect }}>
                <video
                  src={v.src}
                  poster={v.poster}
                  aria-label={v.alt}
                  controls
                  playsInline
                  preload="none"
                  className="absolute inset-0 size-full object-cover [&:fullscreen]:object-contain"
                />
              </li>
            ))}
            {artist.photos.map((p) => (
              <li key={p.src} className="relative overflow-hidden border border-rule bg-ink" style={{ aspectRatio: p.aspect ?? "4/3" }}>
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Más artistas" className="mt-16 grid grid-cols-2 border-y border-rule">
        <Link href={`/lineup/${prev.slug}`} className="group flex min-h-20 flex-col justify-center gap-1 border-r border-rule py-4 pr-4">
          <span className="label inline-flex items-center gap-2 text-[10px] text-graphite">
            <ArrowLeft className="size-3" aria-hidden /> Anterior
          </span>
          <span className="display text-xl text-ink group-hover:underline sm:text-2xl">{prev.name}</span>
        </Link>
        <Link href={`/lineup/${next.slug}`} className="group flex min-h-20 flex-col items-end justify-center gap-1 py-4 pl-4 text-right">
          <span className="label inline-flex items-center gap-2 text-[10px] text-graphite">
            Siguiente <ArrowRight className="size-3" aria-hidden />
          </span>
          <span className="display text-xl text-ink group-hover:underline sm:text-2xl">{next.name}</span>
        </Link>
      </nav>
    </main>
  );
}
