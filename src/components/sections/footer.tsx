import { ArrowUpRight } from "lucide-react";
import { MicroPrint, Presents, Stamps } from "@/components/flyer";
import { contact, event, flyer, site, socials } from "@/content/trascendental";

/** Closes the page the way the flyer closes: lockup, wordmark, serif IV + date, corner furniture. */
export function Footer() {
  return (
    <footer className="relative border-t border-rule pb-28 md:pb-0">
      <div className="mx-auto max-w-[1320px] px-5 pt-20 sm:px-8">
        <div className="text-center">
          <Presents />
          <p aria-hidden className="display ink-worn mt-4 origin-top scale-y-[1.22] text-[clamp(3.2rem,12.4vw,13.6rem)] leading-[0.86] text-ink">
            {event.title}
          </p>
          <p aria-hidden className="numeral mt-10 text-[clamp(3rem,6vw,5rem)] leading-none text-ink">
            {event.edition}
          </p>
          <p className="numeral mt-3 text-[clamp(2.2rem,4.6vw,3.8rem)] leading-none text-ink">{event.dateLabel}</p>
          <p className="label mt-3 text-[11px] text-ink sm:text-[13px]">{flyer.caption}</p>
        </div>

        <div className="mt-20 grid gap-10 border-t border-rule pt-10 md:grid-cols-3">
          <div>
            <h2 className="label text-[10px] text-graphite">Contacto</h2>
            <a href={`mailto:${contact.email}`} className="mt-3 inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline">
              {contact.email}
            </a>
          </div>
          <div>
            <h2 className="label text-[10px] text-graphite">Redes</h2>
            <ul className="mt-3">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-ink underline-offset-4 hover:underline"
                  >
                    {s.label} <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="label text-[10px] text-graphite">Press &amp; booking</h2>
            <a
              href={site.epkUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-ink underline-offset-4 hover:underline"
            >
              EPK Héctor Chaparro <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 pb-10 sm:flex-row sm:items-end">
          <div>
            <MicroPrint />
            <p className="label mt-4 text-[9px] text-graphite">© 2026 Héctor Chaparro · Trascendental · Pagos con Stripe</p>
          </div>
          <Stamps />
        </div>
      </div>
    </footer>
  );
}
