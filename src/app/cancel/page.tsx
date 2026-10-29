import type { Metadata } from "next";
import Link from "next/link";
import { event } from "@/content/trascendental";

export const metadata: Metadata = { title: "Pago cancelado", robots: { index: false } };

export default function CancelPage() {
  return (
    <main className="mx-auto flex min-h-[100svh] max-w-3xl flex-col justify-center px-5 py-24 sm:px-8">
      <p className="label text-[11px] text-graphite">
        {event.title} {event.edition} · {event.dateLabel}
      </p>
      <h1 className="display mt-4 text-[clamp(3rem,10vw,7rem)] text-ink">Pago cancelado</h1>
      <p className="mt-6 max-w-xl text-graphite">
        No se realizó ningún cargo. Tu carrito sigue guardado en este dispositivo para cuando quieras retomarlo.
      </p>
      <Link
        href="/#tickets"
        className="label mt-12 inline-flex min-h-12 w-fit items-center bg-ink px-8 text-[12px] text-paper hover:bg-ink/80"
      >
        Volver a tickets
      </Link>
    </main>
  );
}
