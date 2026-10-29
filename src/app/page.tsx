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
import { event, lineup, site, tickets } from "@/content/trascendental";

const availability = {
  available: "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  soldout: "https://schema.org/SoldOut",
} as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MusicEvent",
  name: `${event.title} ${event.edition}`,
  description: site.description,
  startDate: event.startsAt,
  endDate: event.endsAt,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  image: [new URL(site.ogImage, site.url).toString()],
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
  performer: lineup.filter((a) => a.confirmed).map((a) => ({ "@type": "MusicGroup", name: a.name })),
  organizer: { "@type": "Person", name: "Héctor Chaparro", url: site.epkUrl },
  offers: tickets.map((t) => ({
    "@type": "Offer",
    name: `${t.name} · ${t.phase}`,
    price: t.price,
    priceCurrency: "MXN",
    availability: availability[t.availability],
    url: `${site.url}/#tickets`,
  })),
};

export default function Home() {
  const from = Math.min(...tickets.filter((t) => t.availability !== "soldout").map((t) => t.price));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <GLRoot />
      <SiteNav />
      <main className="relative z-10">
        <Hero />
        <Tickets />
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
