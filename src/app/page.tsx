import { CartDrawer, StickyTicketBar } from "@/components/cart-drawer";
import { SiteNav } from "@/components/site-nav";
import { GLRoot } from "@/components/three/gl-root";
import { Faq } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";
import { Hero } from "@/components/sections/hero";
import { Lineup } from "@/components/sections/lineup";
import { Merch } from "@/components/sections/merch";
import { Project } from "@/components/sections/project";
import { Tickets } from "@/components/sections/tickets";
import { connection } from "next/server";
import { event, lineup, purchasable, site, type LiveTier } from "@/content/trascendental";
import { liveTiers } from "@/lib/server/inventory";

const availability = {
  available: "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  soldout: "https://schema.org/SoldOut",
  closed: "https://schema.org/SoldOut",
  upcoming: null, // not on sale yet: left out of the offers
} as const;

const jsonLd = (tickets: LiveTier[]) => ({
  "@context": "https://schema.org",
  "@type": "MusicEvent",
  name: `${event.title} ${event.edition}`,
  description: site.description,
  startDate: event.startsAt,
  endDate: event.endsAt,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  image: [new URL(site.flyer, site.url).toString(), new URL(site.ogImage, site.url).toString()],
  location: {
    "@type": "Place",
    name: event.venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: event.venue.address,
      addressLocality: event.venue.city,
      addressRegion: event.venue.region,
      addressCountry: event.venue.country,
    },
  },
  performer: lineup.flatMap((a) => [a.name, ...(a.b2b ? [a.b2b] : [])]).map((name) => ({ "@type": "MusicGroup", name })),
  organizer: { "@type": "Person", name: "Héctor Chaparro", url: site.epkUrl },
  offers: tickets.filter((t) => availability[t.availability]).map((t) => ({
    "@type": "Offer",
    name: `${t.name} · ${t.phase}`,
    price: t.price,
    priceCurrency: "MXN",
    availability: availability[t.availability],
    url: `${site.url}/#tickets`,
  })),
});

export default async function Home() {
  await connection(); // stock is live: render per request
  const tickets = await liveTiers();
  const open = tickets.filter((t) => purchasable(t.availability));
  const from = open.length ? Math.min(...open.map((t) => t.price)) : Math.min(...tickets.map((t) => t.price));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(tickets)).replace(/</g, "\\u003c") }}
      />
      <GLRoot />
      <SiteNav />
      <main className="relative z-10">
        <Hero />
        <Tickets tiers={tickets} />
        <Merch />
        <Project />
        <Lineup />
        <Faq />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <StickyTicketBar from={from} />
      <CartDrawer />
    </>
  );
}
