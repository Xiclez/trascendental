import type { Metadata } from "next";
import Link from "next/link";
import Stripe from "stripe";
import { ClearCart } from "@/components/clear-cart";
import { event, formatPrice } from "@/content/trascendental";

export const metadata: Metadata = { title: "Compra confirmada", robots: { index: false } };

async function getSession(id: string | undefined) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!id || !key) return null;
  try {
    return await new Stripe(key).checkout.sessions.retrieve(id);
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = await getSession(session_id);
  const paid = session?.payment_status === "paid";

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-3xl flex-col justify-center px-5 py-24 sm:px-8">
      <ClearCart />
      <p className="label text-[11px] text-ink">
        {event.title} {event.edition} · {event.dateLabel}
      </p>
      <h1 className="display mt-4 text-[clamp(3rem,10vw,7rem)] text-ink">{paid || !session ? "Nos vemos en la pista" : "Pago en proceso"}</h1>
      <p className="mt-6 max-w-xl text-graphite">
        {session?.customer_details?.email
          ? `Enviamos la confirmación a ${session.customer_details.email}.`
          : "Recibirás la confirmación de tu compra por correo."}{" "}
        Tus tickets digitales llegarán al mismo correo antes del evento.
      </p>
      {session?.amount_total != null ? (
        <p className="display mt-8 text-4xl tabular-nums">{formatPrice(session.amount_total / 100)}</p>
      ) : null}
      <Link
        href="/"
        className="label mt-12 inline-flex min-h-12 w-fit items-center bg-ink px-8 text-[12px] text-paper hover:bg-ink/80"
      >
        Volver al sitio
      </Link>
    </main>
  );
}
