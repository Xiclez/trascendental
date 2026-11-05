import type { Metadata } from "next";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { AdmitForm } from "@/app/admin/forms";
import { fmtDate } from "@/app/admin/orders-table";
import { event } from "@/content/trascendental";
import { getSession } from "@/lib/server/admin-auth";
import { dbConfigured } from "@/lib/server/db";
import { tierLabel, ticketUrl } from "@/lib/server/notify";
import { findTicket } from "@/lib/server/orders";

/**
 * /t/[code] — what the QR opens. Buyers see their ticket; any logged-in staff (admin or scanner)
 * see a "Registrar ingreso" button, so any phone camera works as the door scanner.
 */

export const metadata: Metadata = { title: "Boleto", robots: { index: false, follow: false } };

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!dbConfigured() || !/^IV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) notFound();
  const [ticket, staff] = await Promise.all([findTicket(code), getSession()]);
  if (!ticket) notFound();

  const valid = ticket.status === "valid" && ticket.order_status === "paid";
  const state = !valid ? "No válido" : ticket.checked_in_at ? "Ya ingresó" : "Válido";
  const qr = await QRCode.toDataURL(ticketUrl(ticket.code), { width: 520, margin: 2, color: { dark: "#151515", light: "#ffffff" } });

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-5 py-12">
      <p className="label text-[11px] text-ink">{event.presenter}</p>
      <h1 className="display ink-worn mt-3 text-5xl text-ink">
        {event.title} <span className="numeral">{event.edition}</span>
      </h1>
      <p className="numeral mt-2 text-2xl text-ink">{event.dateLabel}</p>

      <div className="mt-8 border border-rule bg-card/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="label text-[11px] text-ink">
            {tierLabel(ticket.tier_id)}
            {ticket.courtesy ? " · Cortesía" : ""}
          </p>
          <p className={`label text-[11px] ${valid && !ticket.checked_in_at ? "text-ink" : "text-graphite"}`}>
            <span
              aria-hidden
              className={`mr-2 inline-block size-1.5 rounded-full align-middle ${valid && !ticket.checked_in_at ? "bg-ink" : "bg-[var(--accent)]"}`}
            />
            {state}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
        <img src={qr} alt={`Código QR del boleto ${ticket.code}`} width={260} height={260} className="mx-auto mt-6 bg-white" />
        <p className="mt-4 text-center font-mono text-base tracking-[0.12em] text-ink">{ticket.code}</p>
        {ticket.holder_name ? <p className="mt-1 text-center text-sm text-graphite">{ticket.holder_name}</p> : null}
        {ticket.checked_in_at ? (
          <p className="mt-4 text-center text-xs text-graphite">Ingreso registrado: {fmtDate(ticket.checked_in_at)}</p>
        ) : null}
      </div>

      {staff && valid && !ticket.checked_in_at ? <AdmitForm code={ticket.code} /> : null}
      {!staff ? (
        <>
          <a
            href={`/api/boleto/${ticket.code}.jpg`}
            download={`${ticket.code}.jpg`}
            className="label mt-6 inline-flex min-h-12 items-center justify-center border border-ink text-[11px] text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            Descargar boleto
          </a>
          <p className="mt-6 text-center text-xs text-graphite">Presenta este QR con identificación oficial en la entrada. Evento +{event.minAge}.</p>
        </>
      ) : null}
    </main>
  );
}
